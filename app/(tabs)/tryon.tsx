import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { CLOTHING_DATA, ClothingItem } from "@/constants/clothing-data";
import { useTryOn } from "@/context/TryOnContext";
import { router } from "expo-router";

const { width, height } = Dimensions.get("window");

function CatalogItem({
  item,
  isSelected,
  onPress,
}: {
  item: ClothingItem;
  isSelected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(withSpring(0.9), withSpring(1));
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
      <Animated.View style={[styles.catalogItem, isSelected && styles.catalogItemSelected, animStyle]}>
        <Image source={{ uri: item.image }} style={styles.catalogItemImage} contentFit="cover" />
        {isSelected && (
          <View style={styles.catalogItemCheck}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
        )}
      </Animated.View>
      <Text style={styles.catalogItemName} numberOfLines={1}>
        {item.brand}
      </Text>
    </TouchableOpacity>
  );
}

function OverlayClothing({ item }: { item: ClothingItem }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    opacity.value = withTiming(0.82, { duration: 300 });
    translateY.value = withSpring(0, { damping: 18 });
  }, [item.id]);

  return (
    <Animated.View style={[styles.overlayClothing, animStyle]}>
      <Image
        source={{ uri: item.image }}
        style={styles.overlayImage}
        contentFit="contain"
      />
    </Animated.View>
  );
}

export default function TryOnScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const { selectedItem, setSelectedItem, saveLook } = useTryOn();
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [flash, setFlash] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureFlash, setCaptureFlash] = useState(false);

  const shutterScale = useSharedValue(1);
  const shutterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shutterScale.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: captureFlash ? 0.7 : 0,
  }));

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    shutterScale.value = withSequence(withSpring(0.85), withSpring(1));
    setCaptureFlash(true);
    setTimeout(() => setCaptureFlash(false), 150);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo && selectedItem) {
        saveLook(photo.uri);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Look saved!", "Your try-on has been saved to your collection.", [
          { text: "View Saved", onPress: () => router.push("/saved") },
          { text: "Continue", style: "cancel" },
        ]);
      }
    } catch (e) {
      console.error("Capture failed", e);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSelectItem = async (item: ClothingItem) => {
    await Haptics.selectionAsync();
    setSelectedItem(item.id === selectedItem?.id ? null : item);
  };

  if (!permission) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <View style={styles.loadingDot} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIcon}>
            <Ionicons name="camera" size={40} color={Colors.text} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access</Text>
          <Text style={styles.permissionText}>
            Enable camera to virtually try on clothes in real-time
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Enable Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Platform.OS !== "web" ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          flash={flash ? "on" : "off"}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.webCameraPlaceholder]}>
          <Ionicons name="camera" size={60} color={Colors.textTertiary} />
          <Text style={styles.webPlaceholderText}>Camera preview</Text>
        </View>
      )}

      {captureFlash && (
        <Animated.View style={[StyleSheet.absoluteFill, styles.captureFlash, flashStyle]} />
      )}

      {selectedItem && <OverlayClothing item={selectedItem} />}

      <LinearGradient
        colors={["rgba(13,13,13,0.55)", "transparent"]}
        style={[styles.topGradient, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topBtn}
            onPress={() => setFlash(!flash)}
          >
            <Ionicons
              name={flash ? "flash" : "flash-off"}
              size={20}
              color={Colors.white}
            />
          </TouchableOpacity>

          {selectedItem && (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
              <View style={styles.tryingOnChip}>
                <Text style={styles.tryingOnText}>{selectedItem.brand}</Text>
                <Text style={styles.tryingOnName}>{selectedItem.name}</Text>
              </View>
            </Animated.View>
          )}

          <TouchableOpacity
            style={styles.topBtn}
            onPress={() => setFacing(facing === "front" ? "back" : "front")}
          >
            <Ionicons name="camera-reverse-outline" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <LinearGradient
        colors={["transparent", "rgba(13,13,13,0.85)"]}
        style={[styles.bottomGradient, { paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 90 }]}
      >
        {!selectedItem && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.hintContainer}>
            <Ionicons name="hand-left-outline" size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.hintText}>Select a piece below to try on</Text>
          </Animated.View>
        )}

        <View style={styles.catalogContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catalogContent}
          >
            {CLOTHING_DATA.map((item) => (
              <CatalogItem
                key={item.id}
                item={item}
                isSelected={selectedItem?.id === item.id}
                onPress={() => handleSelectItem(item)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.captureRow}>
          {selectedItem ? (
            <TouchableOpacity
              style={styles.infoBtn}
              onPress={() => router.push({ pathname: "/product/[id]", params: { id: selectedItem.id } })}
            >
              <Ionicons name="information-circle-outline" size={22} color={Colors.white} />
            </TouchableOpacity>
          ) : (
            <View style={styles.infoBtn} />
          )}

          <Animated.View style={shutterStyle}>
            <TouchableOpacity
              style={[styles.shutterBtn, !selectedItem && styles.shutterBtnDisabled]}
              onPress={handleCapture}
              disabled={!selectedItem || isCapturing}
            >
              <View style={styles.shutterInner} />
            </TouchableOpacity>
          </Animated.View>

          {selectedItem ? (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => setSelectedItem(null)}
            >
              <Ionicons name="close" size={20} color={Colors.white} />
            </TouchableOpacity>
          ) : (
            <View style={styles.clearBtn} />
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  webCameraPlaceholder: {
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  webPlaceholderText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textTertiary,
  },
  captureFlash: {
    backgroundColor: Colors.white,
    zIndex: 20,
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    zIndex: 10,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  tryingOnChip: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: "center",
    backdropFilter: "blur(10px)",
  },
  tryingOnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: Colors.accent,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  tryingOnName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.white,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    zIndex: 10,
  },
  hintContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 16,
  },
  hintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },
  catalogContainer: {
    marginBottom: 20,
  },
  catalogContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  catalogItem: {
    width: 72,
    alignItems: "center",
    gap: 4,
  },
  catalogItemSelected: {},
  catalogItemImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  catalogItemCheck: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  catalogItemName: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    maxWidth: 72,
  },
  captureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
  },
  infoBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.5)",
  },
  shutterBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.4)",
    borderColor: "rgba(255,255,255,0.2)",
  },
  shutterInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.white,
  },
  clearBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayClothing: {
    position: "absolute",
    top: "15%",
    left: "5%",
    right: "5%",
    height: "55%",
    zIndex: 5,
  },
  overlayImage: {
    width: "100%",
    height: "100%",
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textTertiary,
  },
  permissionContainer: {
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  permissionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  permissionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  permissionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  permissionBtn: {
    marginTop: 8,
    backgroundColor: Colors.text,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  permissionBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.white,
  },
});
