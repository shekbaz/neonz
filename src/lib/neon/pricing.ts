import { svgPathProperties } from "svg-path-properties";
import type { NeonPath } from "@/types/neon";

/**
 * Calcul du prix d'un design personnalisé. Le néon est facturé principalement
 * au mètre linéaire de tube (comme dans la réalité de la fabrication), avec
 * des suppléments pour le nombre de couleurs distinctes (chaque couleur =
 * une alimentation/segment séparé) et la taille du support.
 *
 * Toutes les valeurs sont exprimées en DZD (dinar algérien) — à adapter via
 * PRICING_CONFIG si l'app doit gérer plusieurs devises.
 */

export const PRICING_CONFIG = {
  currency: "DZD",
  basePrice: 3500, // frais fixes (conception, découpe support, alimentation de base)
  pricePerCmOfTube: 180, // prix au cm linéaire de tube néon LED
  pricePerCm2Backing: 12, // prix au cm² de support (acrylique/silhouette)
  pricePerExtraColor: 1500, // supplément par couleur au-delà de la 1ère
  complexityThresholdPathCount: 40, // au-delà, supplément de complexité (découpe/segmentation)
  pricePerExtraPathOverThreshold: 60,
};

export interface DesignPriceBreakdown {
  base: number;
  /** Frais fixes (conception, découpe support, alimentation de base) — sous-partie de `base`. */
  fixedFee: number;
  /** Coût du tube néon au linéaire — sous-partie de `base`. */
  tubePrice: number;
  colorSurcharge: number;
  sizeSurcharge: number;
  complexitySurcharge: number;
  /** Supplément support (rempli par applyFinalOptions, 0 tant que non appliqué). */
  supportSurcharge: number;
  /** Supplément télécommande/variateur (rempli par applyFinalOptions, 0 tant que non appliqué). */
  remoteSurcharge: number;
  /** Supplément contrôleur multi-zone — requis dès qu'un tracé a `blink: true` (rempli par applyFinalOptions). */
  controllerSurcharge: number;
  total: number;
  totalTubeLengthCm: number;
  currency: string;
}

function totalTubeLengthCm(paths: NeonPath[], pxToCm: number): number {
  let totalPx = 0;
  for (const p of paths) {
    try {
      totalPx += new svgPathProperties(p.d).getTotalLength();
    } catch {
      // Tracé isolé illisible : ignoré du calcul plutôt que de faire échouer tout le pricing.
    }
  }
  return totalPx * pxToCm;
}

export function calculateDesignPrice(params: {
  paths: NeonPath[];
  pxToCm: number;
  widthCm: number;
  heightCm: number;
}): DesignPriceBreakdown {
  const { paths, pxToCm, widthCm, heightCm } = params;
  const cfg = PRICING_CONFIG;

  const tubeLengthCm = totalTubeLengthCm(paths, pxToCm);
  const tubePrice = tubeLengthCm * cfg.pricePerCmOfTube;

  const distinctColors = new Set(paths.map((p) => p.color)).size;
  const colorSurcharge = Math.max(0, distinctColors - 1) * cfg.pricePerExtraColor;

  const areaCm2 = widthCm * heightCm;
  const sizeSurcharge = areaCm2 * cfg.pricePerCm2Backing;

  const extraPaths = Math.max(0, paths.length - cfg.complexityThresholdPathCount);
  const complexitySurcharge = extraPaths * cfg.pricePerExtraPathOverThreshold;

  const base = cfg.basePrice + tubePrice;
  const total = Math.round(base + colorSurcharge + sizeSurcharge + complexitySurcharge);

  return {
    base: Math.round(base),
    fixedFee: Math.round(cfg.basePrice),
    tubePrice: Math.round(tubePrice),
    colorSurcharge: Math.round(colorSurcharge),
    sizeSurcharge: Math.round(sizeSurcharge),
    complexitySurcharge: Math.round(complexitySurcharge),
    supportSurcharge: 0,
    remoteSurcharge: 0,
    controllerSurcharge: 0,
    total,
    totalTubeLengthCm: Number(tubeLengthCm.toFixed(1)),
    currency: cfg.currency,
  };
}

export const SUPPORT_PRICE_MODIFIERS: Record<
  "acrylic-transparent" | "acrylic-black" | "silhouette-cut",
  number
> = {
  "acrylic-transparent": 0,
  "acrylic-black": 800,
  "silhouette-cut": 2200, // découpe sur-mesure suivant le contour, plus coûteuse
};

export const REMOTE_OPTION_PRICE = 1800;
/** Contrôleur multi-zone requis dès qu'un tracé clignote — un seul contrôleur pilote toutes les zones. */
export const CONTROLLER_OPTION_PRICE = 2500;

export function applyFinalOptions(
  breakdown: DesignPriceBreakdown,
  options: { support: keyof typeof SUPPORT_PRICE_MODIFIERS; hasRemote: boolean; hasController: boolean }
): DesignPriceBreakdown {
  const supportPrice = SUPPORT_PRICE_MODIFIERS[options.support];
  const remotePrice = options.hasRemote ? REMOTE_OPTION_PRICE : 0;
  const controllerPrice = options.hasController ? CONTROLLER_OPTION_PRICE : 0;
  return {
    ...breakdown,
    supportSurcharge: supportPrice,
    remoteSurcharge: remotePrice,
    controllerSurcharge: controllerPrice,
    total: breakdown.total + supportPrice + remotePrice + controllerPrice,
  };
}
