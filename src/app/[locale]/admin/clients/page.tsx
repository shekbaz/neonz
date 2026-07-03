import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Order } from "@/models/Order";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default async function AdminCustomersPage() {
  await connectDB();
  const customers = await User.find({ role: "client" }).sort({ createdAt: -1 }).lean();

  const orderCounts = await Order.aggregate([
    { $group: { _id: "$user", count: { $sum: 1 }, total: { $sum: "$total" } } },
  ]);
  const orderCountMap = new Map(orderCounts.map((o) => [String(o._id), o]));

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase tracking-[0.04em]">Clients</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Commandes</TableHead>
            <TableHead className="text-end">Total dépensé</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((c) => {
            const stats = orderCountMap.get(String(c._id));
            return (
              <TableRow key={String(c._id)}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>{stats?.count ?? 0}</TableCell>
                <TableCell className="text-end">{(stats?.total ?? 0).toLocaleString()} DZD</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {customers.length === 0 && <p className="mt-6 text-sm text-muted-foreground">Aucun client.</p>}
    </div>
  );
}
