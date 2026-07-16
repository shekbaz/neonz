import { getTranslations } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

export default async function AdminDashboardPage() {
  const t = await getTranslations("Admin");
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
    { label: t("revenue"), value: `${(totalRevenueAgg[0]?.total ?? 0).toLocaleString()} DZD`, href: "/admin/statistiques" },
    { label: t("orders"), value: orderCount, href: "/admin/commandes" },
    { label: t("customers"), value: customerCount, href: "/admin/clients" },
    { label: t("products"), value: productCount, href: "/admin/produits" },
  ];

  const chartData = revenueByMonth.map((r) => ({
    period: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
    revenue: r.revenue,
    orders: r.orders,
  }));

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase tracking-[0.04em]">{t("dashboard")}</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-3xl font-bold tracking-[0.02em]">{s.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboardPage.monthlyRevenueCard")}</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  );
}
