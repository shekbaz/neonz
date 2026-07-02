import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { OrderStatusUpdater } from "@/components/admin/OrderStatusUpdater";
import { NeonCanvasPreview } from "@/components/configurator/NeonCanvasPreview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await connectDB();
  const order = await Order.findById(id).populate("user", "name email").lean();
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Commande {order.orderNumber}</h1>
        <OrderStatusUpdater orderId={String(order._id)} currentStatus={order.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p>{(order.user as unknown as { name?: string })?.name}</p>
          <p className="text-muted-foreground">{(order.user as unknown as { email?: string })?.email}</p>
          <p className="mt-2">
            {order.shippingAddress.line1}, {order.shippingAddress.city} {order.shippingAddress.wilaya ?? ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Articles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {order.items.map((item, i) => (
            <div key={i} className="border-b border-white/10 pb-6 last:border-0 last:pb-0">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">
                  {item.type === "custom" ? "Enseigne personnalisée" : "Produit catalogue"} × {item.quantity}
                </span>
                <span className="font-semibold text-primary">{item.unitPrice.toLocaleString()} DZD</span>
              </div>

              {item.type === "custom" && item.snapshot?.paths && (
                <div className="space-y-2">
                  <NeonCanvasPreview
                    paths={item.snapshot.paths}
                    workspaceWidthPx={item.snapshot.dimensions.widthCm / item.snapshot.pxToCmRatio}
                    workspaceHeightPx={item.snapshot.dimensions.heightCm / item.snapshot.pxToCmRatio}
                    className="h-48"
                  />
                  <p className="text-xs text-muted-foreground">
                    Dimensions : {item.snapshot.dimensions?.widthCm}cm x {item.snapshot.dimensions?.heightCm}cm —
                    Support : {item.snapshot.support}
                    {item.snapshot.hasRemote ? " — Avec télécommande" : ""}
                  </p>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
        <span className="font-semibold">Total</span>
        <span className="text-xl font-bold text-primary">{order.total.toLocaleString()} DZD</span>
      </div>
    </div>
  );
}
