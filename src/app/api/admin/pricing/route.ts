import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PricingConfig } from "@/models/PricingConfig";
import { auth } from "@/lib/auth";
import { pricingConfigInputSchema } from "@/lib/validators/pricingConfig.schema";
import { getPricingSettings } from "@/lib/neon/getPricingSettings";

export async function GET() {
  const settings = await getPricingSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = pricingConfigInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();

  // Singleton : un seul document, créé s'il n'existe pas encore.
  const updated = await PricingConfig.findOneAndUpdate({}, parsed.data, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });

  return NextResponse.json(updated);
}
