import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const categorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    translations: {
      fr: { name: { type: String, required: true } },
      en: { name: { type: String, required: true } },
      ar: { name: { type: String, required: true } },
    },
    image: { type: String },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type ICategory = InferSchemaType<typeof categorySchema>;

export const Category: Model<ICategory> = models.Category ?? model<ICategory>("Category", categorySchema);
