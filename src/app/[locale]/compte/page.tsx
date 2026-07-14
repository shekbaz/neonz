import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { auth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const t = await getTranslations("Compte");
  const tStatus = await getTranslations("OrderStatus");

  await connectDB();
  const orders = await Order.find({ user: session.user.id }).sort({ createdAt: -1 }).lean();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-2 font-display text-4xl font-bold uppercase tracking-[0.03em] sm:text-5xl">{session.user.name}</h1>
      <p className="mb-8 text-muted-foreground">{session.user.email}</p>

      <h2 className="mb-4 text-xl font-semibold">{t("ordersTitle")}</h2>
      {orders.length === 0 ? (
        <p className="text-muted-foreground">{t("noOrders")}</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={String(order._id)}
              href={`/commande/${String(order._id)}`}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4 hover:border-primary/40"
            >
              <div>
                <p className="font-semibold">{order.orderNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-primary">{order.total.toLocaleString()} DZD</span>
                <Badge variant="secondary">{tStatus(order.status as never)}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
