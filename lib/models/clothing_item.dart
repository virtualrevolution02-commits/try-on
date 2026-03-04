class ClothingColor {
  final String name;
  final String hex;
  ClothingColor({required this.name, required this.hex});

  factory ClothingColor.fromJson(Map<String, dynamic> json) {
    return ClothingColor(
      name: json['name'],
      hex: json['hex'],
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'hex': hex,
  };
}

class ClothingItem {
  final String id;
  final String name;
  final String brand;
  final double price;
  final String image;
  final String category;
  final String? modelPath; // Path to GLB/GLTF 3D model
  final bool isFeatured;
  final bool isNew;
  final double rating;
  final int reviewCount;
  final List<String> sizes;
  final String description;
  final List<ClothingColor> colors;

  ClothingItem({
    required this.id,
    required this.name,
    required this.brand,
    required this.price,
    required this.image,
    required this.category,
    this.isFeatured = false,
    this.isNew = false,
    this.modelPath,
    required this.rating,
    required this.reviewCount,
    required this.sizes,
    required this.description,
    required this.colors,
  });

  factory ClothingItem.fromJson(Map<String, dynamic> json) {
    var colorsList = json['colors'] as List? ?? [];
    List<ClothingColor> parsedColors = colorsList.map((c) => ClothingColor.fromJson(c)).toList();

    return ClothingItem(
      id: json['id'],
      name: json['name'],
      brand: json['brand'],
      price: (json['price'] as num).toDouble(),
      image: json['image'],
      category: json['category'],
      isFeatured: json['isFeatured'] ?? false,
      isNew: json['isNew'] ?? false,
      rating: (json['rating'] as num).toDouble(),
      reviewCount: json['reviewCount'] ?? 0,
      sizes: List<String>.from(json['sizes'] ?? []),
      description: json['description'] ?? '',
      modelPath: json['modelPath'],
      colors: parsedColors,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'brand': brand,
    'price': price,
    'image': image,
    'category': category,
    'isFeatured': isFeatured,
    'isNew': isNew,
    'rating': rating,
    'reviewCount': reviewCount,
    'sizes': sizes,
    'description': description,
    'modelPath': modelPath,
    'colors': colors.map((c) => c.toJson()).toList(),
  };
}
