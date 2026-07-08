import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Color } from "@/models/Color";
import { auth } from "@/lib/auth";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  await Color.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
