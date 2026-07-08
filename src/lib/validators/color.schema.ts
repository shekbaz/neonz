import { z } from "zod";

export const colorInputSchema = z.object({
  name: z.string().min(1).max(60),
  hex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Format hex invalide (ex: #FF2FC0)")
    .transform((v) => v.toUpperCase()),
});

export type ColorInput = z.infer<typeof colorInputSchema>;
