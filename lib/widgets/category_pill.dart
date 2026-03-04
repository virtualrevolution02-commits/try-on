import 'package:flutter/material.dart';
import '../constants/colors.dart';

class CategoryPill extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const CategoryPill({
    Key? key,
    required this.label,
    required this.active,
    required this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
        decoration: BoxDecoration(
          color: active ? AppColors.text : AppColors.surfaceSecondary,
          borderRadius: BorderRadius.circular(100),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontFamily: "Inter",
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: active ? AppColors.white : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}
