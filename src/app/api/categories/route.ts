import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { auth } from "@/lib/auth";
import { categoryInputSchema } from "@/lib/validators/category.schema";
import { formatZodIssues } from "@/lib/validators/zodErrorResponse";

export async function GET() {
  await connectDB();
  const categories = await Category.find().sort({ order: 1 });
  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = categoryInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodIssues(parsed.error) }, { status: 400 });
  }

  await connectDB();
  const category = await Category.create(parsed.data);
  return NextResponse.json(category, { status: 201 });
}
