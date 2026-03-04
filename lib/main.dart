import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'screens/try_on_screen.dart';
import 'providers/tryon_provider.dart';
import 'services/database_service.dart';
import 'services/media_service.dart';
import 'constants/colors.dart';
import 'utils/web_registry.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  registerWebARView();
  
  try {
    await dotenv.load(fileName: ".env");
  } catch (e) {
    debugPrint("Warning: Could not load .env file: $e");
    // Continue with environment variables if provided by the platform, 
    // or rely on fallbacks in the services.
  }
  
  MediaService().init();
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => TryOnProvider()),
      ],
      child: const TryOnApp(),
    ),
  );
}

class TryOnApp extends StatelessWidget {
  const TryOnApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AR Try-On',
      theme: ThemeData(
        fontFamily: 'Inter',
        scaffoldBackgroundColor: AppColors.background,
        colorScheme: ColorScheme.light(
          primary: AppColors.text,
          secondary: AppColors.accent,
          surface: AppColors.surface,
        ),
        appBarTheme: const AppBarTheme(
          elevation: 0,
          backgroundColor: AppColors.background,
          iconTheme: IconThemeData(color: AppColors.text),
        ),
      ),
      debugShowCheckedModeBanner: false,
      home: TryOnScreen(),
    );
  }
}
