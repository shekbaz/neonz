import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { auth } from "@/lib/auth";
import { orderStatusUpdateSchema } from "@/lib/validators/order.schema";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  const order = await Order.findById(id);
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }

  const isOwner = order.user?.toString() === session.user.id;
  if (!isOwner && session.user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  return NextResponse.json(order);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = orderStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const existing = await Order.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }

  const depositReceived = parsed.data.depositReceived ?? existing.payment?.depositReceived ?? false;
  // Un acompte est requis dès qu'un article personnalisé compose la commande : la
  // fabrication ne peut démarrer avant sa confirmation (voir Order.payment.depositRequired).
  if (
    parsed.data.status === "in_production" &&
    (existing.payment?.depositRequired ?? 0) > 0 &&
    !depositReceived
  ) {
    return NextResponse.json({ error: "DEPOSIT_REQUIRED" }, { status: 400 });
  }

  const order = await Order.findByIdAndUpdate(
    id,
    {
      status: parsed.data.status,
      ...(parsed.data.depositReceived !== undefined && { "payment.depositReceived": parsed.data.depositReceived }),
      $push: { statusHistory: { status: parsed.data.status, date: new Date(), note: parsed.data.note } },
    },
    { returnDocument: "after" }
  );

  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }

  return NextResponse.json(order);
}
