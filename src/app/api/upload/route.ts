import { NextRequest, NextResponse } from "next/server";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";

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

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const { url, publicId } = await uploadBufferToCloudinary(buffer, "uploads");
    return NextResponse.json({ url, publicId });
  } catch (error) {
    console.error("Échec de l'upload Cloudinary:", error);
    return NextResponse.json(
      { error: "Échec de l'upload de l'image. Réessayez." },
      { status: 500 }
    );
  }
}
