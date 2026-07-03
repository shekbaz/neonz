import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Trace chaque image uploadée via /api/upload afin de pouvoir supprimer de
 * Cloudinary celles qui n'ont jamais abouti à une commande (voir
 * cleanupOrphanedUploads dans src/lib/neon/cleanupUploads.ts).
 */
const uploadedAssetSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    ordered: { type: Boolean, default: false },
  },
  { timestamps: true }
);

uploadedAssetSchema.index({ ordered: 1, createdAt: 1 });

export type IUploadedAsset = InferSchemaType<typeof uploadedAssetSchema>;

export const UploadedAsset: Model<IUploadedAsset> =
  models.UploadedAsset ?? model<IUploadedAsset>("UploadedAsset", uploadedAssetSchema);
