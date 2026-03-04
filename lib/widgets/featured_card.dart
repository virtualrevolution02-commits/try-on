import 'package:flutter/material.dart';
import '../constants/colors.dart';
import '../models/clothing_item.dart';
import 'animated_press.dart';
import 'package:provider/provider.dart';
import '../providers/tryon_provider.dart';

class FeaturedCard extends StatelessWidget {
  final ClothingItem item;
  const FeaturedCard({Key? key, required this.item}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;

    return AnimatedPress(
      onTap: () {
        context.read<TryOnProvider>().setSelectedItem(item);
        Navigator.pushNamed(context, '/product', arguments: item.id);
      },
      child: Container(
        width: screenWidth * 0.65,
        height: 220,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: AppColors.surfaceSecondary,
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.network(item.image, fit: BoxFit.cover),
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
                color: Colors.black.withValues(alpha: 0.45),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.brand.toUpperCase(),
                      style: TextStyle(
                        fontFamily: "Inter",
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: Colors.white.withValues(alpha: 0.75),
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      item.name,
                      style: const TextStyle(
                          fontFamily: "Inter",
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: Colors.white),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      "\$${item.price.toStringAsFixed(2)}",
                      style: const TextStyle(
                          fontFamily: "Inter",
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.accent),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
