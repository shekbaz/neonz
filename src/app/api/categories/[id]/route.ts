import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { auth } from "@/lib/auth";
import { categoryInputSchema } from "@/lib/validators/category.schema";
import { formatZodIssues } from "@/lib/validators/zodErrorResponse";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = categoryInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodIssues(parsed.error) }, { status: 400 });
  }

  await connectDB();
  const category = await Category.findByIdAndUpdate(id, parsed.data, { returnDocument: "after" });
  if (!category) {
    return NextResponse.json({ error: "Catégorie introuvable." }, { status: 404 });
  }
  return NextResponse.json(category);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();

  const productCount = await Product.countDocuments({ category: id });
  if (productCount > 0) {
    return NextResponse.json(
      { error: `Impossible de supprimer : ${productCount} produit(s) utilisent encore cette catégorie.` },
      { status: 409 }
    );
  }

  await Category.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
