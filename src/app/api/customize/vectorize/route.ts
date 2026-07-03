import { NextRequest, NextResponse } from "next/server";
import { vectorizeImage } from "@/lib/neon/vectorize";
import { vectorizeInputSchema } from "@/lib/validators/customDesign.schema";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = vectorizeInputSchema.safeParse(body);

  if (!parsed.success) {
    console.error("Vectorisation : payload invalide.", parsed.error.flatten().fieldErrors);
    return NextResponse.json(
      { error: "Paramètres de vectorisation invalides." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(parsed.data.imageUrl);
    if (!response.ok) {
      console.error(
        `Vectorisation : récupération de l'image impossible (${response.status}) — ${parsed.data.imageUrl}`
      );
      return NextResponse.json({ error: "Impossible de récupérer l'image fournie." }, { status: 400 });
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await vectorizeImage(buffer, {
      turdSize: parsed.data.turdSize,
      threshold: parsed.data.threshold,
      steps: parsed.data.steps,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Échec de la vectorisation :", error);
    const message = error instanceof Error ? error.message : "Échec de la vectorisation.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
