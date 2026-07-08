import { z } from "zod";

export const testimonialInputSchema = z.object({
  authorName: z.string().min(2).max(80),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(3).max(1000),
  product: z.string().optional(),
  status: z.enum(["pending", "approved", "rejected"]).default("approved"),
});

export type TestimonialInput = z.infer<typeof testimonialInputSchema>;
