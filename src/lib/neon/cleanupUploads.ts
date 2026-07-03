import { connectDB } from "@/lib/db";
import { deleteCloudinaryAsset } from "@/lib/cloudinary";
import { UploadedAsset } from "@/models/UploadedAsset";

/**
 * Supprime de Cloudinary (et de la base) les images uploadées via le
 * configurateur qui n'ont jamais été rattachées à une commande, passé un
 * délai de grâce (le temps que le client termine sa commande).
 */
export async function cleanupOrphanedUploads(maxAgeHours = 24): Promise<{ deleted: number; failed: number }> {
  await connectDB();

  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  const orphans = await UploadedAsset.find({ ordered: false, createdAt: { $lt: cutoff } });

  let deleted = 0;
  let failed = 0;

  for (const asset of orphans) {
    try {
      await deleteCloudinaryAsset(asset.publicId);
      await asset.deleteOne();
      deleted += 1;
    } catch (error) {
      failed += 1;
      console.error(`Échec de la suppression de l'upload orphelin ${asset.publicId}:`, error);
    }
  }

  return { deleted, failed };
}
