import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { CustomDesign } from "@/models/CustomDesign";
import { auth } from "@/lib/auth";
import { customDesignCreateSchema } from "@/lib/validators/customDesign.schema";
import { checkCollisions } from "@/lib/neon/collision";
import { calculateDesignPrice, applyFinalOptions } from "@/lib/neon/pricing";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = customDesignCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Revalidation serveur : ne jamais faire confiance au résultat de collision envoyé par le client.
  const collision = checkCollisions(data.paths, data.pxToCmRatio);
  if (collision.hasCollision) {
    return NextResponse.json(
      { error: "Des collisions subsistent, la commande ne peut pas être enregistrée.", collision },
      { status: 422 }
    );
  }

  await connectDB();
  const session = await auth();

  const breakdown = calculateDesignPrice({
    paths: data.paths,
    pxToCm: data.pxToCmRatio,
    widthCm: data.dimensions.widthCm,
    heightCm: data.dimensions.heightCm,
  });
  const price = applyFinalOptions(breakdown, { support: data.support, hasRemote: data.hasRemote });

  const design = await CustomDesign.create({
    user: session?.user?.id,
    status: "valid",
    sourceType: data.sourceType,
    sourceImageUrl: data.sourceImageUrl,
    sourceText: data.sourceText,
    fontFamily: data.fontFamily,
    paths: data.paths,
    dimensions: data.dimensions,
    pxToCmRatio: data.pxToCmRatio,
    collision: { hasCollision: false, zones: [], lastCheckedAt: new Date() },
    support: data.support,
    hasRemote: data.hasRemote,
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
