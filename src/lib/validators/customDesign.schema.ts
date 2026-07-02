import { z } from "zod";
import { MAX_DIMENSION_CM, NEON_FONTS } from "@/types/neon";

const fontIds = NEON_FONTS.map((f) => f.id) as [string, ...string[]];

export const textToPathInputSchema = z.object({
  text: z.string().min(1).max(60),
  fontId: z.enum(fontIds),
  extraLetterSpacingPx: z.number().min(0).max(200).optional(),
});

export const vectorizeInputSchema = z.object({
  imageUrl: z.string().url(),
  turdSize: z.number().min(2).max(200).optional(),
  threshold: z.number().min(0).max(255).optional(),
});

const neonPathSchema = z.object({
  id: z.string(),
  d: z.string().min(1),
  color: z.string(),
  order: z.number().int(),
  groupId: z.string().optional(),
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
