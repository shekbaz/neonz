import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboardPage() {
  await connectDB();

  const [totalRevenueAgg, orderCount, customerCount, productCount, revenueByMonth] = await Promise.all([
    Order.aggregate([
      { $match: { "payment.status": "paid" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Order.countDocuments(),
    User.countDocuments({ role: "client" }),
    Product.countDocuments(),
    Order.aggregate([
      { $match: { "payment.status": "paid" } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 },
    ]),
  ]);

  const stats = [
    { label: "Chiffre d'affaires", value: `${(totalRevenueAgg[0]?.total ?? 0).toLocaleString()} DZD` },
    { label: "Commandes", value: orderCount },
    { label: "Clients", value: customerCount },
    { label: "Produits", value: productCount },
  ];

  const chartData = revenueByMonth.map((r) => ({
    period: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
    revenue: r.revenue,
    orders: r.orders,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Tableau de bord</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenu mensuel</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  );
}
