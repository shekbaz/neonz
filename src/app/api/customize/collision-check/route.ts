import { NextRequest, NextResponse } from "next/server";
import { checkCollisions, suggestAdjustments } from "@/lib/neon/collision";
import { computeScaleRatio } from "@/lib/neon/unitConversion";
import { collisionCheckInputSchema } from "@/lib/validators/customDesign.schema";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = collisionCheckInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

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
}
