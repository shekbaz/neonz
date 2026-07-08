import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Color } from "@/models/Color";
import { auth } from "@/lib/auth";
import { colorInputSchema } from "@/lib/validators/color.schema";

export async function GET() {
  await connectDB();
  const colors = await Color.find().sort({ createdAt: 1 });
  return NextResponse.json({ colors });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = colorInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();

  const existing = await Color.findOne({ hex: parsed.data.hex });
  if (existing) {
    return NextResponse.json({ error: "Cette couleur existe déjà dans la palette." }, { status: 409 });
  }

  const color = await Color.create(parsed.data);
  return NextResponse.json(color, { status: 201 });
}
