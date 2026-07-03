import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { auth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  await connectDB();
  const orders = await Order.find({ user: session.user.id }).sort({ createdAt: -1 }).lean();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-2 font-display text-4xl font-bold uppercase tracking-[0.03em] sm:text-5xl">{session.user.name}</h1>
      <p className="mb-8 text-muted-foreground">{session.user.email}</p>

      <h2 className="mb-4 text-xl font-semibold">Mes commandes</h2>
      {orders.length === 0 ? (
        <p className="text-muted-foreground">Vous n&apos;avez pas encore de commande.</p>
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
                <Badge variant="secondary">{order.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
