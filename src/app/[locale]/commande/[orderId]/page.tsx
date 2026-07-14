import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const t = await getTranslations("OrderTracking");
  const tStatus = await getTranslations("OrderStatus");
  const tCommon = await getTranslations("Common");

  await connectDB();
  const order = await Order.findById(orderId).lean();
  if (!order || order.user?.toString() !== session.user.id) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase tracking-[0.04em]">{t("title", { orderNumber: order.orderNumber })}</h1>
        <Badge variant="secondary">{tStatus(order.status as never)}</Badge>
      </div>

      <div className="space-y-3">
        {order.statusHistory.map((h, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-sm">{tStatus(h.status as never)}</span>
            <span className="ms-auto text-xs text-muted-foreground">
              {new Date(h.date).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <div className="flex justify-between text-lg font-semibold">
          <span>{tCommon("total")}</span>
          <span className="text-primary">{order.total.toLocaleString()} DZD</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {(order.payment?.depositRequired ?? 0) > 0
            ? t("depositInfo", {
                amount: (order.payment?.depositRequired ?? 0).toLocaleString(),
                status: order.payment?.depositReceived ? t("depositReceived") : t("depositPending"),
              })
            : t("codInfo")}
        </p>
      </div>
    </div>
  );
}
