import { z } from "zod";
import { MAX_DIMENSION_CM, NEON_FONTS } from "@/types/neon";

const fontIds = NEON_FONTS.map((f) => f.id) as [string, ...string[]];

export const textToPathInputSchema = z.object({
  text: z.string().min(1).max(60),
  fontId: z.enum(fontIds),
  fontSizePx: z.number().min(80).max(400).optional(),
  extraLetterSpacingPx: z.number().min(0).max(200).optional(),
});

export const vectorizeInputSchema = z.object({
  imageUrl: z.string().url(),
  turdSize: z.number().min(2).max(200).optional(),
  threshold: z.number().min(0).max(255).optional(),
  /** 1 = seuil noir/blanc simple, 2-5 = posterize multi-niveaux (plus de détail) */
  steps: z.number().int().min(1).max(5).optional(),
  invert: z.boolean().optional(),
  blurSigma: z.number().min(0).max(20).optional(),
});

const neonPathSchema = z.object({
  id: z.string(),
  d: z.string().min(1),
  color: z.string(),
  order: z.number().int(),
  groupId: z.string().optional(),
  glowIntensity: z.number().min(0).max(100).default(60),
  blink: z.boolean().default(false),
});

export const collisionCheckInputSchema = z.object({
  paths: z.array(neonPathSchema).min(1),
  workspaceWidthPx: z.number().positive(),
  workspaceHeightPx: z.number().positive(),
  widthCm: z.number().positive().max(MAX_DIMENSION_CM),
  heightCm: z.number().positive().max(MAX_DIMENSION_CM),
});

export const priceInputSchema = collisionCheckInputSchema.extend({
  support: z.enum(["acrylic-transparent", "acrylic-black", "silhouette-cut"]),
  hasRemote: z.boolean().default(false),
});

const traceSettingsSchema = z.object({
  threshold: z.number().min(0).max(255).optional(),
  turdSize: z.number().min(2).max(200).optional(),
  steps: z.number().int().min(1).max(5).optional(),
  fontSizePx: z.number().min(80).max(400).optional(),
  letterSpacingPx: z.number().min(0).max(200).optional(),
  invert: z.boolean().optional(),
  blurSigma: z.number().min(0).max(20).optional(),
});

export const autoTraceInputSchema = z
  .object({
    sourceType: z.enum(["image", "text"]),
    sourceImageUrl: z.string().url().optional(),
    sourceText: z.string().min(1).max(60).optional(),
    fontId: z.enum(fontIds).optional(),
    targetWidthCm: z.number().positive().max(MAX_DIMENSION_CM),
    targetHeightCm: z.number().positive().max(MAX_DIMENSION_CM),
    startingTraceSettings: traceSettingsSchema.optional(),
  })
  .refine((v) => (v.sourceType === "image" ? !!v.sourceImageUrl : !!v.sourceText?.trim()), {
    message: "Contenu manquant pour le type de source indiqué.",
  });

export const customDesignCreateSchema = z.object({
  sourceType: z.enum(["image", "text"]),
  sourceImageUrl: z.string().url().optional(),
  sourceText: z.string().max(60).optional(),
  fontFamily: z.string().optional(),
  paths: z.array(neonPathSchema).min(1),
  dimensions: z.object({
    widthCm: z.number().positive().max(MAX_DIMENSION_CM),
    heightCm: z.number().positive().max(MAX_DIMENSION_CM),
  }),
  pxToCmRatio: z.number().positive(),
  support: z.enum(["acrylic-transparent", "acrylic-black", "silhouette-cut"]),
  hasRemote: z.boolean().default(false),
});

export type TextToPathInput = z.infer<typeof textToPathInputSchema>;
export type CollisionCheckInput = z.infer<typeof collisionCheckInputSchema>;
export type CustomDesignCreateInput = z.infer<typeof customDesignCreateSchema>;
