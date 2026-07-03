import { NextRequest, NextResponse } from "next/server";
import { textToNeonPaths } from "@/lib/neon/textToPath";
import { textToPathInputSchema } from "@/lib/validators/customDesign.schema";
import type { NeonFontId } from "@/types/neon";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = textToPathInputSchema.safeParse(body);

  if (!parsed.success) {
    console.error("Texte → tracés : payload invalide.", parsed.error.flatten().fieldErrors);
    return NextResponse.json(
      { error: "Paramètres de conversion du texte invalides." },
      { status: 400 }
    );
  }

  try {
    const result = await textToNeonPaths(parsed.data.text, {
      fontId: parsed.data.fontId as NeonFontId,
      fontSizePx: parsed.data.fontSizePx,
      extraLetterSpacingPx: parsed.data.extraLetterSpacingPx,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Échec de la conversion texte → tracés :", error);
    const message = error instanceof Error ? error.message : "Échec de la conversion du texte.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
