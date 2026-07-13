import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { CustomDesign } from "@/models/CustomDesign";
import { auth } from "@/lib/auth";
import { customDesignCreateSchema } from "@/lib/validators/customDesign.schema";
import { calculateDesignPrice, applyFinalOptions } from "@/lib/neon/pricing";
import type { NeonElement } from "@/types/neon";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = customDesignCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  await connectDB();
  const session = await auth();

  // Jamais confiance au client pour le contrôleur : dérivé des éléments eux-mêmes.
  const hasController = data.elements.some((e) => e.blink);

  const breakdown = calculateDesignPrice({
    elements: data.elements as NeonElement[],
    pxToCm: data.pxToCmRatio,
  });
  const price = applyFinalOptions(breakdown, { support: data.support, hasRemote: data.hasRemote, hasController });

  const design = await CustomDesign.create({
    user: session?.user?.id,
    status: "valid",
    sourceType: data.sourceType,
    elements: data.elements,
    previewImageUrl: data.previewImageUrl,
    dimensions: data.dimensions,
    pxToCmRatio: data.pxToCmRatio,
    support: data.support,
    hasRemote: data.hasRemote,
    hasController,
    price,
  });

  return NextResponse.json(design, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  await connectDB();
  const designs = await CustomDesign.find({ user: session.user.id }).sort({ createdAt: -1 });
  return NextResponse.json(designs);
}
