import 'package:flutter/foundation.dart';
import 'web_pose_helper.dart';

class WebPoseService {
  static final WebPoseService _instance = WebPoseService._internal();
  factory WebPoseService() => _instance;
  WebPoseService._internal();

  Function(Map<String, dynamic>)? onPoseUpdate;

  void init() {
    if (!kIsWeb) return;
    try {
      setWebPoseCallback((data) {
        onPoseUpdate?.call(data);
      });
      initWebPose();
      debugPrint("WebPoseService initialized");
    } catch (e) {
      debugPrint("WebPoseService init error: $e");
    }
  }

  void loadModel(String url) {
    if (!kIsWeb) return;
    try {
      loadWebPoseModel(url);
    } catch (e) {
      debugPrint("WebPoseService loadModel error: $e");
    }
  }
}
