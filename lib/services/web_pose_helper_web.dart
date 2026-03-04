import 'dart:convert';
// ignore: avoid_web_libraries_in_flutter
import 'package:js/js.dart';
import 'package:flutter/foundation.dart';

@JS('window.flutter_web_pose')
class WebPose {
  external static void init();
  external static set onPoseDetected(Function(String) callback);
  external static void loadModel(String url);
}

void setWebPoseCallback(Function(Map<String, dynamic>) callback) {
  WebPose.onPoseDetected = allowInterop((String jsonPose) {
    try {
      final Map<String, dynamic> data = jsonDecode(jsonPose);
      callback(data);
    } catch (e) {
      debugPrint("JS Callback decode error: $e");
    }
  });
}

void initWebPose() {
  WebPose.init();
}

void loadWebPoseModel(String url) {
  WebPose.loadModel(url);
}
