import { NextRequest, NextResponse } from "next/server";
import { textToNeonPaths } from "@/lib/neon/textToPath";
import { textToPathInputSchema } from "@/lib/validators/customDesign.schema";
import type { NeonFontId } from "@/types/neon";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = textToPathInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await textToNeonPaths(parsed.data.text, {
      fontId: parsed.data.fontId as NeonFontId,
      extraLetterSpacingPx: parsed.data.extraLetterSpacingPx,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de la conversion du texte.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
