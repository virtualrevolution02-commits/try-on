import React, { useState, useRef, useCallback } from "react";
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
import { WebView } from "react-native-webview";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeIn,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { CLOTHING_DATA, ClothingItem } from "@/constants/clothing-data";
import { useTryOn } from "@/context/TryOnContext";
import { getApiUrl } from "@/lib/query-client";
import { router } from "expo-router";

const { width, height } = Dimensions.get("window");

// The AR page URL from our Express backend
function getArUrl() {
  try {
    const base = getApiUrl();
    return `${base.replace(/\/$/, "")}/ar-tryon`;
  } catch {
    return "about:blank";
  }
}

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
    scale.value = withSequence(withSpring(0.88, { damping: 14 }), withSpring(1, { damping: 14 }));
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
      <Animated.View style={animStyle}>
        <View style={[styles.catalogItem, isSelected && styles.catalogItemSelected]}>
          <Image source={{ uri: item.image }} style={styles.catalogItemImage} contentFit="cover" transition={200} />
          {isSelected && (
            <View style={styles.selectedRing} />
          )}
          {isSelected && (
            <View style={styles.catalogItemCheck}>
              <Ionicons name="checkmark" size={11} color="#fff" />
            </View>
          )}
        </View>
        <Text style={styles.catalogItemBrand} numberOfLines={1}>{item.brand}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function TryOnScreen() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const { selectedItem, setSelectedItem, saveLook } = useTryOn();
  const [webViewReady, setWebViewReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const arUrl = getArUrl();

  const shutterScale = useSharedValue(1);
  const shutterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shutterScale.value }],
  }));

  // Send a message to the WebView
  const sendToWebView = useCallback((msg: object) => {
    if (!webViewRef.current) return;
    const js = `
      (function() {
        try {
          window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(JSON.stringify(msg))} }));
        } catch(e) {}
      })();
      true;
    `;
    webViewRef.current.injectJavaScript(js);
  }, []);

  // Handle clothing item selection
  const handleSelectItem = useCallback(async (item: ClothingItem) => {
    await Haptics.selectionAsync();

    if (selectedItem?.id === item.id) {
      setSelectedItem(null);
      sendToWebView({ type: "clearClothing" });
      return;
    }

    setSelectedItem(item);
    const activeColor = item.colors[0];
    sendToWebView({
      type: "setClothing",
      item: {
        id: item.id,
        imageUrl: item.image,
        category: item.category,
        name: item.name,
        price: item.price,
        colorHex: activeColor?.hex ?? "#C9A96E",
      },
    });
  }, [selectedItem, sendToWebView, setSelectedItem]);

  // Trigger photo capture in WebView
  const handleCapture = useCallback(async () => {
    if (capturing || !selectedItem) return;
    shutterScale.value = withSequence(
      withSpring(0.85, { damping: 14 }),
      withSpring(1, { damping: 14 })
    );
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCapturing(true);
    sendToWebView({ type: "capture" });
    // Reset capturing after timeout fallback
    setTimeout(() => setCapturing(false), 3000);
  }, [capturing, selectedItem, sendToWebView, shutterScale]);

  // Handle messages from WebView (photo data, etc.)
  const handleWebViewMessage = useCallback(async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "photo" && msg.data) {
        setCapturing(false);
        if (selectedItem) {
          saveLook(msg.data);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            "Look saved!",
            "Your try-on look has been saved to your collection.",
            [
              { text: "View Saved", onPress: () => router.push("/saved") },
              { text: "Continue", style: "cancel" },
            ]
          );
        }
      }
    } catch (e) {
      setCapturing(false);
    }
  }, [selectedItem, saveLook]);

  const handleToggleSkeleton = useCallback(async () => {
    await Haptics.selectionAsync();
    setShowSkeleton(prev => !prev);
    sendToWebView({ type: "toggleSkeleton" });
  }, [sendToWebView]);

  const handleWebViewLoad = useCallback(() => {
    setWebViewReady(true);
    // If item was previously selected, re-send it
    if (selectedItem) {
      setTimeout(() => {
        const activeColor = selectedItem.colors[0];
        sendToWebView({
          type: "setClothing",
          item: {
            id: selectedItem.id,
            imageUrl: selectedItem.image,
            category: selectedItem.category,
            name: selectedItem.name,
            price: selectedItem.price,
            colorHex: activeColor?.hex ?? "#C9A96E",
          },
        });
      }, 1500);
    }
  }, [selectedItem, sendToWebView]);

  return (
    <View style={styles.container}>
      {/* AR WebView — full screen, works on iOS, Android, and Web */}
      <WebView
        ref={webViewRef}
        source={{ uri: arUrl }}
        style={StyleSheet.absoluteFill}
        onLoad={handleWebViewLoad}
        onMessage={handleWebViewMessage}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={false}
        originWhitelist={["*"]}
        mixedContentMode="compatibility"
        onError={(e) => console.warn("WebView error:", e.nativeEvent)}
      />

      {/* Top controls */}
      <View style={[styles.topBar, { paddingTop: Platform.OS === "web" ? 70 : insets.top + 10 }]}>
        <TouchableOpacity
          style={[styles.topBtn, showSkeleton && styles.topBtnActive]}
          onPress={handleToggleSkeleton}
        >
          <Ionicons
            name="body-outline"
            size={19}
            color={showSkeleton ? Colors.accent : Colors.white}
          />
        </TouchableOpacity>

        {selectedItem && (
          <Animated.View entering={FadeIn.duration(250)} style={styles.activeChip}>
            <View style={[styles.chipDot, { backgroundColor: selectedItem.colors[0]?.hex ?? Colors.accent }]} />
            <Text style={styles.chipBrand}>{selectedItem.brand}</Text>
            <Text style={styles.chipSeparator}>·</Text>
            <Text style={styles.chipName} numberOfLines={1}>{selectedItem.name}</Text>
          </Animated.View>
        )}

        <TouchableOpacity
          style={styles.topBtn}
          onPress={() => selectedItem && router.push({ pathname: "/product/[id]", params: { id: selectedItem.id } })}
          disabled={!selectedItem}
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={selectedItem ? Colors.white : "rgba(255,255,255,0.3)"}
          />
        </TouchableOpacity>
      </View>

      {/* Bottom gradient + catalog + shutter */}
      <LinearGradient
        colors={["transparent", "rgba(13,13,13,0.92)"]}
        style={[
          styles.bottomGradient,
          { paddingBottom: Platform.OS === "web" ? 90 : insets.bottom + 80 },
        ]}
        pointerEvents="box-none"
      >
        {/* Catalog */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catalogContent}
          style={styles.catalog}
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

        {/* Category filter chips */}
        <View style={styles.captureRow}>
          <TouchableOpacity
            style={styles.sideBtn}
            onPress={() => {
              setSelectedItem(null);
              sendToWebView({ type: "clearClothing" });
            }}
          >
            <Ionicons
              name="close-circle-outline"
              size={22}
              color={selectedItem ? Colors.white : "rgba(255,255,255,0.3)"}
            />
          </TouchableOpacity>

          <Animated.View style={shutterStyle}>
            <TouchableOpacity
              style={[styles.shutterBtn, (!selectedItem || capturing) && styles.shutterBtnDisabled]}
              onPress={handleCapture}
              disabled={!selectedItem || capturing}
              activeOpacity={0.85}
            >
              {capturing ? (
                <View style={styles.capturingIndicator} />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={styles.sideBtn}
            onPress={() => router.push("/saved")}
          >
            <Ionicons name="images-outline" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {!selectedItem && (
          <Animated.View entering={FadeIn.duration(500)} style={styles.hint}>
            <Ionicons name="hand-left-outline" size={13} color="rgba(255,255,255,0.55)" />
            <Text style={styles.hintText}>Select a piece below to try it on</Text>
          </Animated.View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 50,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  topBtnActive: {
    backgroundColor: "rgba(201,169,110,0.2)",
    borderColor: "rgba(201,169,110,0.4)",
  },
  activeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginHorizontal: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    maxWidth: width - 120,
    alignSelf: "center",
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipBrand: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.accent,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  chipSeparator: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
  },
  chipName: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.white,
    flexShrink: 1,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 80,
    zIndex: 30,
  },
  catalog: {
    marginBottom: 18,
  },
  catalogContent: {
    paddingHorizontal: 18,
    gap: 12,
    paddingBottom: 4,
  },
  catalogItem: {
    width: 70,
    alignItems: "center",
    gap: 5,
    position: "relative",
  },
  catalogItemSelected: {},
  catalogItemImage: {
    width: 70,
    height: 70,
    borderRadius: 14,
  },
  selectedRing: {
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: Colors.accent,
  },
  catalogItemCheck: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  catalogItemBrand: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    maxWidth: 70,
  },
  captureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 44,
    marginBottom: 10,
  },
  sideBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3.5,
    borderColor: "rgba(255,255,255,0.5)",
  },
  shutterBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  shutterInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.white,
  },
  capturingIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingBottom: 6,
  },
  hintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
  },
});
