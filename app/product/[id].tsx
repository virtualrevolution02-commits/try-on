import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import { CLOTHING_DATA } from "@/constants/clothing-data";
import { useTryOn } from "@/context/TryOnContext";

const { width } = Dimensions.get("window");

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { selectedItem, selectedColor, selectedSize, setSelectedItem, setSelectedColor, setSelectedSize } =
    useTryOn();

  const item = CLOTHING_DATA.find((c) => c.id === id);

  const [localColor, setLocalColor] = useState(
    selectedItem?.id === id ? selectedColor : item?.colors[0]?.name ?? ""
  );
  const [localSize, setLocalSize] = useState(
    selectedItem?.id === id ? selectedSize : item?.sizes[1] ?? item?.sizes[0] ?? ""
  );

  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  if (!item) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.center}>
          <Text style={styles.notFound}>Item not found</Text>
        </View>
      </View>
    );
  }

  const handleTryOn = async () => {
    btnScale.value = withSpring(0.95, { damping: 15 }, () => {
      btnScale.value = withSpring(1);
    });
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedItem(item);
    setSelectedColor(localColor);
    setSelectedSize(localSize);
    router.back();
    setTimeout(() => router.push("/tryon"), 300);
  };

  const handleColorSelect = async (colorName: string) => {
    await Haptics.selectionAsync();
    setLocalColor(colorName);
  };

  const handleSizeSelect = async (size: string) => {
    await Haptics.selectionAsync();
    setLocalSize(size);
  };

  const activeColor = item.colors.find((c) => c.name === localColor);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 50 : insets.top + 8 }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn}>
          <Ionicons name="share-outline" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.imageContainer}>
          <Image source={{ uri: item.image }} style={styles.productImage} contentFit="cover" />
          {item.isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW ARRIVAL</Text>
            </View>
          )}
        </Animated.View>

        <View style={styles.info}>
          <Text style={styles.brand}>{item.brand}</Text>
          <Text style={styles.name}>{item.name}</Text>

          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons
                  key={s}
                  name={s <= Math.round(item.rating) ? "star" : "star-outline"}
                  size={13}
                  color={Colors.accent}
                />
              ))}
            </View>
            <Text style={styles.ratingText}>
              {item.rating} · {item.reviewCount.toLocaleString()} reviews
            </Text>
          </View>

          <Text style={styles.price}>${item.price.toLocaleString()}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>COLOR</Text>
          <View style={styles.colorsRow}>
            {item.colors.map((color) => (
              <TouchableOpacity
                key={color.name}
                onPress={() => handleColorSelect(color.name)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color.hex },
                  localColor === color.name && styles.colorSwatchSelected,
                  (color.hex === "#FAFAFA" || color.hex === "#F5F0E8" || color.hex === "#F0EAD6")
                    ? styles.colorSwatchBorder
                    : null,
                ]}
              />
            ))}
          </View>
          {activeColor && (
            <Text style={styles.colorName}>{activeColor.name}</Text>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>SIZE</Text>
          <View style={styles.sizesRow}>
            {item.sizes.map((size) => (
              <TouchableOpacity
                key={size}
                onPress={() => handleSizeSelect(size)}
                style={[styles.sizeBtn, localSize === size && styles.sizeBtnSelected]}
              >
                <Text style={[styles.sizeBtnText, localSize === size && styles.sizeBtnTextSelected]}>
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>ABOUT</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Platform.OS === "web" ? 24 : insets.bottom + 12 }]}>
        <Animated.View style={[styles.tryOnBtnWrap, btnStyle]}>
          <TouchableOpacity style={styles.tryOnBtn} onPress={handleTryOn} activeOpacity={0.9}>
            <Ionicons name="camera" size={18} color={Colors.white} />
            <Text style={styles.tryOnBtnText}>Try On</Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity style={styles.addToCartBtn}>
          <Ionicons name="bag-add-outline" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notFound: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(250,250,248,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(250,250,248,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingBottom: 120,
  },
  imageContainer: {
    width: "100%",
    height: width * 1.1,
    backgroundColor: Colors.surfaceSecondary,
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  newBadge: {
    position: "absolute",
    top: 20,
    left: 20,
    backgroundColor: Colors.text,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
  },
  newBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: Colors.white,
    letterSpacing: 1.2,
  },
  info: {
    padding: 24,
  },
  brand: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  stars: {
    flexDirection: "row",
    gap: 2,
  },
  ratingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  price: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 20,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  colorsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSwatchSelected: {
    borderWidth: 2.5,
    borderColor: Colors.text,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  colorSwatchBorder: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  colorName: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sizesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sizeBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  sizeBtnSelected: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  sizeBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sizeBtnTextSelected: {
    color: Colors.white,
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  tryOnBtnWrap: {
    flex: 1,
  },
  tryOnBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.text,
    borderRadius: 14,
    paddingVertical: 15,
  },
  tryOnBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.white,
  },
  addToCartBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
});
