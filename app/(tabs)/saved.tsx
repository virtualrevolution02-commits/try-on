import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useTryOn, SavedLook } from "@/context/TryOnContext";
import { router } from "expo-router";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

function LookCard({ look, onDelete }: { look: SavedLook; onDelete: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const dateStr = new Date(look.savedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const handleLongPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Remove Look", "Remove this look from your saved collection?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: onDelete,
      },
    ]);
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} style={animStyle}>
      <TouchableOpacity
        onLongPress={handleLongPress}
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
        activeOpacity={1}
        style={styles.card}
      >
        <Image
          source={{ uri: look.photoUri }}
          style={styles.cardImage}
          contentFit="cover"
          transition={300}
        />
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.cardBrand}>{look.item.brand}</Text>
            <Text style={styles.cardName} numberOfLines={1}>{look.item.name}</Text>
          </View>
          <Text style={styles.cardDate}>{dateStr}</Text>
        </View>
        <View style={styles.deleteHint}>
          <Ionicons name="hand-left-outline" size={10} color="rgba(255,255,255,0.6)" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const { savedLooks, deleteLook } = useTryOn();

  const handleDelete = async (id: string) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    deleteLook(id);
  };

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Looks</Text>
        {savedLooks.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{savedLooks.length}</Text>
          </View>
        )}
      </View>

      {savedLooks.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="heart-outline" size={36} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>No saved looks yet</Text>
          <Text style={styles.emptySubtitle}>
            Use the Try On tab to virtually try on clothes and save your favorite looks
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push("/tryon")}
          >
            <Ionicons name="camera-outline" size={16} color={Colors.white} />
            <Text style={styles.emptyBtnText}>Start Trying On</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={savedLooks}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.gridContent,
            { paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 120 },
          ]}
          renderItem={({ item }) => (
            <LookCard
              look={item}
              onDelete={() => handleDelete(item.id)}
            />
          )}
          ListHeaderComponent={
            <Text style={styles.hintText}>Long press to remove a look</Text>
          }
        />
      )}
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
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  countBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  countText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.white,
  },
  hintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: "center",
    marginBottom: 16,
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
  cardImage: {
    width: "100%",
    height: CARD_WIDTH * 1.3,
    backgroundColor: Colors.surfaceSecondary,
  },
  cardFooter: {
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
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
    fontSize: 12,
    color: Colors.text,
    maxWidth: 90,
  },
  cardDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textTertiary,
  },
  deleteHint: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(13,13,13,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
    paddingBottom: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
  },
  emptyBtn: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.text,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  emptyBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.white,
  },
});
