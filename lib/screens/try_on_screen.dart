import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:flutter/foundation.dart';
import 'dart:math' as math;
import 'package:arcore_flutter_plugin/arcore_flutter_plugin.dart' as android_ar;
import 'package:arkit_plugin/arkit_plugin.dart' as ios_ar;
import 'package:vector_math/vector_math_64.dart' as vector;

import 'package:camera/camera.dart';
import 'package:google_mlkit_pose_detection/google_mlkit_pose_detection.dart';

import '../constants/colors.dart';
import '../constants/clothing_data.dart';
import '../models/clothing_item.dart';
import '../providers/tryon_provider.dart';
import '../widgets/animated_press.dart';
import '../services/web_pose_service.dart';

class TryOnScreen extends StatefulWidget {
  const TryOnScreen({Key? key}) : super(key: key);

  @override
  // ignore: library_private_types_in_public_api
  _TryOnScreenState createState() => _TryOnScreenState();
}

class _TryOnScreenState extends State<TryOnScreen> with SingleTickerProviderStateMixin {
  // Native Mobile AR Controllers
  android_ar.ArCoreController? _arCoreController;
  ios_ar.ARKitController? _arkitController;
  
  // Mobile Camera & Tracking
  CameraController? _cameraController;
  PoseDetector? _poseDetector;
  bool _isBusy = false;
  bool _isCameraReady = false;
  
  bool _arReady = false;
  bool _capturing = false;
  bool _showSkeleton = false; // Kept for UI toggle, though driven by JS on web
  
  late AnimationController _shutterAnimController;
  late Animation<double> _shutterScaleAnim;

  @override
  void initState() {
    super.initState();
    _shutterAnimController = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 150));
    _shutterScaleAnim = Tween<double>(begin: 1.0, end: 0.85).animate(
      CurvedAnimation(parent: _shutterAnimController, curve: Curves.easeInOut),
    );

    if (kIsWeb) {
      // NOTE: For Web, Three.js handles the camera AND the AR model natively.
      // We only use Flutter for the transparent UI overlay.
      _initializeWebPose();
    } else {
      _initializeCamera();
      _initializePoseDetector();
    }
  }

  void _initializeWebPose() {
    // The WebPoseService JS interop listens to MediaPipe, but Three.js is rendering.
    // We register the listener just so Flutter knows AR is "active", 
    // but we don't need to rebuild the widget tree with coordinates anymore - Three.js handles it.
    WebPoseService().onPoseUpdate = (data) {
      // We can use this to hide/show loading indicators if needed
      if (!_arReady && mounted) {
         setState(() => _arReady = true);
      }
    };
    WebPoseService().init();
  }

  @override
  void dispose() {
    _shutterAnimController.dispose();
    _arCoreController?.dispose();
    _arkitController?.dispose();
    _cameraController?.dispose();
    _poseDetector?.close();
    super.dispose();
  }

  // ==========================================
  // MOBILE NATIVE LOGIC
  // ==========================================
  Future<void> _initializeCamera() async {
    final cameras = await availableCameras();
    if (cameras.isEmpty) return;
    
    _cameraController = CameraController(
      cameras.firstWhere((c) => c.lensDirection == CameraLensDirection.front, orElse: () => cameras.first),
      ResolutionPreset.medium,
      enableAudio: false,
    );

    try {
      await _cameraController!.initialize();
      if (mounted) {
        setState(() => _isCameraReady = true);
        if (!kIsWeb) {
          _cameraController!.startImageStream(_processCameraImage);
        }
      }
    } catch (e) {
      debugPrint("Camera init error: $e");
    }
  }

  void _initializePoseDetector() {
    if (kIsWeb) return;
    final options = PoseDetectorOptions(mode: PoseDetectionMode.stream);
    _poseDetector = PoseDetector(options: options);
  }

  Future<void> _processCameraImage(CameraImage image) async {
    if (_isBusy || _poseDetector == null) return;
    _isBusy = true;
    try {
      final inputImage = _inputImageFromCameraImage(image);
      if (inputImage == null) return;
      final poses = await _poseDetector!.processImage(inputImage);
      if (poses.isNotEmpty) _alignModelWithPose(poses.first);
    } finally {
      _isBusy = false;
    }
  }

  InputImage? _inputImageFromCameraImage(CameraImage image) {
    if (_cameraController == null) return null;
    final bytes = _concatenatePlanes(image.planes);
    final imageRotation = InputImageRotationValue.fromRawValue(_cameraController!.description.sensorOrientation) ?? InputImageRotation.rotation0deg;
    final imageFormat = InputImageFormatValue.fromRawValue(image.format.raw) ?? InputImageFormat.nv21;
    return InputImage.fromBytes(
      bytes: bytes,
      metadata: InputImageMetadata(
        size: Size(image.width.toDouble(), image.height.toDouble()),
        rotation: imageRotation,
        format: imageFormat,
        bytesPerRow: image.planes[0].bytesPerRow,
      ),
    );
  }

  Uint8List _concatenatePlanes(List<Plane> planes) {
    final WriteBuffer allBytes = WriteBuffer();
    for (final Plane plane in planes) allBytes.putUint8List(plane.bytes);
    return allBytes.done().buffer.asUint8List();
  }

  bool _isModelPlaced = false;

  void _alignModelWithPose(Pose pose) {
    if (_cameraController == null) return;
    final leftShoulder = pose.landmarks[PoseLandmarkType.leftShoulder];
    final rightShoulder = pose.landmarks[PoseLandmarkType.rightShoulder];
    final previewSize = _cameraController!.value.previewSize;

    if (leftShoulder != null && rightShoulder != null && previewSize != null) {
      final centerX = (leftShoulder.x + rightShoulder.x) / 2;
      final centerY = (leftShoulder.y + rightShoulder.y) / 2;
      final arX = (centerX / previewSize.height) * 2 - 1.0; 
      final arY = -(centerY / previewSize.width) * 2 + 1.0;
      final dx = leftShoulder.x - rightShoulder.x;
      final dy = leftShoulder.y - rightShoulder.y;
      final dist = vector.Vector2(dx, dy).length;
      final scaleBase = (dist / previewSize.height) * 1.5;

      if (defaultTargetPlatform == TargetPlatform.android && _arCoreController != null) {
        final pos = vector.Vector3(arX, arY - (scaleBase * 0.5), -1.2);
        final scale = vector.Vector3(scaleBase, scaleBase, scaleBase);
        
        _arCoreController?.removeNode(nodeName: "clothing_node");
        _arCoreController?.addArCoreNode(android_ar.ArCoreReferenceNode(
          objectUrl: context.read<TryOnProvider>().selectedItem?.displayModelPath ?? "",
          position: pos,
          scale: scale,
          rotation: vector.Vector4(0, 1, 0, 3.14159), 
        ));
        if (!_isModelPlaced) setState(() => _isModelPlaced = true);
      }
    }
  }

  void _onArCoreViewCreated(android_ar.ArCoreController controller) {
    _arCoreController = controller;
    setState(() => _arReady = true);
    _syncNativeSelectedItem();
  }

  void _onArKitViewCreated(ios_ar.ARKitController controller) {
    _arkitController = controller;
    setState(() => _arReady = true);
    _arkitController?.onAddNodeForAnchor = (anchor) {
      if (anchor is ios_ar.ARKitBodyAnchor) _addBodyTrackedNode(anchor);
    };
    _syncNativeSelectedItem();
  }

  void _addBodyTrackedNode(ios_ar.ARKitBodyAnchor anchor) {
    final selectedItem = context.read<TryOnProvider>().selectedItem;
    if (selectedItem?.modelPath == null) return;
    final node = ios_ar.ARKitReferenceNode(
      url: selectedItem!.displayModelPath ?? "",
      position: vector.Vector3(0, 0, 0), 
      scale: vector.Vector3(1.0, 1.0, 1.0),
      name: "clothing_node",
    );
    _arkitController?.add(node, parentNodeName: anchor.nodeName);
  }

  void _syncNativeSelectedItem() {
    final selectedItem = context.read<TryOnProvider>().selectedItem;
    if (selectedItem != null && _arReady) _load3DModel(selectedItem);
  }

  // ==========================================
  // SHARED LOGIC
  // ==========================================
  void _load3DModel(ClothingItem item) {
    if (item.modelPath == null) return;
    
    // Web: Pass the URL to Three.js engine via JS interop
    if (kIsWeb) {
      WebPoseService().loadModel(item.displayModelPath ?? "");
      return;
    }

    // Native App:
    if (defaultTargetPlatform == TargetPlatform.android) {
      _arCoreController?.removeNode(nodeName: "clothing_node");
    } else if (defaultTargetPlatform == TargetPlatform.iOS) {
      _arkitController?.remove("clothing_node");
    }
  }

  Future<void> _handleSelectItem(ClothingItem item) async {
    HapticFeedback.selectionClick();
    final provider = context.read<TryOnProvider>();

    if (provider.selectedItem?.id == item.id) {
      provider.setSelectedItem(null);
      if (kIsWeb) {
         // Clear Three.js model (pass empty or handle null on JS side)
         WebPoseService().loadModel("");
      } else if (defaultTargetPlatform == TargetPlatform.android) {
        _arCoreController?.removeNode(nodeName: "clothing_node");
      } else if (defaultTargetPlatform == TargetPlatform.iOS) {
        _arkitController?.remove("clothing_node");
      }
      return;
    }

    provider.setSelectedItem(item);
    _load3DModel(item);
  }

  Future<void> _handleCapture() async {
    if (_capturing || context.read<TryOnProvider>().selectedItem == null) return;
    await _shutterAnimController.forward();
    _shutterAnimController.reverse();
    HapticFeedback.mediumImpact();
    setState(() => _capturing = true);
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        setState(() => _capturing = false);
        final provider = context.read<TryOnProvider>();
        // Placeholder for actual capture logic
        provider.saveLook("data:image/png;base64,...");
        HapticFeedback.lightImpact();
        _showSavedDialog();
      }
    });
  }

  void _showSavedDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Look saved!"),
        content: const Text("Your try-on look has been saved to your collection."),
        actions: [
          TextButton(
            child: const Text("Continue", style: TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold)),
            onPressed: () => Navigator.pop(ctx),
          ),
        ],
      )
    );
  }

  Future<void> _handleToggleSkeleton() async {
    HapticFeedback.selectionClick();
    setState(() => _showSkeleton = !_showSkeleton);
    // Ideally ping JS to toggle landmarks visualizer here if needed
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<TryOnProvider>();
    final selectedItem = provider.selectedItem;

    // For web, Scaffold must be transparent so the HTML5 canvas shows through
    return Scaffold(
      backgroundColor: kIsWeb ? Colors.transparent : Colors.black,
      body: Stack(
        children: [
          // Native Device Camera
          if (!kIsWeb && _isCameraReady && _cameraController != null)
            Positioned.fill(
              child: AspectRatio(
                aspectRatio: _cameraController!.value.aspectRatio,
                child: CameraPreview(_cameraController!),
              ),
            ),

          // Native AR views
          if (!kIsWeb)
            Positioned.fill(
              child: (defaultTargetPlatform == TargetPlatform.android)
                  ? android_ar.ArCoreView(
                      onArCoreViewCreated: _onArCoreViewCreated,
                      enablePlaneRenderer: false,
                      enableTapRecognizer: true,
                    )
                  : (defaultTargetPlatform == TargetPlatform.iOS)
                      ? ios_ar.ARKitSceneView(
                          onARKitViewCreated: _onArKitViewCreated,
                          showFeaturePoints: _showSkeleton,
                          enableTapRecognizer: true,
                          configuration: ios_ar.ARKitConfiguration.bodyTracking,
                        )
                      : const Center(
                          child: Text("AR not supported on this platform", style: TextStyle(color: Colors.white)),
                        ),
            ),

          // OVERLAY UI (Rendered on top of Flutter Camera OR Web Three.js canvas)
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            left: 16,
            right: 16,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildTopBtn(
                  icon: Icons.accessibility_new,
                  isActive: _showSkeleton,
                  onTap: _handleToggleSkeleton,
                ),
                if (selectedItem != null)
                  Expanded(
                    child: Container(
                     margin: const EdgeInsets.symmetric(horizontal: 10),
                     padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                     decoration: BoxDecoration(
                       color: Colors.black.withOpacity(0.5),
                       borderRadius: BorderRadius.circular(100),
                       border: Border.all(color: Colors.white.withOpacity(0.12)),
                     ),
                     child: Row(
                       mainAxisSize: MainAxisSize.min,
                       mainAxisAlignment: MainAxisAlignment.center,
                       children: [
                         Container(
                           width: 8, height: 8,
                           decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.accent),
                         ),
                         const SizedBox(width: 5),
                         Text(
                           selectedItem.brand.toUpperCase(),
                           style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.accent),
                         ),
                         const SizedBox(width: 5),
                         const Text("·", style: TextStyle(color: Colors.white54, fontSize: 11)),
                         const SizedBox(width: 5),
                         Flexible(
                           child: Text(
                             selectedItem.name,
                             style: const TextStyle(fontSize: 12, color: Colors.white),
                             maxLines: 1,
                             overflow: TextOverflow.ellipsis,
                           ),
                         )
                       ],
                     ),
                    ),
                  )
                else
                  const Spacer(),
                const Spacer(),
              ],
            ),
          ),

          Positioned(
            bottom: 0, left: 0, right: 0,
            child: Container(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).padding.bottom + 20, 
                top: 80,
              ),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, Color(0xEB0D0D0D)],
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    height: 90,
                    margin: const EdgeInsets.only(bottom: 18),
                    child: provider.isLoading
                      ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
                      : ListView.separated(
                          padding: const EdgeInsets.symmetric(horizontal: 18),
                          scrollDirection: Axis.horizontal,
                          itemCount: provider.clothingItems.length,
                          separatorBuilder: (_,__) => const SizedBox(width: 12),
                          itemBuilder: (context, index) {
                            final item = provider.clothingItems[index];
                            final isSelected = selectedItem?.id == item.id;
                            return _buildCatalogItem(item, isSelected);
                          },
                        ),
                  ),

                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 44),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Spacer(),
                        ScaleTransition(
                          scale: _shutterScaleAnim,
                          child: GestureDetector(
                            onTap: _handleCapture,
                            child: Container(
                              width: 72, height: 72,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: (selectedItem == null || _capturing) 
                                    ? Colors.white.withOpacity(0.3) 
                                    : Colors.white.withOpacity(0.95),
                                border: Border.all(
                                  width: 3.5, 
                                  color: (selectedItem == null || _capturing)
                                      ? Colors.white.withOpacity(0.15)
                                      : Colors.white.withOpacity(0.5)
                                ),
                              ),
                              alignment: Alignment.center,
                              child: _capturing 
                                ? const CircularProgressIndicator(color: AppColors.accent)
                                : Container(
                                    width: 52, height: 52,
                                    decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.white),
                                  ),
                            ),
                          ),
                        ),
                        const Spacer(),
                      ],
                    ),
                  ),

                  if (selectedItem == null)
                    Padding(
                      padding: const EdgeInsets.only(top: 10, bottom: 6),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.touch_app, size: 13, color: Colors.white.withOpacity(0.55)),
                          const SizedBox(width: 6),
                          Text("Select a piece below to try it on", style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.55)))
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopBtn({required IconData icon, bool isActive = false, bool disabled = false, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: disabled ? null : onTap,
      child: Container(
        width: 40, height: 40,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: isActive ? const Color(0x33C9A96E) : Colors.black.withOpacity(0.45),
          border: Border.all(
             color: isActive ? const Color(0x66C9A96E) : Colors.white.withOpacity(0.12)
          ),
        ),
        alignment: Alignment.center,
        child: Icon(
          icon, 
          size: 19, 
          color: disabled ? Colors.white.withOpacity(0.3) : (isActive ? AppColors.accent : Colors.white)
        ),
      ),
    );
  }

  Widget _buildCatalogItem(ClothingItem item, bool isSelected) {
    return AnimatedPress(
      onTap: () => _handleSelectItem(item),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 70, height: 70,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  image: DecorationImage(image: NetworkImage(item.displayImage), fit: BoxFit.cover),
                ),
              ),
              if (isSelected) ...[
                Positioned(
                  top: -2, left: -2, right: -2, bottom: -2,
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.accent, width: 2.5),
                    ),
                  ),
                ),
                Positioned(
                  top: -5, right: -5,
                  child: Container(
                    width: 20, height: 20,
                    decoration: const BoxDecoration(color: AppColors.accent, shape: BoxShape.circle),
                    alignment: Alignment.center,
                    child: const Icon(Icons.check, size: 11, color: Colors.white),
                  ),
                )
              ]
            ],
          ),
          const SizedBox(height: 5),
          SizedBox(
            width: 70,
            child: Text(
              item.brand,
              style: TextStyle(fontFamily: "Inter", fontSize: 10, fontWeight: FontWeight.w500, color: Colors.white.withOpacity(0.7)),
              maxLines: 1,
              textAlign: TextAlign.center,
              overflow: TextOverflow.ellipsis,
            ),
          )
        ],
      )
    );
  }
}
