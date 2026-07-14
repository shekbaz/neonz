import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { CustomDesign } from "@/models/CustomDesign";
import { auth } from "@/lib/auth";
import { orderCreateSchema } from "@/lib/validators/order.schema";
import { generateOrderNumber } from "@/lib/orderNumber";
import { calculateDeposit } from "@/lib/neon/pricing";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  await connectDB();
  const orders = await Order.find({ user: session.user.id }).sort({ createdAt: -1 });
  return NextResponse.json(orders);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = orderCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const session = await auth();

  await connectDB();

  let subtotal = 0;
  let customSubtotal = 0;
  const items = [];

  for (const item of parsed.data.items) {
    if (item.type === "catalog") {
      const product = await Product.findById(item.product);
      if (!product) {
        return NextResponse.json({ error: `Produit ${item.product} introuvable.` }, { status: 404 });
      }
      const unitPrice = product.discountPrice ?? product.basePrice;
      subtotal += unitPrice * item.quantity;
      items.push({
        type: "catalog" as const,
        product: product._id,
        quantity: item.quantity,
        unitPrice,
        snapshot: product.toObject(),
      });
    } else {
      const design = await CustomDesign.findById(item.customDesign);
      if (!design) {
        return NextResponse.json(
          { error: `Design ${item.customDesign} introuvable.` },
          { status: 404 }
        );
      }
      const designTotal = design.price?.total ?? 0;
      subtotal += designTotal * item.quantity;
      customSubtotal += designTotal * item.quantity;
      items.push({
        type: "custom" as const,
        customDesign: design._id,
        quantity: item.quantity,
        unitPrice: designTotal,
        snapshot: design.toObject(),
      });
      design.status = "ordered";
      await design.save();
    }
  }

  const shippingCost = subtotal >= 15000 ? 0 : 800;
  const total = subtotal + shippingCost;
  const orderNumber = await generateOrderNumber();
  // Articles catalogue : payés à la livraison (COD). Articles personnalisés : acompte
  // requis avant lancement en fabrication, voir PRICING_CONFIG.depositRate.
  const depositRequired = calculateDeposit(customSubtotal);

  const order = await Order.create({
    orderNumber,
    user: session?.user?.id,
    contactName: parsed.data.contactName,
    contactPhone: parsed.data.contactPhone,
    items,
    shippingAddress: parsed.data.shippingAddress,
    payment: { status: "unpaid", depositRequired, depositReceived: false },
    subtotal,
    shippingCost,
    total,
    statusHistory: [{ status: "pending", date: new Date() }],
  });

  return NextResponse.json(order, { status: 201 });
}
