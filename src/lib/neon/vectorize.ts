import potrace from "potrace";
import sharp from "sharp";
import type { NeonPath } from "@/types/neon";
import { NEON_COLORS } from "@/types/neon";

/**
 * Vectorisation serveur d'une image uploadée (logo/image) en tracés de
 * contour exploitables comme tubes néon.
 *
 * Potrace trace la frontière des régions sombres/claires d'une image
 * bitmap : le résultat est déjà un ensemble de CONTOURS (pas de remplissage
 * à proprement parler pour notre usage — on affichera ces tracés en mode
 * "stroke only", jamais en fill, côté preview). C'est cette propriété qui
 * en fait un bon candidat pour simuler un tube néon suivant le contour d'un
 * logo, sans avoir à implémenter un squelettiseur d'image dédié.
 */

export interface VectorizeOptions {
  /** Nombre de niveaux de gris avant traçage (1 = silhouette simple, plus = plus de détail) */
  steps?: number;
  /** Seuil noir/blanc (0-255), ignoré si steps > 1 (mode posterize) */
  threshold?: number;
  /** Taille min. (en px) d'une zone pour être conservée — filtre le bruit/détails trop fins
   *  qui généreraient des tracés trop proches (donc des collisions inévitables). */
  turdSize?: number;
  /** Largeur cible de normalisation avant traçage, en px (garde le ratio) */
  normalizeWidthPx?: number;
}

const DEFAULT_OPTIONS: Required<VectorizeOptions> = {
  steps: 1,
  threshold: 160,
  turdSize: 8,
  normalizeWidthPx: 800,
};

/**
 * Fusionne les options en IGNORANT les clés explicitement `undefined`.
 * Indispensable : les routes API passent souvent `{ threshold: undefined }`
 * (champ optionnel non fourni), et un spread naïf `{...defaults, ...options}`
 * écraserait alors les défauts avec `undefined` — Potrace recevrait
 * `threshold: undefined` et ne détecterait plus AUCUN contour (path vide).
 */
function mergeOptions(options: VectorizeOptions): Required<VectorizeOptions> {
  const merged = { ...DEFAULT_OPTIONS };
  for (const key of Object.keys(options) as (keyof VectorizeOptions)[]) {
    const value = options[key];
    if (value !== undefined) merged[key] = value;
  }
  return merged;
}

/** Extrait les attributs "d" de chaque <path> du SVG généré par potrace. */
function extractPathData(svg: string): string[] {
  const matches = [...svg.matchAll(/<path[^>]*\bd="([^"]+)"/g)];
  return matches.map((m) => m[1]);
}

function tracePotrace(buffer: Buffer, options: Required<VectorizeOptions>): Promise<string> {
  return new Promise((resolve, reject) => {
    const traceFn = options.steps > 1 ? potrace.posterize : potrace.trace;
    traceFn(
      buffer,
      {
        threshold: options.threshold,
        steps: options.steps > 1 ? options.steps : undefined,
        turdSize: options.turdSize,
        optCurve: true,
        alphaMax: 1,
        color: "black",
        background: "transparent",
      },
      (err: Error | null, svg: string) => {
        if (err) reject(err);
        else resolve(svg);
      }
    );
  });
}

/**
 * Convertit une image uploadée (buffer PNG/JPG/WebP) en tracés SVG normalisés.
 * Les SVG sont pré-traités (mise à niveau de gris, normalisation de taille)
 * avant passage à Potrace pour un résultat plus stable quel que soit le format d'origine.
 */
export async function vectorizeImage(
  imageBuffer: Buffer,
  options: VectorizeOptions = {}
): Promise<{ paths: NeonPath[]; workspaceWidthPx: number; workspaceHeightPx: number }> {
  const opts = mergeOptions(options);

  const normalized = await sharp(imageBuffer)
    .resize({ width: opts.normalizeWidthPx, withoutEnlargement: false })
    .grayscale()
    .png()
    .toBuffer();

  const metadata = await sharp(normalized).metadata();
  const workspaceWidthPx = metadata.width ?? opts.normalizeWidthPx;
  const workspaceHeightPx = metadata.height ?? opts.normalizeWidthPx;

  const svg = await tracePotrace(normalized, opts);
  const rawPaths = extractPathData(svg);

  if (rawPaths.length === 0) {
    throw new Error(
      "Aucun contour détecté dans l'image. Essayez une image avec un contraste plus marqué."
    );
  }

  const paths: NeonPath[] = rawPaths.map((d, index) => ({
    id: `img-path-${index}`,
    d,
    color: NEON_COLORS[0].hex,
    order: index,
  }));

  return { paths, workspaceWidthPx, workspaceHeightPx };
}

/**
 * Réduit le niveau de détail d'un jeu de tracés (nombre de segments) en
 * augmentant turdSize et en refaisant tourner Potrace — utilisé comme
 * remédiation automatique quand la détection de collision échoue à cause
 * d'une image trop détaillée.
 */
export async function vectorizeWithReducedDetail(
  imageBuffer: Buffer,
  currentOptions: VectorizeOptions
): Promise<{ paths: NeonPath[]; workspaceWidthPx: number; workspaceHeightPx: number }> {
  const reduced: VectorizeOptions = {
    ...currentOptions,
    turdSize: (currentOptions.turdSize ?? DEFAULT_OPTIONS.turdSize) * 2.5,
  };
  return vectorizeImage(imageBuffer, reduced);
}
