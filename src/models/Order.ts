import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const orderItemSchema = new Schema(
  {
    type: { type: String, enum: ["catalog", "custom"], required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    customDesign: { type: Schema.Types.ObjectId, ref: "CustomDesign" },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { _id: true }
);

const addressSnapshotSchema = new Schema(
  {
    label: { type: String },
    // Pas d'adresse précise collectée au checkout (seulement ville + wilaya) : l'admin
    // confirme l'adresse exacte par téléphone avant expédition.
    line1: { type: String },
    city: { type: String, required: true },
    wilaya: { type: String },
    postalCode: { type: String },
    country: { type: String, required: true },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    // Aucun compte requis pour commander : `user` est renseigné si le client est connecté,
    // mais contactName/contactPhone sont toujours saisis au checkout (compte ou invité) car
    // le contact de livraison est confirmé par téléphone dans tous les cas.
    user: { type: Schema.Types.ObjectId, ref: "User" },
    contactName: { type: String, required: true },
    contactPhone: { type: String, required: true },
    items: { type: [orderItemSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "in_production", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    shippingAddress: { type: addressSnapshotSchema, required: true },
    // Pas de paiement en ligne : les articles catalogue sont payés à la livraison (COD).
    // Les articles personnalisés nécessitent un acompte (depositRequired, PRICING_CONFIG.depositRate)
    // réglé hors système (virement, Baridimob...) avant le passage en fabrication — l'admin coche
    // depositReceived une fois l'acompte confirmé ; le solde est réglé à la livraison.
    payment: {
      status: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
      confirmedByAdmin: { type: Boolean, default: false },
      depositRequired: { type: Number, default: 0 },
      depositReceived: { type: Boolean, default: false },
    },
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true },
    productionPdfUrl: { type: String },
    statusHistory: {
      type: [
        {
          status: { type: String, required: true },
          date: { type: Date, required: true, default: Date.now },
          note: { type: String },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ contactPhone: 1 });

export type IOrder = InferSchemaType<typeof orderSchema>;

export const Order: Model<IOrder> = models.Order ?? model<IOrder>("Order", orderSchema);
