import { NextRequest, NextResponse } from "next/server";
import { vectorizeImage } from "@/lib/neon/vectorize";
import { vectorizeInputSchema } from "@/lib/validators/customDesign.schema";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = vectorizeInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const response = await fetch(parsed.data.imageUrl);
    if (!response.ok) {
      return NextResponse.json({ error: "Impossible de récupérer l'image fournie." }, { status: 400 });
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await vectorizeImage(buffer, {
      turdSize: parsed.data.turdSize,
      threshold: parsed.data.threshold,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de la vectorisation.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
