import 'package:flutter/material.dart';
import '../constants/colors.dart';
import '../models/clothing_item.dart';
import 'animated_press.dart';
import 'package:provider/provider.dart';
import '../providers/tryon_provider.dart';

class ClothingCard extends StatelessWidget {
  final ClothingItem item;
  const ClothingCard({Key? key, required this.item}) : super(key: key);

  Color _hexToColor(String code) {
    if (code.isEmpty) return Colors.transparent;
    final hexCode = code.replaceAll('#', '');
    if (hexCode.length == 6) {
      return Color(int.parse("FF$hexCode", radix: 16));
    }
    return Colors.black;
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedPress(
      onTap: () {
        context.read<TryOnProvider>().setSelectedItem(item);
        Navigator.pushNamed(context, '/product', arguments: item.id);
      },
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    color: AppColors.surfaceSecondary,
                    child: Image.network(item.image, fit: BoxFit.cover),
                  ),
                  if (item.isNew)
                    Positioned(
                      top: 10,
                      left: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.text,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          "NEW",
                          style: TextStyle(
                            fontFamily: "Inter",
                            fontSize: 9,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                            letterSpacing: 1,
                          ),
                        ),
                      ),
                    ),
                  Positioned(
                    bottom: 10,
                    right: 10,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: item.colors.take(3).map((c) {
                        bool needsBorder = ['#FAFAFA', '#FFFFFF', '#F5F0E8', '#F0EAD6'].contains(c.hex.toUpperCase());
                        return Container(
                          width: 10,
                          height: 10,
                          margin: const EdgeInsets.only(left: 4),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _hexToColor(c.hex),
                            border: needsBorder ? Border.all(color: AppColors.border, width: 1) : null,
                          ),
                        );
                      }).toList(),
                    ),
                  )
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.brand.toUpperCase(),
                    style: const TextStyle(
                      fontFamily: "Inter",
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textTertiary,
                      letterSpacing: 0.8,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    item.name,
                    style: const TextStyle(
                      fontFamily: "Inter",
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.text,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        "\$${item.price.toStringAsFixed(2)}",
                        style: const TextStyle(
                          fontFamily: "Inter",
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.text,
                        ),
                      ),
                      Row(
                        children: [
                          const Icon(Icons.star, size: 10, color: AppColors.accent),
                          const SizedBox(width: 2),
                          Text(
                            item.rating.toString(),
                            style: const TextStyle(
                              fontFamily: "Inter",
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      )
                    ],
                  )
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
