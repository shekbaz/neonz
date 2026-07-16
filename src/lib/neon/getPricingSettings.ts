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
    supportPricePerCm2: {
      forex: doc.supportPricePerCm2?.forex ?? DEFAULT_PRICING_SETTINGS.supportPricePerCm2.forex,
      plexiglass: doc.supportPricePerCm2?.plexiglass ?? DEFAULT_PRICING_SETTINGS.supportPricePerCm2.plexiglass,
    },
    remoteOptionPrice: doc.remoteOptionPrice,
    controllerOptionPrice: doc.controllerOptionPrice,
  };
}
