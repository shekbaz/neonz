import { z } from "zod";

const localizedTextSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().min(10).max(5000),
});

export const productInputSchema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Le slug ne doit contenir que des minuscules, chiffres et tirets"),
  translations: z.object({
    fr: localizedTextSchema,
    en: localizedTextSchema,
    ar: localizedTextSchema,
  }),
  category: z.string().min(1, "Catégorie requise"),
  images: z.array(z.string().url()).min(1, "Au moins une image requise"),
  basePrice: z.number().positive(),
  discountPrice: z.number().positive().optional(),
  colors: z.array(z.string()).default([]),
  dimensions: z.object({
    width: z.number().positive().max(90),
    height: z.number().positive().max(90),
    unit: z.literal("cm").default("cm"),
  }),
  stock: z.number().int().min(0),
  isCustomizable: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export const productQuerySchema = z.object({
  category: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  color: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
});
