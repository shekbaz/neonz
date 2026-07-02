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
    line1: { type: String, required: true },
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
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [orderItemSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "in_production", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    shippingAddress: { type: addressSnapshotSchema, required: true },
    payment: {
      method: { type: String, enum: ["stripe", "cib", "edahabia"], required: true },
      status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
      transactionId: { type: String },
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

export type IOrder = InferSchemaType<typeof orderSchema>;

export const Order: Model<IOrder> = models.Order ?? model<IOrder>("Order", orderSchema);
