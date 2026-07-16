import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { DEFAULT_PRICING_SETTINGS } from "@/lib/neon/pricing";

/**
 * Config tarifaire de l'atelier de personnalisation — document singleton
 * (un seul enregistrement, toujours relu/écrasé via `findOne`/`findOneAndUpdate`)
 * modifiable par l'admin sur /admin/tarifs. Les valeurs de `pricing.ts`
 * (DEFAULT_PRICING_SETTINGS) servent de repli tant qu'aucun document n'existe.
 */
const pricingConfigSchema = new Schema(
  {
    currency: { type: String, required: true, default: DEFAULT_PRICING_SETTINGS.currency },
    pricePerCmOfTube: { type: Number, required: true, default: DEFAULT_PRICING_SETTINGS.pricePerCmOfTube },
    depositRate: { type: Number, required: true, default: DEFAULT_PRICING_SETTINGS.depositRate, min: 0, max: 1 },
    supportPricePerCm2: {
      forex: { type: Number, required: true, default: DEFAULT_PRICING_SETTINGS.supportPricePerCm2.forex },
      plexiglass: { type: Number, required: true, default: DEFAULT_PRICING_SETTINGS.supportPricePerCm2.plexiglass },
    },
    remoteOptionPrice: { type: Number, required: true, default: DEFAULT_PRICING_SETTINGS.remoteOptionPrice },
    controllerOptionPrice: { type: Number, required: true, default: DEFAULT_PRICING_SETTINGS.controllerOptionPrice },
  },
  { timestamps: true }
);

export type IPricingConfig = InferSchemaType<typeof pricingConfigSchema>;

export const PricingConfig: Model<IPricingConfig> =
  models.PricingConfig ?? model<IPricingConfig>("PricingConfig", pricingConfigSchema);
