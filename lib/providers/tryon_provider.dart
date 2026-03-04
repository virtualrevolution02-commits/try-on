import 'dart:convert';
import '../models/clothing_item.dart';
import '../services/database_service.dart';
import '../constants/clothing_data.dart'; // Fallback for safety

class SavedLook {
  final String id;
  final String photoUri;
  final ClothingItem item;
  final String selectedColor;
  final int savedAt;

  SavedLook({
    required this.id,
    required this.photoUri,
    required this.item,
    required this.selectedColor,
    required this.savedAt,
  });

  factory SavedLook.fromJson(Map<String, dynamic> json) {
    return SavedLook(
      id: json['id'],
      photoUri: json['photoUri'],
      item: ClothingItem.fromJson(json['item']),
      selectedColor: json['selectedColor'],
      savedAt: json['savedAt'],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'photoUri': photoUri,
    'item': item.toJson(),
    'selectedColor': selectedColor,
    'savedAt': savedAt,
  };
}

class TryOnProvider with ChangeNotifier {
  static const String _savedLooksKey = "tryon_saved_looks";

  List<ClothingItem> _clothingItems = [];
  bool _isLoading = true;

  TryOnProvider() {
    _loadSavedLooks();
    _initializeData();
  }

  List<ClothingItem> get clothingItems => _clothingItems;
  bool get isLoading => _isLoading;

  Future<void> _initializeData() async {
    _isLoading = true;
    notifyListeners();

    try {
      _clothingItems = await DatabaseService().getClothingItems();
      
      // Fallback if DB is empty
      if (_clothingItems.isEmpty) {
        _clothingItems = CLOTHING_DATA;
      }

      // Auto-select first item if available
      if (_clothingItems.isNotEmpty) {
        setSelectedItem(_clothingItems.first);
      }
    } catch (e) {
      debugPrint("Database fetch failed, using fallback: $e");
      _clothingItems = CLOTHING_DATA;
      if (_clothingItems.isNotEmpty) {
        setSelectedItem(_clothingItems.first);
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  ClothingItem? get selectedItem => _selectedItem;
  String get selectedColor => _selectedColor;
  String get selectedSize => _selectedSize;
  List<SavedLook> get savedLooks => _savedLooks;

  Future<void> _loadSavedLooks() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final stored = prefs.getString(_savedLooksKey);
      if (stored != null) {
        final List<dynamic> decoded = jsonDecode(stored);
        _savedLooks = decoded.map((e) => SavedLook.fromJson(e)).toList();
        notifyListeners();
      }
    } catch (e) {
      debugPrint("Failed to load saved looks: \$e");
    }
  }

  Future<void> _persistLooks() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final encoded = jsonEncode(_savedLooks.map((l) => l.toJson()).toList());
      await prefs.setString(_savedLooksKey, encoded);
    } catch (e) {
      debugPrint("Failed to persist looks: \$e");
    }
  }

  void setSelectedItem(ClothingItem? item) {
    _selectedItem = item;
    if (item != null) {
      _selectedColor = item.colors.isNotEmpty ? item.colors.first.name : "";
      _selectedSize = item.sizes.length > 1 ? item.sizes[1] : (item.sizes.isNotEmpty ? item.sizes.first : "");
    }
    notifyListeners();
  }

  void setSelectedColor(String color) {
    _selectedColor = color;
    notifyListeners();
  }

  void setSelectedSize(String size) {
    _selectedSize = size;
    notifyListeners();
  }

  void saveLook(String photoUri) {
    if (_selectedItem == null) return;
    
    final newLook = SavedLook(
      id: DateTime.now().millisecondsSinceEpoch.toString() + (DateTime.now().microsecond.toString()),
      photoUri: photoUri,
      item: _selectedItem!,
      selectedColor: _selectedColor,
      savedAt: DateTime.now().millisecondsSinceEpoch,
    );
    
    _savedLooks.insert(0, newLook);
    _persistLooks();
    notifyListeners();
  }

  void deleteLook(String id) {
    _savedLooks.removeWhere((l) => l.id == id);
    _persistLooks();
    notifyListeners();
  }

  bool isSavedItem(String itemId) {
    return _savedLooks.any((l) => l.item.id == itemId);
  }
}
