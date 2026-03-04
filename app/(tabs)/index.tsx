import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import { CLOTHING_DATA, CATEGORIES, ClothingCategory, ClothingItem } from "@/constants/clothing-data";
import { useTryOn } from "@/context/TryOnContext";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

function CategoryPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.pill, active && styles.pillActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ClothingCard({ item }: { item: ClothingItem }) {
  const { setSelectedItem } = useTryOn();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 200 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handlePress = () => {
    setSelectedItem(item);
    router.push({ pathname: "/product/[id]", params: { id: item.id } });
  };

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.cardImageContainer}>
          <Image
            source={{ uri: item.image }}
            style={styles.cardImage}
            contentFit="cover"
            transition={300}
          />
          {item.isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
          <View style={styles.cardColors}>
            {item.colors.slice(0, 3).map((c) => (
              <View
                key={c.name}
                style={[
                  styles.colorDot,
                  { backgroundColor: c.hex },
                  c.hex === "#FAFAFA" || c.hex === "#F5F0E8" || c.hex === "#F0EAD6" || c.hex === "#FAFAFA"
                    ? styles.colorDotBorder
                    : null,
                ]}
              />
            ))}
          </View>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardBrand}>{item.brand}</Text>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.cardFooter}>
            <Text style={styles.cardPrice}>${item.price}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={10} color={Colors.accent} />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function FeaturedCard({ item }: { item: ClothingItem }) {
  const { setSelectedItem } = useTryOn();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    setSelectedItem(item);
    router.push({ pathname: "/product/[id]", params: { id: item.id } });
  };

  return (
    <Animated.View style={[styles.featuredCard, animStyle]}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={() => { scale.value = withSpring(0.97); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        activeOpacity={1}
      >
        <Image
          source={{ uri: item.image }}
          style={styles.featuredImage}
          contentFit="cover"
          transition={300}
        />
        <View style={styles.featuredOverlay}>
          <Text style={styles.featuredBrand}>{item.brand}</Text>
          <Text style={styles.featuredName}>{item.name}</Text>
          <Text style={styles.featuredPrice}>${item.price}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState<ClothingCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const featured = CLOTHING_DATA.filter((i) => i.isFeatured);

  const filtered = CLOTHING_DATA.filter((item) => {
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    const matchesSearch =
      searchQuery === "" ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderItem = useCallback(
    ({ item }: { item: ClothingItem }) => <ClothingCard item={item} />,
    []
  );

  const keyExtractor = useCallback((item: ClothingItem) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TryOn</Text>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="bag-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
        <Ionicons name="search" size={16} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search designers, pieces..."
          placeholderTextColor={Colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((cat) => (
          <CategoryPill
            key={cat}
            label={cat}
            active={activeCategory === cat}
            onPress={() => setActiveCategory(cat)}
          />
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.gridContent,
          { paddingBottom: Platform.OS === "web" ? 100 : 120 },
        ]}
        ListHeaderComponent={
          activeCategory === "All" && searchQuery === "" ? (
            <View>
              <Text style={styles.sectionTitle}>Featured</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredContent}
              >
                {featured.map((item) => (
                  <FeaturedCard key={item.id} item={item} />
                ))}
              </ScrollView>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>All Items</Text>
                <Text style={styles.itemCount}>{CLOTHING_DATA.length} pieces</Text>
              </View>
            </View>
          ) : (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{activeCategory}</Text>
              <Text style={styles.itemCount}>{filtered.length} pieces</Text>
            </View>
          )
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search or filters</Text>
          </View>
        }
        scrollEnabled={!!filtered.length}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  searchContainerFocused: {
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.text,
  },
  categoryScroll: {
    marginBottom: 8,
  },
  categoryContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: Colors.surfaceSecondary,
  },
  pillActive: {
    backgroundColor: Colors.text,
  },
  pillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.white,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  itemCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textTertiary,
    marginBottom: 12,
  },
  featuredContent: {
    gap: 12,
    paddingBottom: 20,
  },
  featuredCard: {
    width: width * 0.65,
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: Colors.surfaceSecondary,
  },
  featuredImage: {
    width: "100%",
    height: "100%",
  },
  featuredOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 18,
    backgroundColor: "rgba(13,13,13,0.45)",
  },
  featuredBrand: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  featuredName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.white,
    marginBottom: 2,
  },
  featuredPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.accent,
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: "hidden",
  },
  cardImageContainer: {
    width: "100%",
    height: CARD_WIDTH * 1.2,
    backgroundColor: Colors.surfaceSecondary,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  newBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: Colors.text,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  newBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    color: Colors.white,
    letterSpacing: 1,
  },
  cardColors: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    gap: 4,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  colorDotBorder: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardInfo: {
    padding: 10,
  },
  cardBrand: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  cardName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.text,
    marginBottom: 6,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.text,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.text,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textTertiary,
  },
});
