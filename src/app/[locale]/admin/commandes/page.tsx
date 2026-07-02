import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  in_production: "En fabrication",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  await connectDB();
  const filter = status
    ? { status: status as "pending" | "confirmed" | "in_production" | "shipped" | "delivered" | "cancelled" }
    : {};
  const orders = await Order.find(filter)
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Commandes</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/commandes" className="text-sm text-muted-foreground hover:text-foreground">
          Toutes
        </Link>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <Link
            key={key}
            href={{ pathname: "/admin/commandes", query: { status: key } }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {label}
          </Link>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N° commande</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-end">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={String(order._id)}>
              <TableCell>
                <Link href={`/admin/commandes/${order._id}`} className="font-medium text-primary hover:underline">
                  {order.orderNumber}
                </Link>
              </TableCell>
              <TableCell>{(order.user as unknown as { name?: string })?.name ?? "—"}</TableCell>
              <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <Badge variant="secondary">{STATUS_LABELS[order.status]}</Badge>
              </TableCell>
              <TableCell className="text-end">{order.total.toLocaleString()} DZD</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {orders.length === 0 && <p className="mt-6 text-sm text-muted-foreground">Aucune commande.</p>}
    </div>
  );
}
