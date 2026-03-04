import 'package:flutter/foundation.dart';
import 'package:cloudinary_url_gen/cloudinary.dart';
import 'package:cloudinary_url_gen/transformation/transformation.dart';
import 'package:cloudinary_url_gen/transformation/resize/resize.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class MediaService {
  static final MediaService _instance = MediaService._internal();
  factory MediaService() => _instance;
  MediaService._internal();

  late Cloudinary _cloudinary;

  void init() {
    try {
      final cloudName = dotenv.maybeGet('CLOUDINARY_CLOUD_NAME') ?? '';
      _cloudinary = Cloudinary.fromCloudName(cloudName: cloudName);
    } catch (e) {
      debugPrint("MediaService: Cloudinary init failed (likely missing credentials): $e");
      // Create a dummy instance or handle the null _cloudinary in getters
    }
  }

  String getImageUrl(String publicId, {int? width, int? height}) {
    var transformation = Transformation();
    if (width != null || height != null) {
      transformation.resize(Resize.scale().width(width).height(height));
    }
    return _cloudinary.image(publicId).transformation(transformation).toString();
  }

  String getModelUrl(String publicId) {
    // Cloudinary serves 3D models via the 'raw' or 'image' type depending on config
    // Usually, .glb files are handled as authenticated or raw assets
    return _cloudinary.raw(publicId).toString();
  }
}
