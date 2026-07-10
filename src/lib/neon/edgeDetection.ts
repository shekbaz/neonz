/**
 * Détection de contours (filtre de Sobel) et accroche magnétique — utilisé
 * par le mode "dessin" du canvas unifié (Step1Create.tsx / NeonCanvasPreview.tsx)
 * pour aider à tracer un néon en suivant les contours d'une image de
 * référence. 100% client (ImageData du navigateur) : cette image de
 * référence n'est jamais envoyée au serveur, contrairement à l'ajout d'image
 * (vectorisation via /api/customize/vectorize).
 */

export interface Point {
  x: number;
  y: number;
}

/** Magnitude de gradient (Sobel) sur la luminance de chaque pixel — retourne les points au-dessus du seuil. */
export function detectEdges(imageData: ImageData, threshold: number): Point[] {
  const { width, height, data } = imageData;
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = r * 0.299 + g * 0.587 + b * 0.114;
  }

  const edges: Point[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const gx =
        -gray[idx - width - 1] +
        gray[idx - width + 1] -
        2 * gray[idx - 1] +
        2 * gray[idx + 1] -
        gray[idx + width - 1] +
        gray[idx + width + 1];
      const gy =
        -gray[idx - width - 1] -
        2 * gray[idx - width] -
        gray[idx - width + 1] +
        gray[idx + width - 1] +
        2 * gray[idx + width] +
        gray[idx + width + 1];
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      if (magnitude > threshold) edges.push({ x, y });
    }
  }
  return edges;
}

export type SpatialGrid = Map<string, Point[]>;

function cellKey(cx: number, cy: number): string {
  return `${cx}:${cy}`;
}

/** Grille spatiale (cellules de `cellSize`) pour une recherche de voisinage en O(1) plutôt que O(n). */
export function buildSpatialGrid(points: Point[], cellSize: number): SpatialGrid {
  const grid: SpatialGrid = new Map();
  for (const p of points) {
    const key = cellKey(Math.floor(p.x / cellSize), Math.floor(p.y / cellSize));
    const cell = grid.get(key);
    if (cell) cell.push(p);
    else grid.set(key, [p]);
  }
  return grid;
}

/** Point de contour le plus proche dans un rayon `maxDistance`, ou `point` inchangé si aucun. */
export function snapToNearest(point: Point, grid: SpatialGrid, cellSize: number, maxDistance: number): Point {
  const cx = Math.floor(point.x / cellSize);
  const cy = Math.floor(point.y / cellSize);

  let closest = point;
  let minDistance = maxDistance;

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cell = grid.get(cellKey(cx + dx, cy + dy));
      if (!cell) continue;
      for (const candidate of cell) {
        const d = Math.hypot(candidate.x - point.x, candidate.y - point.y);
        if (d < minDistance) {
          minDistance = d;
          closest = candidate;
        }
      }
    }
  }

  return closest;
}
