import { z } from "zod";

const addressSchema = z.object({
  label: z.string().optional(),
  // Pas d'adresse précise collectée au checkout (seulement ville + wilaya) : l'admin
  // confirme l'adresse exacte par téléphone avant expédition.
  line1: z.string().optional(),
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
  // Toujours saisis au checkout (client connecté ou invité) : le contact de livraison
  // est confirmé par téléphone dans tous les cas.
  contactName: z.string().min(2, "Nom requis"),
  contactPhone: z.string().min(8, "Numéro de téléphone invalide"),
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum(["pending", "confirmed", "in_production", "shipped", "delivered", "cancelled"]),
  note: z.string().optional(),
  depositReceived: z.boolean().optional(),
});

export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
