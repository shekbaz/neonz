import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Review } from "@/models/Review";
import { auth } from "@/lib/auth";

const reviewSchema = z.object({
  product: z.string().optional(),
  order: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(3).max(1000),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const product = searchParams.get("product");

  await connectDB();
  const reviews = await Review.find({
    status: "approved",
    ...(product ? { product } : {}),
  }).sort({ createdAt: -1 });

  return NextResponse.json(reviews);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const review = await Review.create({ ...parsed.data, user: session.user.id, status: "pending" });
  return NextResponse.json(review, { status: 201 });
}
