import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const reviewSchema = new Schema(
  {
    // Témoignages créés directement par l'admin (pas de compte client / pas
    // de commande liée depuis la suppression de l'inscription visiteur) :
    // authorName les identifie. user/order restent optionnels pour compat
    // avec d'éventuels avis historiques.
    authorName: { type: String, trim: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, status: 1 });

export type IReview = InferSchemaType<typeof reviewSchema>;

export const Review: Model<IReview> = models.Review ?? model<IReview>("Review", reviewSchema);
