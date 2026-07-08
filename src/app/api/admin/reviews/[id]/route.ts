import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Review } from "@/models/Review";
import { auth } from "@/lib/auth";

const statusSchema = z.object({ status: z.enum(["approved", "rejected"]) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const review = await Review.findByIdAndUpdate(id, { status: parsed.data.status }, { returnDocument: "after" });
  if (!review) {
    return NextResponse.json({ error: "Avis introuvable." }, { status: 404 });
  }

  return NextResponse.json(review);
}
