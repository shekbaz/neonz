import { z } from "zod";

const localizedNameSchema = z.object({
  name: z.string().min(2).max(80),
});

export const categoryInputSchema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Le slug ne doit contenir que des minuscules, chiffres et tirets"),
  translations: z.object({
    fr: localizedNameSchema,
    en: localizedNameSchema,
    ar: localizedNameSchema,
  }),
  image: z.union([z.string().url(), z.literal("")]).optional(),
  order: z.number().int().default(0),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
