/**
 * Types partagés pour le moteur de configuration néon
 * (vectorisation, conversion d'unités, détection de collision, pricing)
 */

export interface Point {
  x: number;
  y: number;
}

/** Un tracé néon individuel (une lettre, un segment de logo, etc.) */
export interface NeonPath {
  id: string;
  /** Attribut SVG "d" — coordonnées en pixels dans l'espace de travail du design */
  d: string;
  color: string;
  order: number;
  /** Regroupement optionnel (ex: toutes les lettres d'un même mot) */
  groupId?: string;
}

export interface CollisionZone {
  pathIds: [string, string];
  /** Distance minimale réelle mesurée entre les deux tracés, en cm */
  minDistanceCm: number;
  /** Point approximatif (en px, espace de travail) où la collision est la plus sévère */
  atPoint: Point;
}

export interface CollisionResult {
  hasCollision: boolean;
  zones: CollisionZone[];
  /** Distance minimale requise entre deux tracés, en cm (contrainte tube néon) */
  minAllowedDistanceCm: number;
  checkedAt: string;
}

export interface WorkspaceDimensions {
  /** Largeur/hauteur de l'espace de travail en pixels (avant mise à l'échelle finale) */
  widthPx: number;
  heightPx: number;
  /** Dimensions cibles réelles en cm (contrainte: max 90 x 90) */
  widthCm: number;
  heightCm: number;
}

export const NEON_TUBE_WIDTH_CM = 1;
export const MAX_DIMENSION_CM = 90;

export const NEON_COLORS = [
  { id: "red", label: "Rouge", hex: "#FF073A" },
  { id: "blue", label: "Bleu", hex: "#1B03FF" },
  { id: "green", label: "Vert", hex: "#39FF14" },
  { id: "pink", label: "Rose", hex: "#FF2FC0" },
  { id: "warm-white", label: "Blanc chaud", hex: "#FFE9C4" },
  { id: "cold-white", label: "Blanc froid", hex: "#F5FBFF" },
  { id: "yellow", label: "Jaune", hex: "#FFF01F" },
  { id: "purple", label: "Violet", hex: "#B026FF" },
  { id: "orange", label: "Orange", hex: "#FF6B1A" },
] as const;

export type NeonColorId = (typeof NEON_COLORS)[number]["id"];

export const NEON_FONTS = [
  { id: "pacifico", label: "Pacifico", file: "/fonts/Pacifico-Regular.ttf" },
  { id: "dancing-script", label: "Dancing Script", file: "/fonts/DancingScript-Bold.ttf" },
  { id: "tangerine", label: "Tangerine", file: "/fonts/Tangerine-Bold.ttf" },
  { id: "sacramento", label: "Sacramento", file: "/fonts/Sacramento-Regular.ttf" },
  { id: "great-vibes", label: "Great Vibes", file: "/fonts/GreatVibes-Regular.ttf" },
  { id: "lobster", label: "Lobster", file: "/fonts/Lobster-Regular.ttf" },
  { id: "alex-brush", label: "Alex Brush", file: "/fonts/AlexBrush-Regular.ttf" },
  { id: "allura", label: "Allura", file: "/fonts/Allura-Regular.ttf" },
  { id: "kaushan-script", label: "Kaushan Script", file: "/fonts/KaushanScript-Regular.ttf" },
  { id: "poppins-bold", label: "Poppins Bold", file: "/fonts/Poppins-Bold.ttf" },
  { id: "bebas-neue", label: "Bebas Neue", file: "/fonts/BebasNeue-Regular.ttf" },
  { id: "anton", label: "Anton", file: "/fonts/Anton-Regular.ttf" },
  { id: "righteous", label: "Righteous", file: "/fonts/Righteous-Regular.ttf" },
  { id: "pathway-gothic", label: "Pathway Gothic", file: "/fonts/PathwayGothicOne-Regular.ttf" },
  { id: "bangers", label: "Bangers", file: "/fonts/Bangers-Regular.ttf" },
  { id: "monoton", label: "Monoton", file: "/fonts/Monoton-Regular.ttf" },
] as const;

export type NeonFontId = (typeof NEON_FONTS)[number]["id"];
