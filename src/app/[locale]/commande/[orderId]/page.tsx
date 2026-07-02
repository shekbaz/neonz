import { notFound, redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  in_production: "En fabrication",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  await connectDB();
  const order = await Order.findById(orderId).lean();
  if (!order || order.user?.toString() !== session.user.id) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Commande {order.orderNumber}</h1>
        <Badge variant="secondary">{STATUS_LABELS[order.status]}</Badge>
      </div>

      <div className="space-y-3">
        {order.statusHistory.map((h, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-sm">{STATUS_LABELS[h.status]}</span>
            <span className="ms-auto text-xs text-muted-foreground">
              {new Date(h.date).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <div className="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span className="text-primary">{order.total.toLocaleString()} DZD</span>
        </div>
      </div>
    </div>
  );
}
