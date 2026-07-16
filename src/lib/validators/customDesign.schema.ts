import { z } from "zod";
import { MAX_DIMENSION_CM, NEON_FONTS } from "@/types/neon";

const fontIds = NEON_FONTS.map((f) => f.id) as [string, ...string[]];

const pointSchema = z.object({ x: z.number(), y: z.number() });

const neonElementBaseSchema = z.object({
  id: z.string(),
  color: z.string(),
  glowIntensity: z.number().min(0).max(100).default(60),
  blink: z.boolean().default(false),
});

const textElementSchema = neonElementBaseSchema.extend({
  type: z.literal("text"),
  x: z.number(),
  y: z.number(),
  content: z.string().min(1).max(60),
  fontSize: z.number().positive(),
  fontId: z.enum(fontIds),
  rotation: z.number().default(0),
});

const drawElementSchema = neonElementBaseSchema.extend({
  type: z.literal("draw"),
  points: z.array(pointSchema).min(2),
});

const lineElementSchema = neonElementBaseSchema.extend({
  type: z.literal("line"),
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
});

const shapeElementSchema = neonElementBaseSchema.extend({
  type: z.enum(["rect", "circle"]),
  x: z.number(),
  y: z.number(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  radius: z.number().positive().optional(),
  rotation: z.number().default(0),
});

const neonElementSchema = z.discriminatedUnion("type", [
  textElementSchema,
  drawElementSchema,
  lineElementSchema,
  shapeElementSchema,
]);

export const customDesignCreateSchema = z.object({
  sourceType: z.enum(["image", "text", "draw", "mixed"]),
  elements: z.array(neonElementSchema).min(1),
  previewImageUrl: z.string().min(1),
  dimensions: z.object({
    widthCm: z.number().positive().max(MAX_DIMENSION_CM),
    heightCm: z.number().positive().max(MAX_DIMENSION_CM),
  }),
  pxToCmRatio: z.number().positive(),
  support: z.enum(["forex", "plexiglass"]),
  hasRemote: z.boolean().default(false),
});

export type CustomDesignCreateInput = z.infer<typeof customDesignCreateSchema>;
