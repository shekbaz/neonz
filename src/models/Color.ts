import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const colorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    hex: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: /^#[0-9A-F]{6}$/,
    },
  },
  { timestamps: true }
);

export type IColor = InferSchemaType<typeof colorSchema>;

export const Color: Model<IColor> = models.Color ?? model<IColor>("Color", colorSchema);
