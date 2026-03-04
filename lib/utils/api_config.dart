import 'package:flutter/foundation.dart';

class ApiConfig {
  /// Equivalent to `getApiUrl()` mechanism in the React Native app.
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:5000';
    } else {
      return 'http://10.0.2.2:5000'; 
    }
  }

  static String get arTryOnUrl {
    final cleanBase = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
    return '$cleanBase/ar-tryon';
  }
}
