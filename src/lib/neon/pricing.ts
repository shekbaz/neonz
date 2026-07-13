import type { NeonElement } from "@/types/neon";
import { totalLengthCm } from "@/lib/neon/elementGeometry";

/**
 * Calcul du prix d'un design personnalisé : au mètre linéaire de tube (comme
 * dans la réalité de la fabrication), formule directe sans étape serveur —
 * le même calcul tourne en temps réel dans le navigateur pendant l'édition.
 *
 * Toutes les valeurs sont exprimées en DZD (dinar algérien) — à adapter via
 * PRICING_CONFIG si l'app doit gérer plusieurs devises.
 */

export const PRICING_CONFIG = {
  currency: "DZD",
  pricePerCmOfTube: 180, // prix au cm linéaire de tube néon LED
};

export interface DesignPriceBreakdown {
  tubePrice: number;
  totalTubeLengthCm: number;
  /** Supplément support (rempli par applyFinalOptions, 0 tant que non appliqué). */
  supportSurcharge: number;
  /** Supplément télécommande/variateur (rempli par applyFinalOptions, 0 tant que non appliqué). */
  remoteSurcharge: number;
  /** Supplément contrôleur multi-zone — requis dès qu'un élément a `blink: true` (rempli par applyFinalOptions). */
  controllerSurcharge: number;
  total: number;
  currency: string;
}

export function calculateDesignPrice(params: { elements: NeonElement[]; pxToCm: number }): DesignPriceBreakdown {
  const { elements, pxToCm } = params;
  const lengthCm = totalLengthCm(elements, pxToCm);
  const tubePrice = Math.round(lengthCm * PRICING_CONFIG.pricePerCmOfTube);

  return {
    tubePrice,
    totalTubeLengthCm: Number(lengthCm.toFixed(1)),
    supportSurcharge: 0,
    remoteSurcharge: 0,
    controllerSurcharge: 0,
    total: tubePrice,
    currency: PRICING_CONFIG.currency,
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
/** Contrôleur multi-zone requis dès qu'un élément clignote — un seul contrôleur pilote toutes les zones. */
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
