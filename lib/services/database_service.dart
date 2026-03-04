import 'package:postgres/postgres.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../models/clothing_item.dart';

class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  factory DatabaseService() => _instance;
  DatabaseService._internal();

  Connection? _connection;

  Future<void> connect() async {
    final url = dotenv.get('POSTGRES_URL');
    try {
      // In newer postgres package versions, you can often pass the URL directly or parse it manually
      final uri = Uri.parse(url);
      _connection = await Connection.open(
        Endpoint(
          host: uri.host,
          database: uri.pathSegments.isNotEmpty ? uri.pathSegments.first : 'postgres',
          username: uri.userInfo.split(':').first,
          password: uri.userInfo.split(':').last,
          port: uri.port != 0 ? uri.port : 5432,
        ),
        settings: const ConnectionSettings(sslMode: SslMode.require),
      );
      print('Database connected successfully');
    } catch (e) {
      print('Database connection failed: $e');
      rethrow;
    }
  }

  Future<List<ClothingItem>> getClothingItems() async {
    if (_connection == null) await connect();

    try {
      final results = await _connection!.execute('SELECT * FROM clothing_items');
      return results.map((row) {
        // Map database row to ClothingItem model
        // Assuming table columns match model fields
        return ClothingItem(
          id: row[0].toString(),
          name: row[1] as String,
          brand: row[2] as String,
          price: (row[3] as num).toDouble(),
          image: row[4] as String,
          category: row[5] as String,
          description: row[6] as String,
          modelPath: row[7] as String?,
          isFeatured: row[8] as bool? ?? false,
          isNew: row[9] as bool? ?? false,
          rating: (row[10] as num? ?? 5.0).toDouble(),
          reviewCount: row[11] as int? ?? 0,
          sizes: (row[12] as String? ?? "M,L,XL").split(','),
          cloudinaryPublicId: row.length > 13 ? row[13] as String? : null,
          cloudinaryModelId: row.length > 14 ? row[14] as String? : null,
          colors: [],
        );
      }).toList();
    } catch (e) {
      print('Error fetching clothing items: $e');
      return []; // Return empty or fallback
    }
  }

  Future<void> close() async {
    await _connection?.close();
    _connection = null;
  }
}
