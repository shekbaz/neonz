import { NextRequest, NextResponse } from "next/server";
import { resolveDesign } from "@/lib/neon/autoResolve";
import { autoTraceInputSchema } from "@/lib/validators/customDesign.schema";
import type { NeonFontId } from "@/types/neon";

/**
 * Trace + résout les collisions automatiquement, côté serveur, en un seul
 * aller-retour. Retourne toujours 200 : `resolved: false` est une réponse
 * normale (le client affiche un message en langage clair), pas une erreur.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = autoTraceInputSchema.safeParse(body);

  if (!parsed.success) {
    console.error("Auto-trace : payload invalide.", parsed.error.flatten().fieldErrors);
    return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  }

  try {
    const result = await resolveDesign({
      sourceType: parsed.data.sourceType,
      sourceImageUrl: parsed.data.sourceImageUrl,
      sourceText: parsed.data.sourceText,
      fontId: parsed.data.fontId as NeonFontId | undefined,
      targetWidthCm: parsed.data.targetWidthCm,
      targetHeightCm: parsed.data.targetHeightCm,
      startingTraceSettings: parsed.data.startingTraceSettings,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Échec de l'auto-trace :", error);
    const message = error instanceof Error ? error.message : "Échec du traitement.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
