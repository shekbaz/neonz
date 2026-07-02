import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const localizedTextSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
  },
  { _id: false }
);

const productSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    translations: {
      fr: { type: localizedTextSchema, required: true },
      en: { type: localizedTextSchema, required: true },
      ar: { type: localizedTextSchema, required: true },
    },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    images: { type: [String], default: [] },
    basePrice: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0 },
    colors: { type: [String], default: [] },
    dimensions: {
      width: { type: Number, required: true },
      height: { type: Number, required: true },
      unit: { type: String, default: "cm" },
    },
    stock: { type: Number, required: true, default: 0 },
    isCustomizable: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ basePrice: 1 });

export type IProduct = InferSchemaType<typeof productSchema>;

export const Product: Model<IProduct> = models.Product ?? model<IProduct>("Product", productSchema);
