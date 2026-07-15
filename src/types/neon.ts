/**
 * Types partagés pour l'atelier de personnalisation néon : un canvas raster
 * unique où l'on ajoute librement texte, dessin, lignes et formes — chaque
 * élément a une couleur, un glow, un clignotement optionnel, et une longueur
 * de tube calculée (voir lib/neon/elementGeometry.ts) pour le prix.
 */

export interface Point {
  x: number;
  y: number;
}

export const DEFAULT_GLOW_INTENSITY = 60;

interface NeonElementBase {
  id: string;
  color: string;
  /** Intensité du halo lumineux (0-100), défaut 60 */
  glowIntensity?: number;
  /** Clignotement — implique un contrôleur multi-zone physique, voir pricing.ts */
  blink?: boolean;
}

export interface TextElement extends NeonElementBase, Point {
  type: "text";
  content: string;
  fontSize: number;
  fontId: NeonFontId;
  rotation: number;
}

export interface DrawElement extends NeonElementBase {
  type: "draw";
  points: Point[];
}

export interface LineElement extends NeonElementBase {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ShapeElement extends NeonElementBase, Point {
  type: "rect" | "circle";
  width?: number;
  height?: number;
  radius?: number;
  rotation: number;
}

export type NeonElement = TextElement | DrawElement | LineElement | ShapeElement;

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
  { id: "caveat-regular", label: "Caveat", file: "/fonts/Caveat-Regular.ttf" },
  { id: "caveat-medium", label: "Caveat Medium", file: "/fonts/Caveat-Medium.ttf" },
  { id: "caveat-semibold", label: "Caveat SemiBold", file: "/fonts/Caveat-SemiBold.ttf" },
  { id: "caveat-bold", label: "Caveat Bold", file: "/fonts/Caveat-Bold.ttf" },
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

/** id CSS font-family utilisable directement par le canvas (`font: bold 32px "<family>"`), une police web déjà chargée par l'app (voir globals.css @font-face). */
export const NEON_FONT_FAMILIES: Record<NeonFontId, string> = {
  "caveat-regular": "Caveat Regular",
  "caveat-medium": "Caveat Medium",
  "caveat-semibold": "Caveat SemiBold",
  "caveat-bold": "Caveat Bold",
  pacifico: "Pacifico",
  "dancing-script": "Dancing Script",
  tangerine: "Tangerine",
  sacramento: "Sacramento",
  "great-vibes": "Great Vibes",
  lobster: "Lobster",
  "alex-brush": "Alex Brush",
  allura: "Allura",
  "kaushan-script": "Kaushan Script",
  "poppins-bold": "Poppins",
  "bebas-neue": "Bebas Neue",
  anton: "Anton",
  righteous: "Righteous",
  "pathway-gothic": "Pathway Gothic One",
  bangers: "Bangers",
  monoton: "Monoton",
};
