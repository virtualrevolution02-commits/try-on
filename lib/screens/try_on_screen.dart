import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:flutter/foundation.dart';
import 'package:arcore_flutter_plugin/arcore_flutter_plugin.dart' as android_ar;
import 'package:arkit_plugin/arkit_plugin.dart' as ios_ar;
import 'package:vector_math/vector_math_64.dart' as vector;

import 'package:model_viewer_plus/model_viewer_plus.dart';

import 'package:camera/camera.dart';
import 'package:google_mlkit_pose_detection/google_mlkit_pose_detection.dart';

import '../constants/colors.dart';
import '../constants/clothing_data.dart';
import '../models/clothing_item.dart';
import '../providers/tryon_provider.dart';
import '../utils/api_config.dart';
import '../widgets/animated_press.dart';
import '../services/web_pose_service.dart';

class TryOnScreen extends StatefulWidget {
  @override
  _TryOnScreenState createState() => _TryOnScreenState();
}

class _TryOnScreenState extends State<TryOnScreen> with SingleTickerProviderStateMixin {
  android_ar.ArCoreController? _arCoreController;
  ios_ar.ARKitController? _arkitController;
  
  // Camera & Tracking
  CameraController? _cameraController;
  PoseDetector? _poseDetector;
  bool _isBusy = false;
  bool _isCameraReady = false;
  
  // Web specific pose tracking
  double _webPoseX = 0.5; // Normalized center X
  double _webPoseY = 0.4; // Normalized center Y
  double _webPoseWidth = 0; // Normalized width
  bool _webPoseActive = false;
  
  bool _arReady = false;
  bool _capturing = false;
  bool _showSkeleton = false;
  
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

    _initializeCamera();
    _initializePoseDetector();
    
    if (kIsWeb) {
      _initializeWebPose();
    }
  }

  void _initializeWebPose() {
    WebPoseService().onPoseUpdate = (landmarks) {
      if (landmarks.length > 12) {
        final leftShoulder = landmarks[11]; // Mediapipe indices
        final rightShoulder = landmarks[12];
        
        if (mounted) {
          setState(() {
            _webPoseX = (leftShoulder['x'] + rightShoulder['x']) / 2;
            _webPoseY = (leftShoulder['y'] + rightShoulder['y']) / 2;
            
            final dx = leftShoulder['x'] - rightShoulder['x'];
            final dy = leftShoulder['y'] - rightShoulder['y'];
            _webPoseWidth = vector.Vector2(dx, dy).length;
            _webPoseActive = true;
          });
        }
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
        _cameraController!.startImageStream(_processCameraImage);
      }
    } catch (e) {
      debugPrint("Camera init error: $e");
    }
  }

  void _initializePoseDetector() {
    final options = PoseDetectorOptions(
      mode: PoseDetectionMode.stream,
    );
    _poseDetector = PoseDetector(options: options);
  }

  Future<void> _processCameraImage(CameraImage image) async {
    if (_isBusy || _poseDetector == null) return;
    _isBusy = true;

    try {
      final inputImage = _inputImageFromCameraImage(image);
      if (inputImage == null) return;
      
      final poses = await _poseDetector!.processImage(inputImage);
      
      if (poses.isNotEmpty) {
        _alignModelWithPose(poses.first);
      }
    } catch (e) {
      debugPrint("Pose detection error: $e");
    } finally {
      _isBusy = false;
    }
  }

  InputImage? _inputImageFromCameraImage(CameraImage image) {
    if (_cameraController == null) return null;

    final bytes = _concatenatePlanes(image.planes);
    
    final imageRotation = InputImageRotationValue.fromRawValue(
      _cameraController!.description.sensorOrientation
    ) ?? InputImageRotation.rotation0deg;

    final imageFormat = InputImageFormatValue.fromRawValue(image.format.raw) 
        ?? InputImageFormat.nv21;

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
    for (final Plane plane in planes) {
      allBytes.putUint8List(plane.bytes);
    }
    return allBytes.done().buffer.asUint8List();
  }

  bool _isModelPlaced = false;

  void _alignModelWithPose(Pose pose) {
    if (_cameraController == null) return;
    
    final leftShoulder = pose.landmarks[PoseLandmarkType.leftShoulder];
    final rightShoulder = pose.landmarks[PoseLandmarkType.rightShoulder];
    final previewSize = _cameraController!.value.previewSize;

    if (leftShoulder != null && rightShoulder != null && previewSize != null) {
      // 1. Calculate Center (Normalized to -1.0 to 1.0)
      // Front camera is usually mirrored, and dimensions are often swapped
      final centerX = (leftShoulder.x + rightShoulder.x) / 2;
      final centerY = (leftShoulder.y + rightShoulder.y) / 2;
      
      final arX = (centerX / previewSize.height) * 2 - 1.0; 
      final arY = -(centerY / previewSize.width) * 2 + 1.0;
      
      // 2. Calculate Scale
      final dx = leftShoulder.x - rightShoulder.x;
      final dy = leftShoulder.y - rightShoulder.y;
      final dist = vector.Vector2(dx, dy).length;
      final scaleBase = (dist / previewSize.height) * 1.5;

      // 3. Update Native nodes
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

  // --- ARCore (Android) Logic ---
  void _onArCoreViewCreated(android_ar.ArCoreController controller) {
    _arCoreController = controller;
    setState(() => _arReady = true);
    _syncNativeSelectedItem();
  }

  // --- ARKit (iOS) Logic ---
  void _onArKitViewCreated(ios_ar.ARKitController controller) {
    _arkitController = controller;
    setState(() => _arReady = true);
    
    // Configure skeletal tracking if available
    _arkitController?.onAddNodeForAnchor = _onArKitAnchorAdded;
    _arkitController?.onUpdateNodeForAnchor = _onArKitAnchorUpdated;
    
    _syncNativeSelectedItem();
  }

  void _onArKitAnchorAdded(ios_ar.ARKitAnchor anchor) {
    if (anchor is ios_ar.ARKitBodyAnchor) {
      _addBodyTrackedNode(anchor);
    }
  }

  void _onArKitAnchorUpdated(ios_ar.ARKitAnchor anchor) {
    if (anchor is ios_ar.ARKitBodyAnchor) {
      _updateBodyTrackedNode(anchor);
    }
  }

  void _addBodyTrackedNode(ios_ar.ARKitBodyAnchor anchor) {
    final selectedItem = context.read<TryOnProvider>().selectedItem;
    if (selectedItem?.modelPath == null) return;

    final node = ios_ar.ARKitReferenceNode(
      url: selectedItem!.displayModelPath ?? "",
      // Scaling and positioning relative to the spine/chest coordinate
      // The body anchor transform represents the root position of the body
      position: vector.Vector3(0, 0, 0), 
      scale: vector.Vector3(1.0, 1.0, 1.0),
      name: "clothing_node",
    );
    _arkitController?.add(node, parentNodeName: anchor.nodeName);
  }

  void _updateBodyTrackedNode(ios_ar.ARKitBodyAnchor anchor) {
    // ARKit handles the node transform sync automatically if added to anchor
  }

  void _syncNativeSelectedItem() {
    final selectedItem = context.read<TryOnProvider>().selectedItem;
    if (selectedItem != null && _arReady) {
      _load3DModel(selectedItem);
    }
  }

  void _load3DModel(ClothingItem item) {
    if (item.modelPath == null) return;
    
    if (defaultTargetPlatform == TargetPlatform.android) {
      _loadAndroidModel(item);
    } else if (defaultTargetPlatform == TargetPlatform.iOS) {
      _loadIosModel(item);
    }
  }

  void _loadAndroidModel(ClothingItem item) {
    // Sequential logic: We don't place the model until _alignModelWithPose detects a person
    if (_arCoreController == null) return;
    _arCoreController?.removeNode(nodeName: "clothing_node");
  }

  void _loadIosModel(ClothingItem item) {
    if (_arkitController == null) return;
    _arkitController?.remove("clothing_node");

    // Successive tracking mode: ARKit handles alignment via BodyAnchor anchors
    // If no anchor is present, we wait for detection
  }

  Future<void> _handleSelectItem(ClothingItem item) async {
    HapticFeedback.selectionClick();
    final provider = context.read<TryOnProvider>();

    if (provider.selectedItem?.id == item.id) {
      provider.setSelectedItem(null);
      if (defaultTargetPlatform == TargetPlatform.android) {
        _arCoreController?.removeNode(nodeName: "clothing_node");
      } else {
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
    // In native AR, we'd use screenshot methods from the controller
    // Mocking the capture result for now
    
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        setState(() => _capturing = false);
        final provider = context.read<TryOnProvider>();
        provider.saveLook("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
        HapticFeedback.lightImpact();
        _showSavedDialog();
      }
    });
  }

  void _handleWebViewMessage(String data) {
    // Legacy mapping - no longer used by native AR View
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
    // In Native plugins, this would toggle debug visibility or face mesh
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<TryOnProvider>();
    final selectedItem = provider.selectedItem;

    return Scaffold(
      backgroundColor: Colors.black, // Fallback
      body: Stack(
        children: [
          // 1. Camera Feed Background (for Web/Android/iOS fallback)
          if (_isCameraReady && _cameraController != null)
            Positioned.fill(
              child: AspectRatio(
                aspectRatio: _cameraController!.value.aspectRatio,
                child: CameraPreview(_cameraController!),
              ),
            ),

          // 2. Native AR View / 3D Overlay
          if (kIsWeb && selectedItem?.displayModelPath != null && _webPoseActive)
            _buildWebTrackedModel(selectedItem!),

          if (!kIsWeb)
            Positioned.fill(
              child: (defaultTargetPlatform == TargetPlatform.android)
                  ? android_ar.ArCoreView(
                      onArCoreViewCreated: _onArCoreViewCreated,
                      enablePlaneRenderer: false, // Cleaner body tracking feel
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
                          child: Text(
                            "AR not supported on this platform",
                            style: TextStyle(color: Colors.white),
                          ),
                        ),
            ),

          // Top Bar Overlay
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
                           decoration: BoxDecoration(
                             shape: BoxShape.circle,
                             color: AppColors.accent,
                           ),
                         ),
                         const SizedBox(width: 5),
                         Text(
                           selectedItem.brand.toUpperCase(),
                           style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.accent),
                         ),
                         const SizedBox(width: 5),
                         Text("·", style: TextStyle(color: Colors.white54, fontSize: 11)),
                         const SizedBox(width: 5),
                         Flexible(
                           child: Text(
                             selectedItem.name,
                             style: TextStyle(fontSize: 12, color: Colors.white),
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

          // Bottom Controls Overlay
          Positioned(
            bottom: 0, left: 0, right: 0,
            child: Container(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).padding.bottom + 20, 
                top: 80,
              ),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, const Color(0xEB0D0D0D)], // rgba(13,13,13,0.92)
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Catalog
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

                  // Capture Row
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 44),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Spacer(),
                        
                        // Shutter Button
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
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle, 
                                      color: Colors.white
                                    ),
                                  ),
                            ),
                          ),
                        ),

                        const Spacer(),
                      ],
                    ),
                  ),

                  // Hint Text
                  if (selectedItem == null)
                    Padding(
                      padding: const EdgeInsets.only(top: 10, bottom: 6),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.touch_app, size: 13, color: Colors.white.withOpacity(0.55)),
                          const SizedBox(width: 6),
                          Text(
                            "Select a piece below to try it on",
                            style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.55)),
                          )
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

  Widget _buildWebTrackedModel(ClothingItem item) {
    final size = MediaQuery.of(context).size;
    
    // Convert normalized coordinates to pixel values
    final double x = _webPoseX * size.width;
    final double y = _webPoseY * size.height;
    
    // Calculate width of the shirt based on shoulder distance
    final double shirtWidth = _webPoseWidth * size.width * 2.5; 
    final double shirtHeight = shirtWidth * 1.25; // Estimate aspect ratio
    
    return Positioned(
      left: x - (shirtWidth / 2),
      top: y - (shirtHeight * 0.25), // Offset slightly up to align with shoulders
      width: shirtWidth,
      height: shirtHeight,
      child: IgnorePointer(
        child: ModelViewer(
          src: item.displayModelPath ?? "",
          alt: item.name,
          ar: false,
          autoRotate: false,
          cameraControls: false,
          backgroundColor: Colors.transparent,
        ),
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
          color: disabled 
            ? Colors.white.withOpacity(0.3) 
            : (isActive ? AppColors.accent : Colors.white)
        ),
      ),
    );
  }

  Widget _buildSideBtn({required IconData icon, bool disabled = false, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: disabled ? null : onTap,
      child: Container(
        width: 44, height: 44,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withOpacity(0.12),
        ),
        alignment: Alignment.center,
        child: Icon(icon, size: 22, color: disabled ? Colors.white.withOpacity(0.3) : Colors.white),
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
                    decoration: BoxDecoration(
                      color: AppColors.accent,
                      shape: BoxShape.circle,
                    ),
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
              style: TextStyle(
                fontFamily: "Inter",
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: Colors.white.withOpacity(0.7),
              ),
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
