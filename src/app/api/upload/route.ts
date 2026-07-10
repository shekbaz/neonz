import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";
import { connectDB } from "@/lib/db";
import { UploadedAsset } from "@/models/UploadedAsset";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Format non supporté. Utilisez PNG, JPG, SVG ou WebP." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)." }, { status: 400 });
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error("Upload impossible : variables CLOUDINARY_* manquantes sur le serveur.");
    return NextResponse.json(
      { error: "Configuration serveur incomplète pour l'upload d'images." },
      { status: 500 }
    );
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer());

  // Compresse et redimensionne côté serveur pour garder les images du site légères
  // (le SVG est vectoriel et n'a pas besoin d'être raster-compressé).
  const buffer =
    file.type === "image/svg+xml"
      ? rawBuffer
      : await sharp(rawBuffer)
          .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();

  try {
    const { url, publicId } = await uploadBufferToCloudinary(buffer, "uploads");

    // Tracé pour permettre le nettoyage automatique des images jamais commandées
    // (voir src/lib/neon/cleanupUploads.ts) — ne doit jamais faire échouer l'upload.
    try {
      await connectDB();
      await UploadedAsset.create({ publicId, url });
    } catch (trackingError) {
      console.error("Échec du suivi de l'upload (nettoyage auto désactivé pour ce fichier):", trackingError);
    }

    return NextResponse.json({ url, publicId });
  } catch (error) {
    console.error("Échec de l'upload Cloudinary:", error);
    return NextResponse.json(
      { error: "Échec de l'upload de l'image. Réessayez." },
      { status: 500 }
    );
  }
}
