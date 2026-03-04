export type ClothingCategory = "All" | "Shirts" | "Jackets" | "Dresses" | "Pants" | "Shoes";

export type ColorVariant = {
  name: string;
  hex: string;
};

export type SizeVariant = "XS" | "S" | "M" | "L" | "XL" | "XXL";

export type ClothingItem = {
  id: string;
  name: string;
  brand: string;
  price: number;
  category: Exclude<ClothingCategory, "All">;
  description: string;
  image: string;
  overlayImage?: string;
  colors: ColorVariant[];
  sizes: SizeVariant[];
  rating: number;
  reviewCount: number;
  isNew?: boolean;
  isFeatured?: boolean;
};

export const CLOTHING_DATA: ClothingItem[] = [
  {
    id: "1",
    name: "Relaxed Oxford Shirt",
    brand: "ARKET",
    price: 89,
    category: "Shirts",
    description: "A relaxed-fit oxford shirt crafted from breathable 100% cotton. Features a button-down collar and a subtle texture that keeps things interesting without being loud.",
    image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&q=80",
    colors: [
      { name: "White", hex: "#FAFAFA" },
      { name: "Blue", hex: "#4A90D9" },
      { name: "Sage", hex: "#8FAF8A" },
    ],
    sizes: ["S", "M", "L", "XL"],
    rating: 4.7,
    reviewCount: 234,
    isNew: true,
  },
  {
    id: "2",
    name: "Merino Wool Turtleneck",
    brand: "COS",
    price: 120,
    category: "Shirts",
    description: "A fine-gauge merino wool turtleneck that transitions effortlessly from office to evening. Lightweight, warm, and utterly refined.",
    image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&q=80",
    colors: [
      { name: "Camel", hex: "#C9A96E" },
      { name: "Charcoal", hex: "#3D3D3D" },
      { name: "Ivory", hex: "#F5F0E8" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    rating: 4.9,
    reviewCount: 189,
    isFeatured: true,
  },
  {
    id: "3",
    name: "Oversized Linen Blazer",
    brand: "Totême",
    price: 395,
    category: "Jackets",
    description: "An architectural blazer in lightweight linen that drapes beautifully. Oversized shoulders and a relaxed body make this a versatile wardrobe cornerstone.",
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80",
    colors: [
      { name: "Sand", hex: "#D4C5A9" },
      { name: "Black", hex: "#1A1A1A" },
    ],
    sizes: ["XS", "S", "M", "L"],
    rating: 4.8,
    reviewCount: 67,
    isFeatured: true,
  },
  {
    id: "4",
    name: "Quilted Puffer Jacket",
    brand: "Moncler",
    price: 1290,
    category: "Jackets",
    description: "Iconic down-filled quilted jacket with a distinctive stitching pattern. Lightweight warmth meets Parisian chic in this timeless winter staple.",
    image: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600&q=80",
    colors: [
      { name: "Navy", hex: "#1B2A4A" },
      { name: "Olive", hex: "#5C6B3A" },
      { name: "Burgundy", hex: "#722F37" },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    rating: 4.9,
    reviewCount: 412,
    isNew: false,
  },
  {
    id: "5",
    name: "Fluid Midi Dress",
    brand: "Lemaire",
    price: 680,
    category: "Dresses",
    description: "Cut from fluid silk-blend fabric, this midi dress features a wrapped silhouette that adapts to your shape. The soft drape creates an effortless elegance.",
    image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80",
    colors: [
      { name: "Ecru", hex: "#F0EAD6" },
      { name: "Terracotta", hex: "#C4622D" },
      { name: "Forest", hex: "#2D5016" },
    ],
    sizes: ["XS", "S", "M", "L"],
    rating: 4.6,
    reviewCount: 98,
    isFeatured: true,
  },
  {
    id: "6",
    name: "Slip Dress",
    brand: "Silk Laundry",
    price: 195,
    category: "Dresses",
    description: "The ultimate effortless dress crafted from premium charmeuse silk. Wear it day or evening — its simplicity is its superpower.",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80",
    colors: [
      { name: "Champagne", hex: "#F7E7CE" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Rose", hex: "#DBA8A0" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    rating: 4.7,
    reviewCount: 543,
    isNew: true,
  },
  {
    id: "7",
    name: "Wide-Leg Trousers",
    brand: "Theory",
    price: 285,
    category: "Pants",
    description: "Impeccably tailored wide-leg trousers in a medium-weight crepe. A high-rise cut and clean lines make these an instant wardrobe essential.",
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&q=80",
    colors: [
      { name: "Slate", hex: "#708090" },
      { name: "Camel", hex: "#C19A6B" },
      { name: "Black", hex: "#1A1A1A" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    rating: 4.5,
    reviewCount: 176,
  },
  {
    id: "8",
    name: "Straight Leg Denim",
    brand: "Frame",
    price: 198,
    category: "Pants",
    description: "Clean, classic straight-leg denim that sits at the natural waist. Made from premium selvedge denim that gets better with every wear.",
    image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80",
    colors: [
      { name: "Indigo", hex: "#3F51B5" },
      { name: "Light Wash", hex: "#A8C5D8" },
      { name: "Ecru", hex: "#F0EAD6" },
    ],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    rating: 4.8,
    reviewCount: 892,
    isFeatured: true,
  },
  {
    id: "9",
    name: "Leather Chelsea Boot",
    brand: "A.P.C.",
    price: 490,
    category: "Shoes",
    description: "Minimalist Chelsea boots crafted from full-grain leather. The sleek silhouette and elastic gussets make these impossibly easy to wear.",
    image: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=600&q=80",
    colors: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Tan", hex: "#C19A6B" },
    ],
    sizes: ["S", "M", "L", "XL"],
    rating: 4.9,
    reviewCount: 321,
    isNew: true,
  },
  {
    id: "10",
    name: "Linen Cargo Shirt",
    brand: "Our Legacy",
    price: 295,
    category: "Shirts",
    description: "An oversized linen shirt with structured cargo pockets. The relaxed drape and utilitarian details make this a contemporary summer classic.",
    image: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600&q=80",
    colors: [
      { name: "Khaki", hex: "#C3B091" },
      { name: "Stone", hex: "#928E85" },
      { name: "White", hex: "#FAFAFA" },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    rating: 4.6,
    reviewCount: 134,
  },
  {
    id: "11",
    name: "Technical Bomber",
    brand: "Acronym",
    price: 2100,
    category: "Jackets",
    description: "A revolutionary technical bomber with waterproof zippers, articulated patterning, and innovative storage systems. The future of outerwear.",
    image: "https://images.unsplash.com/photo-1520975867-c65c4c51b6b5?w=600&q=80",
    colors: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Olive", hex: "#5C6B3A" },
    ],
    sizes: ["S", "M", "L", "XL"],
    rating: 4.8,
    reviewCount: 48,
    isNew: true,
  },
  {
    id: "12",
    name: "Low Sneaker",
    brand: "Common Projects",
    price: 495,
    category: "Shoes",
    description: "The Achilles Low — the sneaker that redefined minimalist footwear. Premium Italian leather, gold serial number, nothing more.",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
    colors: [
      { name: "White", hex: "#FAFAFA" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Tan", hex: "#C19A6B" },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    rating: 4.9,
    reviewCount: 1204,
    isFeatured: true,
  },
];

export const CATEGORIES: ClothingCategory[] = ["All", "Shirts", "Jackets", "Dresses", "Pants", "Shoes"];
