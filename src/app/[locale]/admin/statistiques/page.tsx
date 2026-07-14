import { getTranslations } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default async function AdminStatsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("Admin");
  await connectDB();

  const [revenueByMonth, topProducts] = await Promise.all([
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
    Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.type": "catalog" } },
      { $group: { _id: "$items.product", unitsSold: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } } } },
      { $sort: { unitsSold: -1 } },
      { $limit: 10 },
      { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
      { $unwind: "$product" },
    ]),
  ]);

  const chartData = revenueByMonth.map((r) => ({
    period: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
    revenue: r.revenue,
    orders: r.orders,
  }));

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold uppercase tracking-[0.04em]">{t("stats")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("statsPage.monthlyRevenue")}</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={chartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("statsPage.topProducts")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("statsPage.colProduct")}</TableHead>
                <TableHead>{t("statsPage.colUnitsSold")}</TableHead>
                <TableHead className="text-end">{t("statsPage.colRevenue")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProducts.map((p) => (
                <TableRow key={String(p._id)}>
                  <TableCell>{p.product.translations[locale]?.name ?? p.product.translations.fr.name}</TableCell>
                  <TableCell>{p.unitsSold}</TableCell>
                  <TableCell className="text-end">{p.revenue.toLocaleString()} DZD</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {topProducts.length === 0 && <p className="text-sm text-muted-foreground">{t("statsPage.empty")}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
