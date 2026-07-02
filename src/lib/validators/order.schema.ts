import { z } from "zod";

const addressSchema = z.object({
  label: z.string().optional(),
  line1: z.string().min(3),
  city: z.string().min(2),
  wilaya: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().min(2),
});

const orderItemSchema = z.object({
  type: z.enum(["catalog", "custom"]),
  product: z.string().optional(),
  customDesign: z.string().optional(),
  quantity: z.number().int().positive().default(1),
});

export const orderCreateSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  shippingAddress: addressSchema,
  paymentMethod: z.enum(["stripe", "cib", "edahabia"]),
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum(["pending", "confirmed", "in_production", "shipped", "delivered", "cancelled"]),
  note: z.string().optional(),
});

export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
