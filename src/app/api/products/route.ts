import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { auth } from "@/lib/auth";
import { productInputSchema, productQuerySchema } from "@/lib/validators/product.schema";
import { formatZodIssues } from "@/lib/validators/zodErrorResponse";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = productQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: formatZodIssues(parsed.error) }, { status: 400 });
  }

  const { category, minPrice, maxPrice, color, featured, page, limit } = parsed.data;

  await connectDB();

  const filter: Record<string, unknown> = { isActive: true };
  if (category) filter.category = category;
  if (color) filter.colors = color;
  if (featured !== undefined) filter.isFeatured = featured;
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.basePrice = {
      ...(minPrice !== undefined ? { $gte: minPrice } : {}),
      ...(maxPrice !== undefined ? { $lte: maxPrice } : {}),
    };
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  return NextResponse.json({ products, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = productInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodIssues(parsed.error) }, { status: 400 });
  }

  await connectDB();
  const product = await Product.create(parsed.data);
  return NextResponse.json(product, { status: 201 });
}
