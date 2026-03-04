import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ClothingItem } from "@/constants/clothing-data";

export type SavedLook = {
  id: string;
  photoUri: string;
  item: ClothingItem;
  selectedColor: string;
  savedAt: number;
};

interface TryOnContextValue {
  selectedItem: ClothingItem | null;
  selectedColor: string;
  selectedSize: string;
  savedLooks: SavedLook[];
  setSelectedItem: (item: ClothingItem | null) => void;
  setSelectedColor: (color: string) => void;
  setSelectedSize: (size: string) => void;
  saveLook: (photoUri: string) => void;
  deleteLook: (id: string) => void;
  isSavedItem: (itemId: string) => boolean;
}

const TryOnContext = createContext<TryOnContextValue | null>(null);

const SAVED_LOOKS_KEY = "tryon_saved_looks";

export function TryOnProvider({ children }: { children: ReactNode }) {
  const [selectedItem, setSelectedItemState] = useState<ClothingItem | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);

  useEffect(() => {
    loadSavedLooks();
  }, []);

  const loadSavedLooks = async () => {
    try {
      const stored = await AsyncStorage.getItem(SAVED_LOOKS_KEY);
      if (stored) {
        setSavedLooks(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load saved looks", e);
    }
  };

  const persistLooks = async (looks: SavedLook[]) => {
    try {
      await AsyncStorage.setItem(SAVED_LOOKS_KEY, JSON.stringify(looks));
    } catch (e) {
      console.error("Failed to persist looks", e);
    }
  };

  const setSelectedItem = (item: ClothingItem | null) => {
    setSelectedItemState(item);
    if (item) {
      setSelectedColor(item.colors[0]?.name ?? "");
      setSelectedSize(item.sizes[1] ?? item.sizes[0] ?? "");
    }
  };

  const saveLook = (photoUri: string) => {
    if (!selectedItem) return;
    const newLook: SavedLook = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      photoUri,
      item: selectedItem,
      selectedColor,
      savedAt: Date.now(),
    };
    const updated = [newLook, ...savedLooks];
    setSavedLooks(updated);
    persistLooks(updated);
  };

  const deleteLook = (id: string) => {
    const updated = savedLooks.filter((l) => l.id !== id);
    setSavedLooks(updated);
    persistLooks(updated);
  };

  const isSavedItem = (itemId: string) => {
    return savedLooks.some((l) => l.item.id === itemId);
  };

  const value = useMemo(
    () => ({
      selectedItem,
      selectedColor,
      selectedSize,
      savedLooks,
      setSelectedItem,
      setSelectedColor,
      setSelectedSize,
      saveLook,
      deleteLook,
      isSavedItem,
    }),
    [selectedItem, selectedColor, selectedSize, savedLooks]
  );

  return <TryOnContext.Provider value={value}>{children}</TryOnContext.Provider>;
}

export function useTryOn() {
  const ctx = useContext(TryOnContext);
  if (!ctx) throw new Error("useTryOn must be used within TryOnProvider");
  return ctx;
}
