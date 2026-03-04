import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'screens/try_on_screen.dart';
import 'providers/tryon_provider.dart';
import 'constants/colors.dart';

void main() {
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
