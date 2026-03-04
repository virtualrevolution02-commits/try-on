import 'dart:convert';
import 'package:js/js.dart';
import 'package:flutter/foundation.dart';

@JS('window.flutter_web_pose')
class WebPose {
  external static void init();
  external static set onPoseDetected(Function(String) callback);
}

class WebPoseService {
  static final WebPoseService _instance = WebPoseService._internal();
  factory WebPoseService() => _instance;
  WebPoseService._internal();

  Function(Map<String, dynamic>)? onPoseUpdate;

  void init() {
    if (!kIsWeb) return;
    
    try {
      WebPose.onPoseDetected = allowInterop((String jsonPose) {
        final Map<String, dynamic> data = jsonDecode(jsonPose);
        onPoseUpdate?.call(data);
      });
      WebPose.init();
      debugPrint("WebPoseService initialized");
    } catch (e) {
      debugPrint("WebPoseService init error: $e");
    }
  }
}
