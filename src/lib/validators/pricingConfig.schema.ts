import { z } from "zod";

export const pricingConfigInputSchema = z.object({
  currency: z.string().min(1).max(10),
  pricePerCmOfTube: z.number().nonnegative(),
  depositRate: z.number().min(0).max(1),
  supportPrices: z.object({
    forex: z.number().nonnegative(),
    plexiglass: z.number().nonnegative(),
  }),
  remoteOptionPrice: z.number().nonnegative(),
  controllerOptionPrice: z.number().nonnegative(),
});

export type PricingConfigInput = z.infer<typeof pricingConfigInputSchema>;
