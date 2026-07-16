import { connectDB } from "@/lib/db";
import { PricingConfig } from "@/models/PricingConfig";
import { DEFAULT_PRICING_SETTINGS, type PricingSettings } from "@/lib/neon/pricing";

/** Lit la config tarifaire admin (singleton) en base ; retombe sur les valeurs par défaut si l'admin n'a encore rien enregistré. */
export async function getPricingSettings(): Promise<PricingSettings> {
  await connectDB();
  const doc = await PricingConfig.findOne().lean();
  if (!doc) return DEFAULT_PRICING_SETTINGS;

  return {
    currency: doc.currency,
    pricePerCmOfTube: doc.pricePerCmOfTube,
    depositRate: doc.depositRate,
    supportPrices: {
      forex: doc.supportPrices?.forex ?? DEFAULT_PRICING_SETTINGS.supportPrices.forex,
      plexiglass: doc.supportPrices?.plexiglass ?? DEFAULT_PRICING_SETTINGS.supportPrices.plexiglass,
    },
    remoteOptionPrice: doc.remoteOptionPrice,
    controllerOptionPrice: doc.controllerOptionPrice,
  };
}
