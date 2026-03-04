# TryOn — AR Clothing Try-On App

## Overview
A polished AR clothing try-on mobile app built with Expo Router. Users browse a fashion catalog, virtually try on clothes using AI body pose tracking, and save their favorite looks.

## Architecture

### Frontend (Expo / React Native)
- **Framework**: Expo SDK 54, Expo Router (file-based routing)
- **Tabs**: Shop, Try On, Saved
- **State**: React Context (TryOnContext) + AsyncStorage for persistence
- **Styling**: React Native StyleSheet, Inter font, custom Colors theme

### Backend (Express + Node)
- **Port**: 5000
- **Key route**: `GET /ar-tryon` — serves the TensorFlow.js pose-tracking AR page

### AR Try-On Engine (`server/templates/ar-tryon.html`)
- **Pose detection**: TensorFlow.js MoveNet (Lightning model) via CDN
- **Keypoints used**: shoulders (5,6), hips (11,12), ankles (15,16) for different clothing types
- **Cloth warping**: Affine transform (translate → rotate → scale) keyed to body keypoints
- **Smoothing**: Exponential moving average on all tracked values to prevent jitter
- **Clothing types**: Upper body (shirts/jackets/dresses), Pants, Shoes — each uses different keypoints
- **React Native bridge**: `postMessage` / `injectJavaScript` for bidirectional communication

## Key Files
- `app/(tabs)/index.tsx` — Catalog screen (grid, search, categories, featured)
- `app/(tabs)/tryon.tsx` — Try-On screen (WebView + native catalog carousel)
- `app/(tabs)/saved.tsx` — Saved looks gallery
- `app/product/[id].tsx` — Product detail modal (colors, sizes, try-on CTA)
- `context/TryOnContext.tsx` — Shared state (selected item, saved looks)
- `constants/clothing-data.ts` — All clothing items data
- `constants/colors.ts` — App color theme (warm ivory, near-black, gold accent)
- `server/templates/ar-tryon.html` — TF.js pose tracking + canvas warping engine
- `server/routes.ts` — Express routes (including /ar-tryon)

## Design System
- **Background**: #FAFAF8 (warm ivory)
- **Text**: #0D0D0D (near black)
- **Accent**: #C9A96E (warm gold)
- **Font**: Inter (400, 500, 600, 700)

## Installed Packages
- `expo-camera` — Camera access (also used in WebView flow)
- `react-native-webview` — Embeds the AR try-on HTML page
- `expo-haptics` — Haptic feedback
- `expo-linear-gradient` — Gradient overlays
- `expo-image` — Optimized image loading

## How the AR Works
1. Try On tab loads `/ar-tryon` in a WebView
2. The HTML page starts camera via `getUserMedia`
3. TF.js MoveNet detects body keypoints at ~30fps
4. Clothing image is drawn on canvas using `ctx.translate/rotate/drawImage` aligned to shoulders/hips
5. React Native sends clothing item data via `injectJavaScript → window.dispatchEvent`
6. Capture composites video + overlay canvas → sends base64 back via `postMessage`
7. Saved looks stored in AsyncStorage

## User Preferences
- Clean, minimal editorial fashion aesthetic
- Real body-tracking (not static overlay)
- Market-leading app design quality
