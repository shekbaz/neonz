"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { NEON_FONTS, NEON_FONT_FAMILIES, DEFAULT_GLOW_INTENSITY, type NeonFontId } from "@/types/neon";
import { DEFAULT_PRICING_SETTINGS, type PricingSettings, type SupportType } from "@/lib/neon/pricing";
import {
  Upload,
  Download,
  Trash2,
  Type,
  Square,
  Circle,
  Palette,
  Undo,
  Redo,
  Move,
  RotateCw,
  Maximize2,
  Settings,
  Eye,
  EyeOff,
  Target,
  Zap,
  ArrowRight,
  Minus,
  Pencil,
  Plus,
  Copy,
  Sun,
  Moon,
} from "lucide-react";

/**
 * Port fidèle de l'atelier de personnalisation "Créez votre Néon Personnalisé"
 * (canvas 2D avec dessin libre, lignes, formes, texte, image de référence
 * avec détection de contours et accroche magnétique) — mêmes outils, même
 * logique de calcul de prix au cm, seule l'habillage visuel suit le design
 * NEONZART et l'intégration finale (API + checkout) utilise le vrai backend.
 */

interface Point {
  x: number;
  y: number;
}

/** Propriétés d'éclairage communes — mêmes champs (et mêmes défauts) que le schéma serveur `customDesign.schema.ts` : glowIntensity 0-100, blink = contrôleur multi-zone requis. */
interface NeonLighting {
  /** Intensité du halo lumineux (0-100), défaut DEFAULT_GLOW_INTENSITY */
  glowIntensity?: number;
  /** Clignotement — implique le surcoût contrôleur multi-zone (voir pricing.ts) */
  blink?: boolean;
}

interface TextElement extends Point, NeonLighting {
  id: string;
  type: "text";
  content: string;
  color: string;
  fontSize: number;
  fontId: NeonFontId;
  rotation: number;
  selected?: boolean;
}

interface DrawElement extends NeonLighting {
  id: string;
  type: "draw";
  points: Point[];
  color: string;
  rotation?: number;
  selected?: boolean;
}

interface LineElement extends NeonLighting {
  id: string;
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  rotation?: number;
  selected?: boolean;
}

interface ShapeElement extends Point, NeonLighting {
  id: string;
  type: "rect" | "circle";
  color: string;
  width?: number;
  height?: number;
  radius?: number;
  rotation: number;
  selected?: boolean;
}

type CanvasElement = TextElement | DrawElement | ShapeElement | LineElement;

const CM_TO_PX = 10;
const NEON_WIDTH_CM = 1;
const NEON_WIDTH_PX = NEON_WIDTH_CM * CM_TO_PX;
const MAX_DIMENSIONS = { width: 85, height: 85 };
const SUPPORT_TYPES: SupportType[] = ["forex", "plexiglass"];
// Une lettre doit rester bien plus grande que l'épaisseur du tube (1cm) pour
// que celui-ci reste lisible en la traçant : 12cm de haut par défaut, avec
// une plage d'agrandissement/réduction qui ne redescend jamais en dessous
// d'une taille où le tube engloutirait la forme des lettres.
const DEFAULT_TEXT_FONT_SIZE_PX = 12 * CM_TO_PX;
const MIN_TEXT_FONT_SIZE_PX = 6 * CM_TO_PX;
const MAX_TEXT_FONT_SIZE_PX = 40 * CM_TO_PX;

const NEON_COLORS = [
  { name: "Cyan", value: "#00FFFF" },
  { name: "Magenta", value: "#FF00FF" },
  { name: "Jaune", value: "#FFFF00" },
  { name: "Blanc", value: "#FFFFFF" },
  { name: "Vert", value: "#00FF00" },
  { name: "Rouge", value: "#FF0000" },
  { name: "Bleu", value: "#0080FF" },
  { name: "Rose", value: "#ff0080" },
];

interface AdminColor {
  _id: string;
  name: string;
  hex: string;
}

// Sauvegarde locale automatique du design en cours (localStorage) — restaurée
// au montage pour ne pas perdre le travail sur un rafraîchissement de page.
const AUTOSAVE_KEY = "neonzart-configurator-draft";
const AUTOSAVE_DELAY_MS = 400;

/** Intensité 0-100 → flou d'ombre canvas. Au défaut (60), retrouve le blur historique de ~20px. */
function glowBlurPx(glowIntensity: number | undefined): number {
  return ((glowIntensity ?? DEFAULT_GLOW_INTENSITY) / 100) * 33;
}

/**
 * Couleur d'un tube néon ÉTEINT (aperçu jour) : un tube LED hors tension
 * garde une teinte laiteuse et pâle de sa couleur — mélange vers le blanc,
 * sans halo. Utilisé uniquement pour le rendu, jamais persisté.
 */
function toUnlitColor(hex: string): string {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = parseInt(full, 16);
  if (full.length !== 6 || Number.isNaN(n)) return "#d6d3d1";
  const mix = (c: number) => Math.round(c * 0.45 + 255 * 0.55);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

/**
 * Réduit un masque binaire (glyphe plein) à sa ligne centrale (squelette) —
 * algorithme de Zhang-Suen, deux sous-itérations qui érodent les pixels de
 * bord tant qu'ils ne cassent pas la connectivité du tracé. Nécessaire car
 * TOUT contour de police (aussi fine soit-elle) épaissit avec la taille de
 * police ; seul le squelette permet un tube à épaisseur réellement fixe,
 * quelle que soit la taille du texte ou la police choisie.
 */
function zhangSuenThinning(binary: Uint8Array, width: number, height: number): Uint8Array {
  const img = binary.slice();
  const get = (x: number, y: number) => (x < 0 || y < 0 || x >= width || y >= height ? 0 : img[y * width + x]);

  let changed = true;
  while (changed) {
    changed = false;
    for (const step of [0, 1]) {
      const toClear: number[] = [];
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          if (!get(x, y)) continue;
          const p2 = get(x, y - 1);
          const p3 = get(x + 1, y - 1);
          const p4 = get(x + 1, y);
          const p5 = get(x + 1, y + 1);
          const p6 = get(x, y + 1);
          const p7 = get(x - 1, y + 1);
          const p8 = get(x - 1, y);
          const p9 = get(x - 1, y - 1);
          const neighbors = [p2, p3, p4, p5, p6, p7, p8, p9];
          const b = neighbors.reduce((a, v) => a + v, 0);
          if (b < 2 || b > 6) continue;
          let a = 0;
          for (let i = 0; i < 8; i++) if (neighbors[i] === 0 && neighbors[(i + 1) % 8] === 1) a++;
          if (a !== 1) continue;
          if (step === 0) {
            if (p2 * p4 * p6 !== 0 || p4 * p6 * p8 !== 0) continue;
          } else {
            if (p2 * p4 * p8 !== 0 || p2 * p6 * p8 !== 0) continue;
          }
          toClear.push(y * width + x);
        }
      }
      if (toClear.length > 0) {
        changed = true;
        for (const idx of toClear) img[idx] = 0;
      }
    }
  }
  return img;
}

/** Épaissit un masque (ici : le squelette) de `radiusPx` dans toutes les directions — donne au tracé du squelette l'épaisseur fixe du tube néon. */
function dilateMask(mask: Uint8Array, width: number, height: number, radiusPx: number): Uint8Array {
  const out = new Uint8Array(width * height);
  const r = Math.ceil(radiusPx);
  const r2 = radiusPx * radiusPx;
  const offsets: Array<[number, number]> = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r2) offsets.push([dx, dy]);
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      for (const [dx, dy] of offsets) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < width && ny < height) out[ny * width + nx] = 1;
      }
    }
  }
  return out;
}

const GLYPH_RASTER_PADDING = Math.ceil(NEON_WIDTH_PX * 1.5) + 4;

/**
 * Facteur de suréchantillonnage du glyphe avant squelettisation : rastériser
 * au pixel près (1x) perd la position sous-pixel du tracé réel de la police,
 * ce qui produit un squelette grossier peu fidèle (surtout pour les scripts
 * fins). Réduit pour les très grandes tailles afin de garder un temps de
 * calcul raisonnable (le coût de la squelettisation croît avec la surface).
 */
function glyphSupersampleFactor(fontSizePx: number): number {
  if (fontSizePx <= 200) return 3;
  if (fontSizePx <= 300) return 2;
  return 1;
}

/** Dessine le texte plein (glyphes de la police) dans un canvas hors-écran, pour en extraire un masque binaire (alpha > seuil). */
function rasterizeGlyphAlpha(content: string, fontFamily: string, fontSizePx: number, supersample: number) {
  const scaledFontSizePx = fontSizePx * supersample;
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.textAlign = "center";
  measure.textBaseline = "middle";
  measure.font = `${scaledFontSizePx}px "${fontFamily}"`;
  const metrics = measure.measureText(content);
  // Mesure réelle de l'encre du glyphe (boîte englobante), pas une estimation
  // approximative par caractère — sous-évaluer rogne les jambages/boucles des
  // scripts cursifs (lettres liées, plus larges que largeur*nb caractères).
  const halfWidth = Math.max(metrics.actualBoundingBoxLeft ?? 0, metrics.actualBoundingBoxRight ?? 0, scaledFontSizePx * 0.6);
  const halfHeight = Math.max((metrics.actualBoundingBoxAscent ?? 0) + (metrics.actualBoundingBoxDescent ?? 0), scaledFontSizePx) / 2;
  const padding = GLYPH_RASTER_PADDING * supersample;
  const width = Math.ceil(halfWidth * 2) + padding * 2;
  const height = Math.ceil(halfHeight * 2) + padding * 2;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${scaledFontSizePx}px "${fontFamily}"`;
  ctx.fillText(content, width / 2, height / 2);
  const imageData = ctx.getImageData(0, 0, width, height);
  const binary = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) binary[i] = imageData.data[i * 4 + 3] > 127 ? 1 : 0;
  return { binary, width, height };
}

/** Construit (et met en cache) le tube néon d'un texte : squelette du glyphe, dilaté à l'épaisseur fixe du tube — un canvas blanc/alpha, à teinter à la couleur voulue au moment du rendu. */
function buildTextTubeStencil(content: string, fontFamily: string, fontSizePx: number, tubeWidthPx: number): HTMLCanvasElement {
  const supersample = glyphSupersampleFactor(fontSizePx);
  const { binary, width, height } = rasterizeGlyphAlpha(content, fontFamily, fontSizePx, supersample);
  const skeleton = zhangSuenThinning(binary, width, height);
  const dilated = dilateMask(skeleton, width, height, (tubeWidthPx * supersample) / 2);

  const bigCanvas = document.createElement("canvas");
  bigCanvas.width = width;
  bigCanvas.height = height;
  const bigCtx = bigCanvas.getContext("2d")!;
  const imageData = bigCtx.createImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    if (dilated[i]) {
      imageData.data[i * 4] = 255;
      imageData.data[i * 4 + 1] = 255;
      imageData.data[i * 4 + 2] = 255;
      imageData.data[i * 4 + 3] = 255;
    }
  }
  bigCtx.putImageData(imageData, 0, 0);

  if (supersample === 1) return bigCanvas;

  // Sous-échantillonnage lissé vers la résolution finale : adoucit les
  // marches d'escalier du masque suréchantillonné en un tube au trait net.
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width / supersample);
  canvas.height = Math.round(height / supersample);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bigCanvas, 0, 0, width, height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function ConfiguratorWorkspace({
  initialColors = [],
  pricingSettings = DEFAULT_PRICING_SETTINGS,
}: {
  initialColors?: AdminColor[];
  pricingSettings?: PricingSettings;
}) {
  const t = useTranslations("Configurator");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  // Cache des tubes néon de texte (squelette dilaté), par contenu/police/taille
  // — coûteux à calculer (amincissement), pas besoin de le refaire à chaque
  // frame tant que ces trois valeurs ne changent pas (drag/couleur : gratuits).
  const textTubeCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const tintScratchRef = useRef<HTMLCanvasElement | null>(null);

  // Palette gérée par l'admin (voir /admin/couleurs) — repli sur la palette néon
  // par défaut si l'admin n'a encore configuré aucune couleur.
  const palette = initialColors.length > 0 ? initialColors.map((c) => ({ name: c.name, value: c.hex })) : NEON_COLORS;

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [history, setHistory] = useState<CanvasElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [currentTool, setCurrentTool] = useState<"draw" | "text" | "select" | "line">("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentColor, setCurrentColor] = useState(palette[0].value);

  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [currentDrawPoints, setCurrentDrawPoints] = useState<Point[]>([]);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [lineStart, setLineStart] = useState<Point | null>(null);

  const [textInput, setTextInput] = useState("");
  const [textFontId, setTextFontId] = useState<NeonFontId>(NEON_FONTS[0].id);
  const [canvasWidth, setCanvasWidth] = useState(50);
  const [canvasHeight, setCanvasHeight] = useState(40);
  const [support, setSupport] = useState<SupportType>("forex");

  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapDistance, setSnapDistance] = useState(25);
  const [edgePoints, setEdgePoints] = useState<Point[]>([]);
  const [spatialGrid, setSpatialGrid] = useState<Map<string, Point[]>>(new Map());
  const [showEdges, setShowEdges] = useState(false);
  const [edgeThreshold, setEdgeThreshold] = useState(50);
  const [currentSnapPoint, setCurrentSnapPoint] = useState<Point | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Aperçu jour (enseigne éteinte, fond clair) vs nuit (allumée, fond sombre).
  const [previewMode, setPreviewMode] = useState<"night" | "day">("night");
  // Phase de l'animation de clignotement (bascule via setInterval quand au
  // moins un élément a blink: true et que l'aperçu est en mode nuit).
  const [blinkPhase, setBlinkPhase] = useState(true);

  const widthPx = canvasWidth * CM_TO_PX;
  const heightPx = canvasHeight * CM_TO_PX;

  const calculateLength = (points: Point[]): number => {
    let length = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length / CM_TO_PX;
  };

  const calculateLineLength = (x1: number, y1: number, x2: number, y2: number): number => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy) / CM_TO_PX;
  };

  const calculateRectLength = (width: number, height: number): number => {
    return (2 * (width + height)) / CM_TO_PX;
  };

  const calculateCircleLength = (radius: number): number => {
    return (2 * Math.PI * radius) / CM_TO_PX;
  };

  const estimateTextLength = (text: string, fontSize: number): number => {
    const textWidthPx = text.length * fontSize * 0.6;
    return textWidthPx / CM_TO_PX;
  };

  const buildSpatialGrid = (points: Point[], cellSize: number = 30) => {
    const grid = new Map<string, Point[]>();
    points.forEach((point) => {
      const cellX = Math.floor(point.x / cellSize);
      const cellY = Math.floor(point.y / cellSize);
      const key = `${cellX},${cellY}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key)!.push(point);
    });
    return grid;
  };

  const detectEdges = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imgRatio = Math.min((canvas.width - 40) / img.width, (canvas.height - 40) / img.height) * imageScale;
    const imgWidth = Math.floor(img.width * imgRatio);
    const imgHeight = Math.floor(img.height * imgRatio);
    const imgX = Math.floor((canvas.width - imgWidth) / 2);
    const imgY = Math.floor((canvas.height - imgHeight) / 2);

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = imgWidth;
    tempCanvas.height = imgHeight;
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(img, 0, 0, imgWidth, imgHeight);
    const imageData = ctx.getImageData(0, 0, imgWidth, imgHeight);
    const data = imageData.data;

    // Masque binaire "encre" (pixel sombre = trait) plutôt qu'un contour de
    // gradient (Sobel) — un contour marque les DEUX bords de chaque trait,
    // ce qui produisait deux lignes parallèles au lieu d'une seule. Le
    // squelette (même algorithme que pour le texte, voir zhangSuenThinning
    // plus haut) réduit chaque trait à sa ligne centrale unique.
    const binary = new Uint8Array(imgWidth * imgHeight);
    for (let i = 0; i < data.length; i += 4) {
      const luminance = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      binary[i / 4] = luminance < edgeThreshold ? 1 : 0;
    }

    const skeleton = zhangSuenThinning(binary, imgWidth, imgHeight);

    const edges: Point[] = [];
    for (let y = 0; y < imgHeight; y++) {
      for (let x = 0; x < imgWidth; x++) {
        if (skeleton[y * imgWidth + x]) edges.push({ x: x + imgX, y: y + imgY });
      }
    }

    setEdgePoints(edges);
    setSpatialGrid(buildSpatialGrid(edges, snapDistance));
  };

  const snapToEdge = (point: Point): Point => {
    if (!snapEnabled || edgePoints.length === 0) {
      setCurrentSnapPoint(null);
      return point;
    }

    const cellSize = snapDistance;
    const cellX = Math.floor(point.x / cellSize);
    const cellY = Math.floor(point.y / cellSize);

    let closestPoint = point;
    let minDistance = snapDistance;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const key = `${cellX + dx},${cellY + dy}`;
        const cellPoints = spatialGrid.get(key);
        if (cellPoints) {
          for (const edge of cellPoints) {
            const dist = Math.sqrt((edge.x - point.x) ** 2 + (edge.y - point.y) ** 2);
            if (dist < minDistance) {
              minDistance = dist;
              closestPoint = edge;
            }
          }
        }
      }
    }

    setCurrentSnapPoint(closestPoint !== point ? closestPoint : null);
    return closestPoint;
  };

  const scaleElementsList = (oldW: number, oldH: number, newW: number, newH: number): CanvasElement[] => {
    const scaleX = (newW * CM_TO_PX) / (oldW * CM_TO_PX);
    const scaleY = (newH * CM_TO_PX) / (oldH * CM_TO_PX);

    return elements.map((el) => {
      if (el.type === "text") {
        // Échelle uniforme (le plus petit facteur des deux axes) pour la taille de
        // police : appliquer scaleX/scaleY indépendamment étirerait les lettres au
        // lieu de simplement les agrandir, ce qui les déforme visuellement.
        const uniformScale = Math.min(scaleX, scaleY);
        return {
          ...el,
          x: el.x * scaleX,
          y: el.y * scaleY,
          fontSize: Math.max(MIN_TEXT_FONT_SIZE_PX, Math.min(MAX_TEXT_FONT_SIZE_PX, el.fontSize * uniformScale)),
        };
      } else if (el.type === "draw") {
        return { ...el, points: el.points.map((p) => ({ x: p.x * scaleX, y: p.y * scaleY })) };
      } else if (el.type === "line") {
        return { ...el, x1: el.x1 * scaleX, y1: el.y1 * scaleY, x2: el.x2 * scaleX, y2: el.y2 * scaleY };
      } else if (el.type === "rect" || el.type === "circle") {
        return {
          ...el,
          x: el.x * scaleX,
          y: el.y * scaleY,
          width: el.width ? el.width * scaleX : undefined,
          height: el.height ? el.height * scaleY : undefined,
          radius: el.radius ? el.radius * Math.min(scaleX, scaleY) : undefined,
        };
      }
      return el;
    });
  };

  const scaleEdgePoints = (oldW: number, oldH: number, newW: number, newH: number): Point[] => {
    const scaleX = (newW * CM_TO_PX) / (oldW * CM_TO_PX);
    const scaleY = (newH * CM_TO_PX) / (oldH * CM_TO_PX);
    return edgePoints.map((p) => ({ x: p.x * scaleX, y: p.y * scaleY }));
  };

  const saveToHistory = (newElements: CanvasElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newElements]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setElements(newElements);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
      setSelectedId(null);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
      setSelectedId(null);
    }
  };

  const totalLength = useMemo(() => {
    return elements.reduce((sum, el) => {
      if (el.type === "draw") return sum + calculateLength(el.points);
      if (el.type === "text") return sum + estimateTextLength(el.content, el.fontSize);
      if (el.type === "line") return sum + calculateLineLength(el.x1, el.y1, el.x2, el.y2);
      if (el.type === "rect" && el.width && el.height) return sum + calculateRectLength(el.width, el.height);
      if (el.type === "circle" && el.radius) return sum + calculateCircleLength(el.radius);
      return sum;
    }, 0);
  }, [elements]);

  // Le clignotement (n'importe quel élément) requiert un contrôleur multi-zone
  // physique — même règle que le serveur (route /api/customize/designs), qui
  // re-dérive lui-même ce surcoût des éléments, jamais du prix envoyé.
  const hasBlinkElements = elements.some((el) => el.blink);
  const controllerSurcharge = hasBlinkElements ? pricingSettings.controllerOptionPrice : 0;
  const supportSurfaceCm2 = canvasWidth * canvasHeight;
  const supportSurcharge = Math.round(supportSurfaceCm2 * pricingSettings.supportPricePerCm2[support]);
  const estimatedPrice = Math.round(totalLength * pricingSettings.pricePerCmOfTube) + controllerSurcharge + supportSurcharge;

  function handleSnapDistanceChange(value: number) {
    setSnapDistance(value);
    if (edgePoints.length > 0) setSpatialGrid(buildSpatialGrid(edgePoints, value));
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ne pas voler les touches quand l'utilisateur tape dans un champ
      // (sinon Suppr dans l'input texte effaçait l'élément sélectionné).
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (e.key === "Delete" && selectedId) {
        deleteSelected();
        return;
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        setCurrentTool("select");
        return;
      }
      if (selectedId && (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        // Déplacement fin au pixel ; Maj = pas de 1 cm (grille métier).
        const step = e.shiftKey ? CM_TO_PX : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        nudgeSelected(dx, dy);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, historyIndex, history, elements]);

  // Restauration du brouillon local (une seule fois, au montage) — l'image de
  // référence n'est pas persistée (data URL trop lourde), seulement le design.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { elements?: unknown; canvasWidth?: unknown; canvasHeight?: unknown };
      if (!Array.isArray(draft.elements) || draft.elements.length === 0) return;
      const restored = draft.elements.filter(
        (el): el is CanvasElement =>
          !!el && typeof el === "object" && "type" in el && ["text", "draw", "line", "rect", "circle"].includes((el as { type: string }).type)
      );
      if (restored.length === 0) return;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pattern standard : hydratation depuis localStorage (indisponible au rendu serveur), une seule fois au montage
      setElements(restored);
      setHistory([[], restored]);
      setHistoryIndex(1);
      if (typeof draft.canvasWidth === "number") setCanvasWidth(Math.max(10, Math.min(MAX_DIMENSIONS.width, Math.round(draft.canvasWidth))));
      if (typeof draft.canvasHeight === "number") setCanvasHeight(Math.max(10, Math.min(MAX_DIMENSIONS.height, Math.round(draft.canvasHeight))));
      toast.info(t("autosave.restored"));
    } catch {
      // Brouillon corrompu ou stockage indisponible : on repart de zéro.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sauvegarde locale automatique, légèrement différée pour ne pas écrire à
  // chaque point de dessin libre — un design vide supprime le brouillon.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        if (elements.length === 0) window.localStorage.removeItem(AUTOSAVE_KEY);
        else window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ elements, canvasWidth, canvasHeight }));
      } catch {
        // Stockage plein ou bloqué : l'atelier reste utilisable sans autosave.
      }
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [elements, canvasWidth, canvasHeight]);

  // Animation de clignotement — active seulement en aperçu nuit (une enseigne
  // éteinte ne clignote pas) et s'il y a au moins un élément blink. Pas besoin
  // de réinitialiser la phase à l'arrêt : elle n'est lue que pour les éléments
  // blink en mode nuit, et l'intervalle la fait rebasculer en ≤600ms.
  useEffect(() => {
    if (!hasBlinkElements || previewMode === "day") return;
    const id = window.setInterval(() => setBlinkPhase((p) => !p), 600);
    return () => window.clearInterval(id);
  }, [hasBlinkElements, previewMode]);

  useEffect(() => {
    // Canvas 2D ne suit pas font-display: swap comme le HTML — sans ce
    // chargement explicite, ctx.font utilise la police de secours tant
    // qu'aucun autre repaint n'est déclenché après le chargement réel.
    Promise.all(NEON_FONTS.map((font) => document.fonts.load(`32px "${NEON_FONT_FAMILIES[font.id]}"`)))
      .then(() => {
        // Un texte rendu avant que sa police ne finisse de charger a été
        // tracé (et mis en cache) avec la police de secours du navigateur —
        // vider le cache force à reconstruire le tube néon avec la vraie
        // police une fois celle-ci disponible.
        textTubeCacheRef.current.clear();
        drawCanvas();
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    drawCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, imageScale, elements, canvasWidth, canvasHeight, selectedId, currentDrawPoints, showEdges, edgePoints, currentSnapPoint, lineStart, previewMode, blinkPhase]);

  function getObjectBounds(el: CanvasElement) {
    if (el.type === "draw") {
      const xs = el.points.map((p) => p.x);
      const ys = el.points.map((p) => p.y);
      return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
    }
    if (el.type === "line") {
      const minX = Math.min(el.x1, el.x2);
      const minY = Math.min(el.y1, el.y2);
      return { x: minX, y: minY, width: Math.abs(el.x2 - el.x1), height: Math.abs(el.y2 - el.y1) };
    }
    if ("x" in el && "y" in el) {
      if (el.type === "text") {
        const textWidth = el.content.length * el.fontSize * 0.6;
        return { x: el.x - textWidth / 2, y: el.y - el.fontSize / 2, width: textWidth, height: el.fontSize };
      }
      if (el.type === "circle") {
        return { x: el.x - (el.radius || 0), y: el.y - (el.radius || 0), width: (el.radius || 0) * 2, height: (el.radius || 0) * 2 };
      }
      return { x: el.x, y: el.y, width: el.width || 100, height: el.height || 100 };
    }
    return null;
  }

  function getResizeHandles(el: CanvasElement): Point[] {
    const bounds = getObjectBounds(el);
    if (!bounds) return [];
    if (el.type === "line") {
      return [
        { x: el.x1, y: el.y1 },
        { x: el.x2, y: el.y2 },
      ];
    }
    return [
      { x: bounds.x - 10, y: bounds.y - 10 },
      { x: bounds.x + bounds.width + 10, y: bounds.y - 10 },
      { x: bounds.x + bounds.width + 10, y: bounds.y + bounds.height + 10 },
      { x: bounds.x - 10, y: bounds.y + bounds.height + 10 },
    ];
  }

  function getResizeHandleAtPoint(el: CanvasElement, pos: Point): string | null {
    const handles = getResizeHandles(el);
    const handleNames = el.type === "line" ? ["start", "end"] : ["tl", "tr", "br", "bl"];
    for (let i = 0; i < handles.length; i++) {
      const handle = handles[i];
      const dist = Math.sqrt((handle.x - pos.x) ** 2 + (handle.y - pos.y) ** 2);
      if (dist < 15) return handleNames[i];
    }
    return null;
  }

  function drawCanvas(opts?: { forceLit?: boolean }) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // forceLit : rendu "allumé, tout visible" pour la capture du preview
    // envoyé au backend, quel que soit le mode d'aperçu courant.
    const isDay = opts?.forceLit ? false : previewMode === "day";
    const phase = opts?.forceLit ? true : blinkPhase;

    canvas.width = widthPx;
    canvas.height = heightPx;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = isDay ? "#e7e5e4" : "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = isDay ? "#d6d3d1" : "#1a1a1a";
    ctx.lineWidth = 1;
    for (let i = 0; i <= canvasWidth; i += 10) {
      ctx.beginPath();
      ctx.moveTo(i * CM_TO_PX, 0);
      ctx.lineTo(i * CM_TO_PX, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i <= canvasHeight; i += 10) {
      ctx.beginPath();
      ctx.moveTo(0, i * CM_TO_PX);
      ctx.lineTo(canvas.width, i * CM_TO_PX);
      ctx.stroke();
    }

    if (image) {
      const imgRatio = Math.min((canvas.width - 40) / image.width, (canvas.height - 40) / image.height) * imageScale;
      const imgWidth = image.width * imgRatio;
      const imgHeight = image.height * imgRatio;
      const imgX = (canvas.width - imgWidth) / 2;
      const imgY = (canvas.height - imgHeight) / 2;
      ctx.globalAlpha = 0.3;
      ctx.drawImage(image, imgX, imgY, imgWidth, imgHeight);
      ctx.globalAlpha = 1.0;
    }

    if (showEdges && edgePoints.length > 0) {
      ctx.fillStyle = "#FF00FF";
      edgePoints.forEach((point) => {
        ctx.fillRect(point.x - 1, point.y - 1, 2, 2);
      });
    }

    elements.forEach((el) => {
      ctx.save();
      const isSelected = el.id === selectedId;

      // Couleur/halo selon le mode : allumé = couleur vive + halo réglable par
      // élément ; éteint (jour) = teinte laiteuse du tube, aucun halo. Un
      // élément clignotant en phase "off" reste faiblement visible (alpha
      // réduit) pour pouvoir continuer à le sélectionner.
      const renderColor = isDay ? toUnlitColor(el.color) : el.color;
      const blinkOff = !isDay && el.blink === true && !phase;
      const glow = isDay || blinkOff ? 0 : glowBlurPx(el.glowIntensity);
      if (blinkOff) ctx.globalAlpha = 0.15;

      if (el.rotation && "x" in el && "y" in el) {
        ctx.translate(el.x, el.y);
        ctx.rotate((el.rotation * Math.PI) / 180);
        ctx.translate(-el.x, -el.y);
      }

      if (el.type === "draw") {
        ctx.strokeStyle = renderColor;
        ctx.lineWidth = NEON_WIDTH_PX;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = renderColor;
        ctx.shadowBlur = glow;
        if (el.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(el.points[0].x, el.points[0].y);
          el.points.forEach((p) => ctx.lineTo(p.x, p.y));
          ctx.stroke();
        }
      } else if (el.type === "line") {
        ctx.strokeStyle = renderColor;
        ctx.lineWidth = NEON_WIDTH_PX;
        ctx.lineCap = "round";
        ctx.shadowColor = renderColor;
        ctx.shadowBlur = glow;
        ctx.beginPath();
        ctx.moveTo(el.x1, el.y1);
        ctx.lineTo(el.x2, el.y2);
        ctx.stroke();
      } else if (el.type === "text" && el.content) {
        // Trait du squelette du glyphe (pas son contour plein) : épaisseur
        // réellement fixe à toute taille et pour n'importe quelle police —
        // voir buildTextTubeStencil / zhangSuenThinning plus haut.
        const family = NEON_FONT_FAMILIES[el.fontId] ?? "sans-serif";
        const cacheKey = `${family}::${Math.round(el.fontSize)}::${el.content}`;
        let stencil = textTubeCacheRef.current.get(cacheKey);
        if (!stencil) {
          stencil = buildTextTubeStencil(el.content, family, el.fontSize, NEON_WIDTH_PX);
          textTubeCacheRef.current.set(cacheKey, stencil);
        }

        if (!tintScratchRef.current) tintScratchRef.current = document.createElement("canvas");
        const scratch = tintScratchRef.current;
        scratch.width = stencil.width;
        scratch.height = stencil.height;
        const sctx = scratch.getContext("2d")!;
        sctx.clearRect(0, 0, stencil.width, stencil.height);
        sctx.drawImage(stencil, 0, 0);
        sctx.globalCompositeOperation = "source-in";
        sctx.fillStyle = renderColor;
        sctx.fillRect(0, 0, stencil.width, stencil.height);
        sctx.globalCompositeOperation = "source-over";

        ctx.shadowColor = renderColor;
        ctx.shadowBlur = glow;
        ctx.drawImage(scratch, el.x - stencil.width / 2, el.y - stencil.height / 2);
      } else if (el.type === "rect" && el.width && el.height) {
        ctx.strokeStyle = renderColor;
        ctx.lineWidth = NEON_WIDTH_PX;
        ctx.shadowColor = renderColor;
        ctx.shadowBlur = glow;
        ctx.strokeRect(el.x, el.y, el.width, el.height);
      } else if (el.type === "circle" && el.radius) {
        ctx.strokeStyle = renderColor;
        ctx.lineWidth = NEON_WIDTH_PX;
        ctx.shadowColor = renderColor;
        ctx.shadowBlur = glow;
        ctx.beginPath();
        ctx.arc(el.x, el.y, el.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      if (isSelected) {
        const selectionColor = isDay ? "#0e7490" : "#00FFFF";
        ctx.strokeStyle = selectionColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        const bounds = getObjectBounds(el);
        if (bounds) {
          ctx.strokeRect(bounds.x - 10, bounds.y - 10, bounds.width + 20, bounds.height + 20);

          if (el.type === "rect" || el.type === "circle" || el.type === "line" || el.type === "text") {
            ctx.fillStyle = selectionColor;
            const handles = getResizeHandles(el);
            handles.forEach((handle) => {
              ctx.fillRect(handle.x - 5, handle.y - 5, 10, 10);
            });
          }
        }
        ctx.setLineDash([]);
      }

      ctx.restore();
    });

    if (isDrawing && currentDrawPoints.length >= 2) {
      ctx.save();
      const previewColor = isDay ? toUnlitColor(currentColor) : currentColor;
      ctx.strokeStyle = previewColor;
      ctx.lineWidth = NEON_WIDTH_PX;
      ctx.lineCap = "round";
      ctx.shadowColor = previewColor;
      ctx.shadowBlur = isDay ? 0 : glowBlurPx(undefined);
      ctx.beginPath();
      ctx.moveTo(currentDrawPoints[0].x, currentDrawPoints[0].y);
      currentDrawPoints.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.restore();
    }

    if (currentSnapPoint && snapEnabled && (isDrawing || currentTool === "line")) {
      ctx.save();
      ctx.strokeStyle = "#00FF00";
      ctx.fillStyle = "#00FF00";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(currentSnapPoint.x, currentSnapPoint.y, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(currentSnapPoint.x - 5, currentSnapPoint.y);
      ctx.lineTo(currentSnapPoint.x + 5, currentSnapPoint.y);
      ctx.moveTo(currentSnapPoint.x, currentSnapPoint.y - 5);
      ctx.lineTo(currentSnapPoint.x, currentSnapPoint.y + 5);
      ctx.stroke();
      ctx.restore();
    }
  }

  function getPosition(e: React.MouseEvent | React.TouchEvent): Point {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const touchEvent = e as React.TouchEvent;
    if (touchEvent.touches && touchEvent.touches[0]) {
      return {
        x: ((touchEvent.touches[0].clientX - rect.left) / rect.width) * canvas.width,
        y: ((touchEvent.touches[0].clientY - rect.top) / rect.height) * canvas.height,
      };
    }

    const mouseEvent = e as React.MouseEvent;
    return {
      x: ((mouseEvent.clientX - rect.left) / rect.width) * canvas.width,
      y: ((mouseEvent.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function isPointInElement(pos: Point, el: CanvasElement): boolean {
    const bounds = getObjectBounds(el);
    if (!bounds) return false;
    const padding = 15;
    return pos.x >= bounds.x - padding && pos.x <= bounds.x + bounds.width + padding && pos.y >= bounds.y - padding && pos.y <= bounds.y + bounds.height + padding;
  }

  function handlePointerDown(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const pos = getPosition(e);

    if (currentTool === "text") {
      if (textInput.trim()) {
        const newText: TextElement = {
          id: Date.now().toString(),
          type: "text",
          x: pos.x,
          y: pos.y,
          content: textInput,
          color: currentColor,
          fontSize: DEFAULT_TEXT_FONT_SIZE_PX,
          fontId: textFontId,
          rotation: 0,
        };
        saveToHistory([...elements, newText]);
        setTextInput("");
        setSelectedId(newText.id);
      }
      return;
    }

    if (currentTool === "line") {
      if (!lineStart) {
        setLineStart(snapToEdge(pos));
      }
      return;
    }

    if (currentTool === "draw") {
      setIsDrawing(true);
      setCurrentDrawPoints([snapToEdge(pos)]);
      return;
    }

    if (currentTool === "select") {
      if (selectedId) {
        const selectedEl = elements.find((el) => el.id === selectedId);
        if (selectedEl) {
          const handle = getResizeHandleAtPoint(selectedEl, pos);
          if (handle) {
            setIsResizing(true);
            setResizeHandle(handle);
            return;
          }
        }
      }

      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (isPointInElement(pos, el)) {
          setSelectedId(el.id);
          setIsDragging(true);
          if ("x" in el && "y" in el) {
            setDragOffset({ x: pos.x - el.x, y: pos.y - el.y });
          } else if (el.type === "line") {
            const midX = (el.x1 + el.x2) / 2;
            const midY = (el.y1 + el.y2) / 2;
            setDragOffset({ x: pos.x - midX, y: pos.y - midY });
          }
          return;
        }
      }
      setSelectedId(null);
    }
  }

  function handlePointerMove(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const pos = getPosition(e);

    if (currentTool === "line" && lineStart) return;

    if (isDrawing && currentTool === "draw") {
      setCurrentDrawPoints((prev) => [...prev, snapToEdge(pos)]);
      return;
    }

    if (isResizing && selectedId) {
      const newElements = elements.map((el) => {
        if (el.id === selectedId) {
          if (el.type === "rect" && el.width && el.height) {
            const newEl = { ...el };
            if (resizeHandle === "br") {
              newEl.width = Math.max(20, pos.x - el.x);
              newEl.height = Math.max(20, pos.y - el.y);
            } else if (resizeHandle === "tr") {
              newEl.width = Math.max(20, pos.x - el.x);
              const oldBottom = el.y + el.height;
              newEl.y = pos.y;
              newEl.height = Math.max(20, oldBottom - pos.y);
            } else if (resizeHandle === "bl") {
              const oldRight = el.x + el.width;
              newEl.x = pos.x;
              newEl.width = Math.max(20, oldRight - pos.x);
              newEl.height = Math.max(20, pos.y - el.y);
            } else if (resizeHandle === "tl") {
              const oldRight = el.x + el.width;
              const oldBottom = el.y + el.height;
              newEl.x = pos.x;
              newEl.y = pos.y;
              newEl.width = Math.max(20, oldRight - pos.x);
              newEl.height = Math.max(20, oldBottom - pos.y);
            }
            return newEl;
          } else if (el.type === "circle" && el.radius) {
            const newRadius = Math.sqrt((pos.x - el.x) ** 2 + (pos.y - el.y) ** 2);
            return { ...el, radius: Math.max(10, newRadius) };
          } else if (el.type === "line") {
            if (resizeHandle === "start") return { ...el, x1: pos.x, y1: pos.y };
            if (resizeHandle === "end") return { ...el, x2: pos.x, y2: pos.y };
          } else if (el.type === "text") {
            // Un seul facteur d'échelle uniforme dérivé de la distance au centre —
            // jamais width/height indépendants, sinon les lettres s'étirent et se
            // déforment au lieu de simplement grandir.
            const bounds = getObjectBounds(el);
            if (!bounds) return el;
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;
            const origDist = Math.hypot(bounds.width / 2, bounds.height / 2);
            const newDist = Math.hypot(pos.x - cx, pos.y - cy);
            const scaleFactor = origDist > 0 ? newDist / origDist : 1;
            return { ...el, fontSize: Math.max(MIN_TEXT_FONT_SIZE_PX, Math.min(MAX_TEXT_FONT_SIZE_PX, el.fontSize * scaleFactor)) };
          }
        }
        return el;
      });
      setElements(newElements);
      return;
    }

    if (isDragging && selectedId) {
      const newElements = elements.map((el) => {
        if (el.id === selectedId) {
          if (el.type === "draw") {
            const dx = pos.x - (el.points[0]?.x || 0);
            const dy = pos.y - (el.points[0]?.y || 0);
            return { ...el, points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
          } else if (el.type === "line") {
            const midX = (el.x1 + el.x2) / 2;
            const midY = (el.y1 + el.y2) / 2;
            const dx = pos.x - dragOffset.x - midX;
            const dy = pos.y - dragOffset.y - midY;
            return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy };
          } else if ("x" in el && "y" in el) {
            return { ...el, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y };
          }
        }
        return el;
      });
      setElements(newElements);
    }

    if ((currentTool === "draw" || currentTool === "line") && !isDrawing) {
      snapToEdge(pos);
    }
  }

  function handlePointerUp(e: React.MouseEvent | React.TouchEvent) {
    const pos = getPosition(e);

    if (currentTool === "line" && lineStart) {
      const snappedPos = snapToEdge(pos);
      const newLine: LineElement = {
        id: Date.now().toString(),
        type: "line",
        x1: lineStart.x,
        y1: lineStart.y,
        x2: snappedPos.x,
        y2: snappedPos.y,
        color: currentColor,
      };
      saveToHistory([...elements, newLine]);
      setLineStart(null);
      return;
    }

    if (isDrawing && currentDrawPoints.length >= 2) {
      const newDraw: DrawElement = { id: Date.now().toString(), type: "draw", points: currentDrawPoints, color: currentColor };
      saveToHistory([...elements, newDraw]);
      setCurrentDrawPoints([]);
    }

    if (isDragging || isResizing) {
      saveToHistory([...elements]);
    }

    setIsDrawing(false);
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    setCurrentSnapPoint(null);
  }

  function addText() {
    if (!textInput.trim()) return;
    const newText: TextElement = {
      id: Date.now().toString(),
      type: "text",
      x: widthPx / 2,
      y: heightPx / 2,
      content: textInput,
      color: currentColor,
      fontSize: DEFAULT_TEXT_FONT_SIZE_PX,
      fontId: textFontId,
      rotation: 0,
    };
    saveToHistory([...elements, newText]);
    setTextInput("");
    setSelectedId(newText.id);
    setCurrentTool("select");
  }

  function addShape(type: "rect" | "circle") {
    const size = 100;
    const newShape: ShapeElement = {
      id: Date.now().toString(),
      type,
      color: currentColor,
      x: widthPx / 2 - size / 2,
      y: heightPx / 2 - size / 2,
      ...(type === "rect" ? { width: size, height: size } : { radius: size / 2 }),
      rotation: 0,
    };
    saveToHistory([...elements, newShape]);
    setSelectedId(newShape.id);
  }

  function rotateSelected() {
    if (!selectedId) return;
    const newElements = elements.map((el) => (el.id === selectedId && "rotation" in el ? { ...el, rotation: ((el.rotation || 0) + 45) % 360 } : el));
    saveToHistory(newElements);
  }

  function scaleSelected(scale: number) {
    if (!selectedId) return;
    const newElements = elements.map((el) => {
      if (el.id !== selectedId) return el;

      if (el.type === "text") return { ...el, fontSize: Math.max(MIN_TEXT_FONT_SIZE_PX, Math.min(MAX_TEXT_FONT_SIZE_PX, el.fontSize * scale)) };
      if (el.type === "rect" && el.width && el.height) return { ...el, width: el.width * scale, height: el.height * scale };
      if (el.type === "circle" && el.radius) return { ...el, radius: el.radius * scale };

      // Dessin libre et ligne : pas de largeur/hauteur propre, on met à
      // l'échelle les points/extrémités autour du centre de l'élément.
      const bounds = getObjectBounds(el);
      if (!bounds) return el;
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      const scalePoint = (p: Point): Point => ({ x: cx + (p.x - cx) * scale, y: cy + (p.y - cy) * scale });

      if (el.type === "draw") return { ...el, points: el.points.map(scalePoint) };
      if (el.type === "line") {
        const p1 = scalePoint({ x: el.x1, y: el.y1 });
        const p2 = scalePoint({ x: el.x2, y: el.y2 });
        return { ...el, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
      }
      return el;
    });
    saveToHistory(newElements);
  }

  function deleteSelected() {
    if (!selectedId) return;
    saveToHistory(elements.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  }

  function duplicateSelected() {
    const el = elements.find((e) => e.id === selectedId);
    if (!el) return;
    const OFFSET = 20;
    // Suffixe aléatoire : Date.now() seul peut collisionner sur des
    // duplications rapides (Ctrl+D maintenu).
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let copy: CanvasElement;
    if (el.type === "draw") {
      copy = { ...el, id, points: el.points.map((p) => ({ x: p.x + OFFSET, y: p.y + OFFSET })) };
    } else if (el.type === "line") {
      copy = { ...el, id, x1: el.x1 + OFFSET, y1: el.y1 + OFFSET, x2: el.x2 + OFFSET, y2: el.y2 + OFFSET };
    } else {
      copy = { ...el, id, x: el.x + OFFSET, y: el.y + OFFSET };
    }
    saveToHistory([...elements, copy]);
    setSelectedId(id);
  }

  function nudgeSelected(dx: number, dy: number) {
    if (!selectedId) return;
    const newElements = elements.map((el) => {
      if (el.id !== selectedId) return el;
      if (el.type === "draw") return { ...el, points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
      if (el.type === "line") return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy };
      return { ...el, x: el.x + dx, y: el.y + dy };
    });
    saveToHistory(newElements);
  }

  // Mise à jour "live" du halo pendant le drag du slider (sans polluer
  // l'historique), l'entrée n'est poussée qu'au relâchement (commit).
  function setSelectedGlow(value: number) {
    if (!selectedId) return;
    setElements(elements.map((el) => (el.id === selectedId ? { ...el, glowIntensity: value } : el)));
  }

  function commitSelectedGlow() {
    saveToHistory([...elements]);
  }

  function toggleSelectedBlink() {
    if (!selectedId) return;
    saveToHistory(elements.map((el) => (el.id === selectedId ? { ...el, blink: !el.blink } : el)));
  }

  function handleClear() {
    if (confirm(t("errors.confirmClearAll"))) {
      saveToHistory([]);
      setSelectedId(null);
    }
  }

  function handleExport() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `neon-${canvasWidth}x${canvasHeight}cm-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        setImageScale(1);
        setImage(img);
        detectEdges(img);
      };
    };
    reader.readAsDataURL(file);
  }

  function handleImageScaleChange(scale: number) {
    setImageScale(scale);
    if (image) detectEdges(image);
  }

  function handleRemoveImage() {
    setImage(null);
    setImageScale(1);
    setEdgePoints([]);
    setSpatialGrid(new Map());
    setShowEdges(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDimensionChange(dimension: "width" | "height", value: number) {
    const newValue = Math.max(10, Math.min(MAX_DIMENSIONS[dimension], value));

    const oldWidth = canvasWidth;
    const oldHeight = canvasHeight;

    const newDimensions = {
      width: dimension === "width" ? newValue : canvasWidth,
      height: dimension === "height" ? newValue : canvasHeight,
    };

    if (elements.length > 0) {
      const scaledElements = scaleElementsList(oldWidth, oldHeight, newDimensions.width, newDimensions.height);
      setElements(scaledElements);
      saveToHistory(scaledElements);
    }

    if (edgePoints.length > 0) {
      const scaledEdges = scaleEdgePoints(oldWidth, oldHeight, newDimensions.width, newDimensions.height);
      setEdgePoints(scaledEdges);
      setSpatialGrid(buildSpatialGrid(scaledEdges, snapDistance));
    }

    setCanvasWidth(newDimensions.width);
    setCanvasHeight(newDimensions.height);
    setSelectedId(null);
  }

  function deriveSourceType(): "image" | "text" | "draw" | "mixed" {
    const types = new Set(elements.map((e) => e.type));
    if (types.size === 1 && types.has("text")) return "text";
    if (types.size === 1 && types.has("draw")) return "draw";
    return "mixed";
  }

  async function handleContinueToQuote() {
    if (elements.length === 0) {
      toast.error(t("errors.createFirst"));
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setSubmitting(true);
    try {
      // Capture toujours l'enseigne allumée (et tous les éléments visibles,
      // même ceux en phase "off" du clignotement), quel que soit l'aperçu.
      drawCanvas({ forceLit: true });
      const previewImageUrl = canvas.toDataURL("image/png");
      drawCanvas();
      const pxToCm = 1 / CM_TO_PX;

      const res = await fetch("/api/customize/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: deriveSourceType(),
          elements: elements.map((el) => ({ ...el, rotation: "rotation" in el ? el.rotation ?? 0 : 0 })),
          previewImageUrl,
          dimensions: { widthCm: canvasWidth, heightCm: canvasHeight },
          pxToCmRatio: pxToCm,
          support,
          hasRemote: false,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? t("errors.saveFailed"));
      }

      const design = await res.json();
      try {
        window.localStorage.removeItem(AUTOSAVE_KEY);
      } catch {
        // Rien de bloquant : le brouillon local sera simplement ré-écrasé.
      }
      router.push({
        pathname: "/checkout",
        query: { type: "custom", id: design._id, name: t("customSignName"), price: String(estimatedPrice) },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  const selectedElement = elements.find((el) => el.id === selectedId);

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            <span className="tube-dash" aria-hidden />
            {t("eyebrow")}
          </p>
          <h1 className="mb-4 font-display text-3xl font-bold uppercase tracking-[0.03em] sm:text-4xl">{t("title")}</h1>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setCurrentTool("select")} variant={currentTool === "select" ? "default" : "outline"} size="sm">
              <Move size={18} />
              {t("tools.select")}
            </Button>

            <Button onClick={() => setCurrentTool("draw")} variant={currentTool === "draw" ? "default" : "outline"} size="sm">
              <Pencil size={18} />
              {t("tools.draw")}
            </Button>

            <Button onClick={() => setCurrentTool("line")} variant={currentTool === "line" ? "default" : "outline"} size="sm">
              <Minus size={18} />
              {t("tools.line")}
            </Button>

            {image && (
              <Button onClick={() => setSnapEnabled(!snapEnabled)} variant={snapEnabled ? "default" : "outline"} size="sm">
                <Target size={18} />
                {snapEnabled ? t("tools.snapOn") : t("tools.snapOff")}
              </Button>
            )}

            <Button onClick={() => setPreviewMode(previewMode === "day" ? "night" : "day")} variant="outline" size="sm">
              {previewMode === "day" ? <Moon size={18} /> : <Sun size={18} />}
              {previewMode === "day" ? t("tools.nightPreview") : t("tools.dayPreview")}
            </Button>

            <Button onClick={undo} disabled={historyIndex === 0} variant="outline" size="sm">
              <Undo size={18} />
              {t("tools.undo")}
            </Button>

            <Button onClick={redo} disabled={historyIndex === history.length - 1} variant="outline" size="sm">
              <Redo size={18} />
              {t("tools.redo")}
            </Button>

            <Button onClick={handleExport} variant="outline" size="sm">
              <Download size={18} />
              {t("tools.export")}
            </Button>

            <Button onClick={handleClear} variant="outline" size="sm">
              <Trash2 size={18} />
              {t("tools.clear")}
            </Button>

            <Button onClick={() => setShowSettings(!showSettings)} variant="outline" size="sm">
              <Settings size={18} />
              {t("tools.dimensions")}
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
            <h3 className="mb-4 text-xl font-bold">{t("settingsPanel.title")}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm text-muted-foreground">{t("settingsPanel.width", { max: MAX_DIMENSIONS.width })}</label>
                <input
                  type="range"
                  min="10"
                  max={MAX_DIMENSIONS.width}
                  value={canvasWidth}
                  onChange={(e) => handleDimensionChange("width", parseInt(e.target.value))}
                  className="h-2 w-full cursor-pointer rounded-lg bg-muted accent-primary"
                />
                <span className="font-bold text-primary">{canvasWidth} cm</span>
              </div>
              <div>
                <label className="mb-2 block text-sm text-muted-foreground">{t("settingsPanel.height", { max: MAX_DIMENSIONS.height })}</label>
                <input
                  type="range"
                  min="10"
                  max={MAX_DIMENSIONS.height}
                  value={canvasHeight}
                  onChange={(e) => handleDimensionChange("height", parseInt(e.target.value))}
                  className="h-2 w-full cursor-pointer rounded-lg bg-muted accent-primary"
                />
                <span className="font-bold text-primary">{canvasHeight} cm</span>
              </div>
              <div className="text-sm text-muted-foreground">
                <div>{t("settingsPanel.surface", { value: (canvasWidth * canvasHeight).toFixed(0) })}</div>
                <div className="font-bold text-primary">{t("settingsPanel.tubeWidth", { value: NEON_WIDTH_CM })}</div>
                {elements.length > 0 && <div className="text-xs text-primary">✓ {t("settingsPanel.autoAdapt")}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Snap Settings */}
        {image && (
          <div className="mb-6 rounded-xl bg-card p-4 ring-1 ring-amber-500/30">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-amber-500">
              <Zap size={20} />
              {t("snapPanel.title")}
            </h3>
            <div className="mb-4 flex flex-wrap items-end gap-4 border-b border-amber-500/20 pb-4">
              <div className="min-w-48 flex-1">
                <label className="mb-1 block text-sm text-muted-foreground">{t("snapPanel.imageScale", { value: Math.round(imageScale * 100) })}</label>
                <input
                  type="range"
                  min="30"
                  max="250"
                  value={Math.round(imageScale * 100)}
                  onChange={(e) => handleImageScaleChange(parseInt(e.target.value) / 100)}
                  className="h-2 w-full cursor-pointer rounded-lg bg-muted accent-amber-500"
                />
              </div>
              <Button onClick={handleRemoveImage} variant="outline" size="sm">
                <Trash2 size={18} />
                {t("snapPanel.removeImage")}
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t("snapPanel.sensitivity", { value: edgeThreshold })}</label>
                <input
                  type="range"
                  min="20"
                  max="150"
                  value={edgeThreshold}
                  onChange={(e) => {
                    setEdgeThreshold(parseInt(e.target.value));
                    if (image) detectEdges(image);
                  }}
                  className="h-2 w-full cursor-pointer rounded-lg bg-muted accent-amber-500"
                />
                <span className="text-xs text-muted-foreground">{t("snapPanel.sensitivityHint")}</span>
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t("snapPanel.distance", { value: snapDistance })}</label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={snapDistance}
                  onChange={(e) => handleSnapDistanceChange(parseInt(e.target.value))}
                  className="h-2 w-full cursor-pointer rounded-lg bg-muted accent-amber-500"
                />
                <span className="text-xs text-primary">✓ {t("snapPanel.active")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setShowEdges(!showEdges)} variant={showEdges ? "default" : "outline"} size="sm">
                  {showEdges ? <EyeOff size={18} /> : <Eye size={18} />}
                  {showEdges ? t("snapPanel.hide") : t("snapPanel.show")}
                </Button>
                <span className="text-xs text-muted-foreground">{t("snapPanel.points", { count: edgePoints.length })}</span>
              </div>
            </div>
          </div>
        )}

        {/* Selected Object Tools */}
        {selectedElement && currentTool === "select" && (
          <div className="mb-6 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <h3 className="mb-3 text-lg font-bold">
              {t("selection.title", {
                type:
                  selectedElement.type === "line"
                    ? t("selection.typeLine")
                    : selectedElement.type === "rect"
                      ? t("selection.typeRect")
                      : selectedElement.type === "circle"
                        ? t("selection.typeCircle")
                        : selectedElement.type,
              })}
            </h3>
            <div className="flex flex-wrap gap-2">
              {"rotation" in selectedElement && selectedElement.type !== "line" && (
                <Button onClick={rotateSelected} variant="outline" size="sm">
                  <RotateCw size={18} />
                  {t("selection.rotate")}
                </Button>
              )}
              <Button onClick={() => scaleSelected(1.2)} variant="outline" size="sm">
                <Maximize2 size={18} />
                {t("selection.enlarge")}
              </Button>
              <Button onClick={() => scaleSelected(0.8)} variant="outline" size="sm">
                <Maximize2 size={18} style={{ transform: "scale(0.8)" }} />
                {t("selection.reduce")}
              </Button>
              <Button onClick={duplicateSelected} variant="outline" size="sm">
                <Copy size={18} />
                {t("selection.duplicate")}
              </Button>
              <Button onClick={toggleSelectedBlink} variant={selectedElement.blink ? "default" : "outline"} size="sm">
                <Zap size={18} />
                {t("selection.blink")}
              </Button>
              <Button onClick={deleteSelected} variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 size={18} />
                {t("selection.delete")}
              </Button>
            </div>
            <div className="mt-4 max-w-xs">
              <label className="mb-1 block text-sm text-muted-foreground">
                {t("selection.glow", { value: selectedElement.glowIntensity ?? DEFAULT_GLOW_INTENSITY })}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={selectedElement.glowIntensity ?? DEFAULT_GLOW_INTENSITY}
                onChange={(e) => setSelectedGlow(parseInt(e.target.value))}
                onPointerUp={commitSelectedGlow}
                onKeyUp={commitSelectedGlow}
                className="h-2 w-full cursor-pointer rounded-lg bg-muted accent-primary"
              />
            </div>
            {selectedElement.blink && (
              <p className="mt-2 text-xs text-primary">
                {t("selection.blinkHint", { price: pricingSettings.controllerOptionPrice.toLocaleString(), currency: tCommon("currency") })}
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">{t("selection.resizeHint")}</p>
          </div>
        )}

        {/* Canvas */}
        <div className="mb-6 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6">
          <div className="overflow-auto">
            <canvas
              ref={canvasRef}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              className="mx-auto touch-none rounded-lg ring-1 ring-primary/30"
              style={{
                cursor: currentTool === "select" ? (isResizing ? "nwse-resize" : "move") : currentTool === "draw" ? "crosshair" : currentTool === "line" ? "crosshair" : "text",
                maxWidth: "100%",
                height: "auto",
              }}
            />
          </div>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {t("canvas.dimensions", { w: canvasWidth, h: canvasHeight, tube: NEON_WIDTH_CM })}
            {snapEnabled && image && <span className="text-primary"> | 🎯 {t("canvas.snapActive")}</span>}
          </div>
        </div>

        {/* Tools Grid */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Outils */}
          <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <h3 className="mb-4 text-lg font-bold">{t("toolsGrid.toolsTitle")}</h3>
            <div className="space-y-2">
              <label className="block">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={18} />
                  {t("toolsGrid.uploadImage")}
                </Button>
              </label>

              <Button size="sm" variant={currentTool === "text" ? "default" : "outline"} onClick={() => setCurrentTool("text")} className="w-full justify-start">
                <Type size={18} />
                {t("toolsGrid.textMode")}
              </Button>

              {currentTool === "text" && (
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="configurator-font" className="mb-1 block text-xs">
                      {t("toolsGrid.fontLabel")}
                    </Label>
                    <Select
                      items={NEON_FONTS.map((f) => ({ value: f.id, label: f.label }))}
                      value={textFontId}
                      onValueChange={(v) => v && setTextFontId(v as NeonFontId)}
                    >
                      <SelectTrigger id="configurator-font" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NEON_FONTS.map((font) => (
                          <SelectItem key={font.id} value={font.id} style={{ fontFamily: `"${NEON_FONT_FAMILIES[font.id]}"` }}>
                            {font.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      ref={textInputRef}
                      type="text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder={t("toolsGrid.textPlaceholder")}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && textInput.trim()) addText();
                      }}
                    />
                    <Button onClick={addText} disabled={!textInput.trim()} size="sm">
                      <Plus size={18} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Formes */}
          <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <h3 className="mb-4 text-lg font-bold">{t("toolsGrid.shapesTitle")}</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={() => addShape("rect")} className="justify-start">
                <Square size={18} />
                {t("toolsGrid.square")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => addShape("circle")} className="justify-start">
                <Circle size={18} />
                {t("toolsGrid.circle")}
              </Button>
            </div>
          </div>

          {/* Couleur */}
          <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 md:col-span-2 lg:col-span-1">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <Palette size={20} />
              {t("toolsGrid.colorTitle")}
            </h3>

            <div className="mb-4 flex flex-wrap gap-1.5">
              {palette.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setCurrentColor(color.value)}
                  aria-pressed={currentColor === color.value}
                  className={`h-6 w-6 shrink-0 rounded-full border-2 transition-all ${currentColor === color.value ? "scale-110 border-foreground" : "border-border hover:border-foreground/40"}`}
                  style={{ backgroundColor: color.value, boxShadow: currentColor === color.value ? `0 0 10px ${color.value}` : "none" }}
                  title={color.name}
                />
              ))}
            </div>

            <input type="color" value={currentColor} onChange={(e) => setCurrentColor(e.target.value)} className="h-10 w-full cursor-pointer rounded-lg border-2 border-border" />
          </div>
        </div>

        {/* Estimation Prix + Bouton Continuer */}
        {totalLength > 0 && (
          <div className="mb-6 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 p-6 ring-1 ring-primary/20">
            <div className="mb-6">
              <label className="mb-2 block text-sm text-muted-foreground">{t("price.supportLabel")}</label>
              <Select value={support} onValueChange={(value) => setSupport(value as SupportType)}>
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORT_TYPES.map((type) => {
                    const surcharge = Math.round(supportSurfaceCm2 * pricingSettings.supportPricePerCm2[type]);
                    return (
                      <SelectItem key={type} value={type}>
                        {t(`price.support.${type}`)}
                        {surcharge > 0 ? ` (+${surcharge.toLocaleString()} ${tCommon("currency")})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-6 text-center md:grid-cols-2">
              <div>
                <span className="mb-2 block text-lg text-muted-foreground">{t("price.totalLength")}</span>
                <span className="text-4xl font-bold text-primary">{totalLength.toFixed(1)} cm</span>
              </div>
              <div>
                <span className="mb-2 block text-lg text-muted-foreground">{t("price.estimatedPrice")}</span>
                <span className="font-display text-5xl font-bold text-primary">
                  {estimatedPrice.toLocaleString()} {tCommon("currency")}
                </span>
              </div>
            </div>
            {hasBlinkElements && (
              <p className="mb-2 text-center text-sm font-semibold text-primary">
                {t("price.controller", { price: pricingSettings.controllerOptionPrice.toLocaleString(), currency: tCommon("currency") })}
              </p>
            )}
            <p className="mb-4 text-center text-sm text-muted-foreground">{t("price.footnote")}</p>

            <div className="text-center">
              <Button onClick={handleContinueToQuote} disabled={submitting} size="lg" className="glow-primary px-12 py-6 text-xl font-bold">
                {t("price.continue")}
                <ArrowRight size={24} />
              </Button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="rounded-lg bg-card p-4 ring-1 ring-foreground/10">
          <h4 className="mb-2 font-bold">{t("instructions.title")}</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              • <strong>{t("instructions.selectLabel")}</strong> {t("instructions.selectText")}
            </li>
            <li>
              • <strong>{t("instructions.drawLabel")}</strong> {t("instructions.drawText")}
              {snapEnabled && image && <span className="text-primary"> — 🎯 {t("instructions.snapActiveHint")}</span>}
            </li>
            <li>
              • <strong>{t("instructions.lineLabel")}</strong> {t("instructions.lineText")}
            </li>
            <li>
              • <strong>{t("instructions.textLabel")}</strong> {t("instructions.textText")}
            </li>
            <li>
              • <strong>{t("instructions.shapesLabel")}</strong> {t("instructions.shapesText")}
            </li>
            <li>
              • <strong>{t("instructions.dayNightLabel")}</strong> {t("instructions.dayNightText")}
            </li>
            <li>
              • <strong>{t("instructions.shortcutsLabel")}</strong> {t("instructions.shortcutsText")}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
