import type { WorkspaceDimensions } from "@/types/neon";

/**
 * Résolution de référence utilisée pour tout le pipeline de vectorisation
 * (Potrace / opentype.js produisent des coordonnées en pixels "abstraits").
 * On fixe un DPI de travail commun pour que px -> cm soit stable
 * quel que soit le device d'origine de l'image uploadée.
 */
export const REFERENCE_DPI = 96;
const CM_PER_INCH = 2.54;

export function pxToCmAtDpi(px: number, dpi: number = REFERENCE_DPI): number {
  return (px / dpi) * CM_PER_INCH;
}

export function cmToPxAtDpi(cm: number, dpi: number = REFERENCE_DPI): number {
  return (cm / CM_PER_INCH) * dpi;
}

/**
 * Calcule le ratio px -> cm pour un design donné : on part de la bounding box
 * du tracé en pixels et on la fait correspondre aux dimensions cibles en cm
 * choisies par l'utilisateur (étape 4 du configurateur). Le ratio est ensuite
 * réutilisé pour convertir les tracés bruts en distances réelles lors de la
 * détection de collision.
 */
export function computeScaleRatio(params: {
  workspaceWidthPx: number;
  workspaceHeightPx: number;
  targetWidthCm: number;
  targetHeightCm: number;
}): { pxToCmX: number; pxToCmY: number; uniform: boolean } {
  const { workspaceWidthPx, workspaceHeightPx, targetWidthCm, targetHeightCm } = params;

  if (workspaceWidthPx <= 0 || workspaceHeightPx <= 0) {
    throw new Error("Dimensions de l'espace de travail invalides (doivent être > 0)");
  }

  const pxToCmX = targetWidthCm / workspaceWidthPx;
  const pxToCmY = targetHeightCm / workspaceHeightPx;

  // On garde toujours un ratio uniforme (pas de déformation du tracé) :
  // on prend le plus contraignant des deux axes, l'autre axe sera centré.
  const uniformRatio = Math.min(pxToCmX, pxToCmY);

  return { pxToCmX: uniformRatio, pxToCmY: uniformRatio, uniform: true };
}

export function buildWorkspaceDimensions(params: {
  workspaceWidthPx: number;
  workspaceHeightPx: number;
  targetWidthCm: number;
  targetHeightCm: number;
}): WorkspaceDimensions {
  return {
    widthPx: params.workspaceWidthPx,
    heightPx: params.workspaceHeightPx,
    widthCm: params.targetWidthCm,
    heightCm: params.targetHeightCm,
  };
}

export function distancePxToCm(distancePx: number, pxToCm: number): number {
  return distancePx * pxToCm;
}
