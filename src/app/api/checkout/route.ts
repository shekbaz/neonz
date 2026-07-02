import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { z } from "zod";

const checkoutSchema = z.object({ orderId: z.string() });

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const order = await Order.findById(parsed.data.orderId);
  if (!order || order.user.toString() !== session.user.id) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }

  if (order.payment?.method === "stripe") {
    const checkoutSession = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: order.items.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: { name: item.type === "catalog" ? "Enseigne néon" : "Enseigne personnalisée" },
          unit_amount: Math.round(item.unitPrice * 100),
        },
        quantity: item.quantity,
      })),
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/commande/${order._id}?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?cancelled=true`,
      metadata: { orderId: order._id.toString() },
    });

    return NextResponse.json({ url: checkoutSession.url });
  }

  // CIB / EDAHABIA (SATIM) : le flux d'intégration réel nécessite un enregistrement
  // de commande auprès de la passerelle SATIM puis une redirection vers son formulaire
  // de paiement — placeholder en attendant les identifiants marchands.
  return NextResponse.json(
    { error: "Le paiement CIB/EDAHABIA n'est pas encore configuré." },
    { status: 501 }
  );
}
