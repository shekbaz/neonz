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

  const buffer = Buffer.from(await file.arrayBuffer());
  const { url, publicId } = await uploadBufferToCloudinary(buffer, "uploads");

  return NextResponse.json({ url, publicId });
}
