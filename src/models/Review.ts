import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const reviewSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, status: 1 });

export type IReview = InferSchemaType<typeof reviewSchema>;

export const Review: Model<IReview> = models.Review ?? model<IReview>("Review", reviewSchema);
