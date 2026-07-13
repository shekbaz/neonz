import type { NeonElement, Point } from "@/types/neon";

/**
 * Géométrie des éléments du canvas unifié (texte/dessin/ligne/formes) :
 * longueur de tube (pour le prix), boîte englobante (pour la sélection et
 * les poignées de redimensionnement) et transformations (déplacer/pivoter/
 * mettre à l'échelle). Remplace l'ancien pathTransform.ts (manipulation de
 * chaînes SVG "d") — ici on modifie directement les champs numériques de
 * chaque élément, comme dans un éditeur canvas raster classique.
 */

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function polylineLengthPx(points: Point[]): number {
  let length = 0;
  for (let i = 0; i < points.length - 1; i++) {
    length += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }
  return length;
}

/** Estimation grossière de la largeur d'un texte à l'écran, sans mesurer la police réelle (cohérent entre canvas et calcul de prix). */
export function estimateTextWidthPx(content: string, fontSize: number): number {
  return content.length * fontSize * 0.6;
}

/** Longueur de tube d'un élément, en pixels (espace de travail). */
export function elementLengthPx(el: NeonElement): number {
  switch (el.type) {
    case "draw":
      return polylineLengthPx(el.points);
    case "line":
      return Math.hypot(el.x2 - el.x1, el.y2 - el.y1);
    case "rect":
      return el.width && el.height ? 2 * (el.width + el.height) : 0;
    case "circle":
      return el.radius ? 2 * Math.PI * el.radius : 0;
    case "text":
      return estimateTextWidthPx(el.content, el.fontSize);
  }
}

export function totalLengthCm(elements: NeonElement[], pxToCm: number): number {
  return elements.reduce((sum, el) => sum + elementLengthPx(el) * pxToCm, 0);
}

export function elementBBox(el: NeonElement): BBox {
  switch (el.type) {
    case "draw": {
      const xs = el.points.map((p) => p.x);
      const ys = el.points.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
    }
    case "line": {
      const minX = Math.min(el.x1, el.x2);
      const minY = Math.min(el.y1, el.y2);
      return { x: minX, y: minY, width: Math.abs(el.x2 - el.x1), height: Math.abs(el.y2 - el.y1) };
    }
    case "text": {
      const w = estimateTextWidthPx(el.content, el.fontSize);
      return { x: el.x - w / 2, y: el.y - el.fontSize / 2, width: w, height: el.fontSize };
    }
    case "circle": {
      const r = el.radius ?? 0;
      return { x: el.x - r, y: el.y - r, width: r * 2, height: r * 2 };
    }
    case "rect":
      return { x: el.x, y: el.y, width: el.width ?? 0, height: el.height ?? 0 };
  }
}

export function unionBBox(boxes: BBox[]): BBox | null {
  if (boxes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function translateElement(el: NeonElement, dx: number, dy: number): NeonElement {
  switch (el.type) {
    case "draw":
      return { ...el, points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
    case "line":
      return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy };
    case "text":
    case "rect":
    case "circle":
      return { ...el, x: el.x + dx, y: el.y + dy };
  }
}

function rotatePoint(p: Point, angleDeg: number, cx: number, cy: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - cx;
  const dy = p.y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

/** Pivote l'élément autour de (cx, cy). Pour les formes/texte (rendues via leur propre `rotation`), on tourne aussi le centre pour rester cohérent si le pivot n'est pas le centre de l'élément. */
export function rotateElement(el: NeonElement, angleDeg: number, cx: number, cy: number): NeonElement {
  switch (el.type) {
    case "draw":
      return { ...el, points: el.points.map((p) => rotatePoint(p, angleDeg, cx, cy)) };
    case "line": {
      const p1 = rotatePoint({ x: el.x1, y: el.y1 }, angleDeg, cx, cy);
      const p2 = rotatePoint({ x: el.x2, y: el.y2 }, angleDeg, cx, cy);
      return { ...el, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
    }
    case "text":
    case "rect":
    case "circle": {
      const anchor = el.type === "rect" ? { x: el.x + (el.width ?? 0) / 2, y: el.y + (el.height ?? 0) / 2 } : { x: el.x, y: el.y };
      const rotatedAnchor = rotatePoint(anchor, angleDeg, cx, cy);
      const newRotation = ((el.rotation ?? 0) + angleDeg) % 360;
      if (el.type === "rect") {
        return { ...el, x: rotatedAnchor.x - (el.width ?? 0) / 2, y: rotatedAnchor.y - (el.height ?? 0) / 2, rotation: newRotation };
      }
      return { ...el, x: rotatedAnchor.x, y: rotatedAnchor.y, rotation: newRotation };
    }
  }
}

/** Échelle uniforme autour de (cx, cy). */
export function scaleElement(el: NeonElement, factor: number, cx: number, cy: number): NeonElement {
  const scalePoint = (p: Point): Point => ({ x: cx + (p.x - cx) * factor, y: cy + (p.y - cy) * factor });
  switch (el.type) {
    case "draw":
      return { ...el, points: el.points.map(scalePoint) };
    case "line": {
      const p1 = scalePoint({ x: el.x1, y: el.y1 });
      const p2 = scalePoint({ x: el.x2, y: el.y2 });
      return { ...el, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
    }
    case "text": {
      const p = scalePoint({ x: el.x, y: el.y });
      return { ...el, x: p.x, y: p.y, fontSize: Math.max(8, el.fontSize * factor) };
    }
    case "circle": {
      const p = scalePoint({ x: el.x, y: el.y });
      return { ...el, x: p.x, y: p.y, radius: Math.max(4, (el.radius ?? 0) * factor) };
    }
    case "rect": {
      const p = scalePoint({ x: el.x, y: el.y });
      return {
        ...el,
        x: p.x,
        y: p.y,
        width: Math.max(8, (el.width ?? 0) * factor),
        height: Math.max(8, (el.height ?? 0) * factor),
      };
    }
  }
}

/** Redimensionne tout le design (changement des dimensions cm de la surface de travail) — met à l'échelle chaque élément depuis l'origine. */
export function scaleElementsToWorkspace(elements: NeonElement[], scaleX: number, scaleY: number): NeonElement[] {
  return elements.map((el) => {
    switch (el.type) {
      case "draw":
        return { ...el, points: el.points.map((p) => ({ x: p.x * scaleX, y: p.y * scaleY })) };
      case "line":
        return { ...el, x1: el.x1 * scaleX, y1: el.y1 * scaleY, x2: el.x2 * scaleX, y2: el.y2 * scaleY };
      case "text":
        return { ...el, x: el.x * scaleX, y: el.y * scaleY, fontSize: el.fontSize * Math.min(scaleX, scaleY) };
      case "circle":
        return { ...el, x: el.x * scaleX, y: el.y * scaleY, radius: (el.radius ?? 0) * Math.min(scaleX, scaleY) };
      case "rect":
        return {
          ...el,
          x: el.x * scaleX,
          y: el.y * scaleY,
          width: (el.width ?? 0) * scaleX,
          height: (el.height ?? 0) * scaleY,
        };
    }
  });
}
