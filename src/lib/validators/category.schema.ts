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
  // Accepte les URLs absolues (Cloudinary) et les chemins relatifs du site
  // (ex: /demo/*.svg pour les catégories de démo créées par scripts/seed.ts).
  image: z
    .union([z.string().refine((v) => v.startsWith("/") || /^https?:\/\//.test(v)), z.literal("")])
    .optional(),
  order: z.number().int().default(0),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
