import { notFound } from "next/navigation";
import { Phone } from "lucide-react";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { OrderStatusUpdater } from "@/components/admin/OrderStatusUpdater";
import { NeonCanvasPreview } from "@/components/configurator/NeonCanvasPreview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;

  await connectDB();
  const order = await Order.findById(id).populate("user", "name email").lean();
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase tracking-[0.04em]">Commande {order.orderNumber}</h1>
        <OrderStatusUpdater orderId={String(order._id)} currentStatus={order.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="font-medium text-base">
            {order.guestInfo?.name ?? (order.user as unknown as { name?: string })?.name}
          </p>
          <p className="text-muted-foreground">
            {order.guestInfo?.email ?? (order.user as unknown as { email?: string })?.email}
          </p>
          <p className="mt-2">
            {order.shippingAddress.line1}, {order.shippingAddress.city} {order.shippingAddress.wilaya ?? ""}
          </p>

          {order.guestInfo?.phone && (
            <a href={`tel:${order.guestInfo.phone}`} className="mt-4 inline-block">
              <Button size="sm" className="gap-2">
                <Phone className="h-4 w-4" />
                Appeler {order.guestInfo.phone}
              </Button>
            </a>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Articles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {order.items.map((item, i) => (
            <div key={i} className="border-b border-border pb-6 last:border-0 last:pb-0">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">
                  {item.type === "custom"
                    ? "Enseigne personnalisée"
                    : (item.snapshot?.translations?.[locale]?.name ??
                      item.snapshot?.translations?.fr?.name ??
                      "Produit catalogue")}{" "}
                  × {item.quantity}
                </span>
                <span className="font-semibold text-primary">{item.unitPrice.toLocaleString()} DZD</span>
              </div>

              {item.type === "catalog" && (
                <div className="flex items-center gap-3">
                  {item.snapshot?.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element -- URLs Cloudinary externes ou chemins /demo statiques
                    <img
                      src={item.snapshot.images[0]}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-md border border-border object-cover"
                    />
                  )}
                  <div className="text-xs text-muted-foreground">
                    {item.product && (
                      <Link
                        href={`/admin/produits/${String(item.product)}`}
                        className="text-primary hover:underline"
                      >
                        Voir la fiche produit
                      </Link>
                    )}
                    {item.snapshot?.slug && <p className="mt-1">Réf. : {item.snapshot.slug}</p>}
                  </div>
                </div>
              )}

              {item.type === "custom" && item.snapshot?.paths && (
                <div className="space-y-2">
                  <NeonCanvasPreview
                    paths={item.snapshot.paths}
                    workspaceWidthPx={item.snapshot.dimensions.widthCm / item.snapshot.pxToCmRatio}
                    workspaceHeightPx={item.snapshot.dimensions.heightCm / item.snapshot.pxToCmRatio}
                    className="h-48"
                  />
                  <p className="text-xs text-muted-foreground">
                    {item.snapshot.sourceType === "text" && item.snapshot.sourceText
                      ? `Texte : "${item.snapshot.sourceText}"`
                      : "À partir d'une image importée"}
                    {" — "}
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

      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/50 p-4">
        <span className="font-semibold">Total</span>
        <span className="text-xl font-bold text-primary">{order.total.toLocaleString()} DZD</span>
      </div>
    </div>
  );
}
