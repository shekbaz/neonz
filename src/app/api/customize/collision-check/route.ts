import { NextRequest, NextResponse } from "next/server";
import { checkCollisions, suggestAdjustments } from "@/lib/neon/collision";
import { computeScaleRatio } from "@/lib/neon/unitConversion";
import { collisionCheckInputSchema } from "@/lib/validators/customDesign.schema";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = collisionCheckInputSchema.safeParse(body);

  if (!parsed.success) {
    console.error("Vérification de collision : payload invalide.", parsed.error.flatten().fieldErrors);
    return NextResponse.json(
      { error: "Paramètres de vérification de collision invalides." },
      { status: 400 }
    );
  }

  try {
    const { paths, workspaceWidthPx, workspaceHeightPx, widthCm, heightCm } = parsed.data;

    const { pxToCmX } = computeScaleRatio({
      workspaceWidthPx,
      workspaceHeightPx,
      targetWidthCm: widthCm,
      targetHeightCm: heightCm,
    });

    const result = checkCollisions(paths, pxToCmX);
    const suggestions = suggestAdjustments(result);

    return NextResponse.json({ result, suggestions, pxToCm: pxToCmX });
  } catch (error) {
    console.error("Échec de la vérification de collision :", error);
    return NextResponse.json({ error: "Échec de la vérification de collision." }, { status: 422 });
  }
}
