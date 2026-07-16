import type { NeonElement } from "@/types/neon";
import { totalLengthCm } from "@/lib/neon/elementGeometry";

/**
 * Calcul du prix d'un design personnalisé : au mètre linéaire de tube (comme
 * dans la réalité de la fabrication), formule directe sans étape serveur —
 * le même calcul tourne en temps réel dans le navigateur pendant l'édition.
 *
 * Toutes les valeurs sont exprimées en DZD (dinar algérien). Les montants
 * ci-dessous sont les valeurs par défaut de repli (utilisées tant que l'admin
 * n'a rien configuré) — voir le modèle Mongo `PricingConfig` et la page
 * /admin/tarifs pour la configuration réelle, chargée en base de données.
 */

export type SupportType = "forex" | "plexiglass";

export interface PricingSettings {
  currency: string;
  /** Prix au cm linéaire de tube néon LED. */
  pricePerCmOfTube: number;
  /** Part du prix des articles personnalisés à régler avant le lancement en fabrication (0-1). */
  depositRate: number;
  /** Prix au cm² de surface du support physique (largeur × hauteur du néon), selon Forex ou Plexiglass — un panneau plus grand coûte plus de matière. */
  supportPricePerCm2: Record<SupportType, number>;
  /** Supplément télécommande/variateur. */
  remoteOptionPrice: number;
  /** Supplément contrôleur multi-zone, requis dès qu'un élément clignote. */
  controllerOptionPrice: number;
}

/** Valeurs par défaut — servent tant que l'admin n'a pas encore enregistré de config en base (voir PricingConfig). */
export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  currency: "DZD",
  pricePerCmOfTube: 180,
  depositRate: 0.3,
  supportPricePerCm2: {
    forex: 4, // panneau PVC expansé, léger et économique
    plexiglass: 7, // panneau acrylique transparent, plus résistant et plus qualitatif
  },
  remoteOptionPrice: 1800,
  controllerOptionPrice: 2500,
};

/** Conservé pour compatibilité : ancien export utilisé par endroits, équivalent à DEFAULT_PRICING_SETTINGS. */
export const PRICING_CONFIG = DEFAULT_PRICING_SETTINGS;
export const REMOTE_OPTION_PRICE = DEFAULT_PRICING_SETTINGS.remoteOptionPrice;
export const CONTROLLER_OPTION_PRICE = DEFAULT_PRICING_SETTINGS.controllerOptionPrice;

/** Acompte requis sur un montant d'articles personnalisés (arrondi au DZD). */
export function calculateDeposit(customItemsTotal: number, settings: PricingSettings = DEFAULT_PRICING_SETTINGS): number {
  return Math.round(customItemsTotal * settings.depositRate);
}

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

export function calculateDesignPrice(
  params: { elements: NeonElement[]; pxToCm: number },
  settings: PricingSettings = DEFAULT_PRICING_SETTINGS
): DesignPriceBreakdown {
  const { elements, pxToCm } = params;
  const lengthCm = totalLengthCm(elements, pxToCm);
  const tubePrice = Math.round(lengthCm * settings.pricePerCmOfTube);

  return {
    tubePrice,
    totalTubeLengthCm: Number(lengthCm.toFixed(1)),
    supportSurcharge: 0,
    remoteSurcharge: 0,
    controllerSurcharge: 0,
    total: tubePrice,
    currency: settings.currency,
  };
}

export function applyFinalOptions(
  breakdown: DesignPriceBreakdown,
  options: { support: SupportType; dimensions: { widthCm: number; heightCm: number }; hasRemote: boolean; hasController: boolean },
  settings: PricingSettings = DEFAULT_PRICING_SETTINGS
): DesignPriceBreakdown {
  const surfaceCm2 = options.dimensions.widthCm * options.dimensions.heightCm;
  const supportPrice = Math.round(surfaceCm2 * settings.supportPricePerCm2[options.support]);
  const remotePrice = options.hasRemote ? settings.remoteOptionPrice : 0;
  const controllerPrice = options.hasController ? settings.controllerOptionPrice : 0;
  return {
    ...breakdown,
    supportSurcharge: supportPrice,
    remoteSurcharge: remotePrice,
    controllerSurcharge: controllerPrice,
    total: breakdown.total + supportPrice + remotePrice + controllerPrice,
  };
}
