import { NextRequest, NextResponse } from "next/server";
import { calculateDesignPrice, applyFinalOptions } from "@/lib/neon/pricing";
import { computeScaleRatio } from "@/lib/neon/unitConversion";
import { checkCollisions } from "@/lib/neon/collision";
import { priceInputSchema } from "@/lib/validators/customDesign.schema";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = priceInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { paths, workspaceWidthPx, workspaceHeightPx, widthCm, heightCm, support, hasRemote } =
    parsed.data;

  const { pxToCmX } = computeScaleRatio({
    workspaceWidthPx,
    workspaceHeightPx,
    targetWidthCm: widthCm,
    targetHeightCm: heightCm,
  });

  const collision = checkCollisions(paths, pxToCmX);
  if (collision.hasCollision) {
    return NextResponse.json(
      { error: "Le prix ne peut pas être calculé tant que des collisions existent.", collision },
      { status: 422 }
    );
  }

  const breakdown = calculateDesignPrice({ paths, pxToCm: pxToCmX, widthCm, heightCm });
  const final = applyFinalOptions(breakdown, { support, hasRemote });

  return NextResponse.json(final);
}
