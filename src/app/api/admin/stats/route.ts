import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  await connectDB();

  const [totalRevenueAgg, orderCount, customerCount, productCount, revenueByMonth, topProducts] =
    await Promise.all([
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
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
        { $limit: 12 },
      ]),
      Order.aggregate([
        { $unwind: "$items" },
        { $match: { "items.type": "catalog" } },
        { $group: { _id: "$items.product", unitsSold: { $sum: "$items.quantity" } } },
        { $sort: { unitsSold: -1 } },
        { $limit: 5 },
        { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
        { $unwind: "$product" },
      ]),
    ]);

  return NextResponse.json({
    totalRevenue: totalRevenueAgg[0]?.total ?? 0,
    orderCount,
    customerCount,
    productCount,
    revenueByMonth: revenueByMonth.map((r) => ({
      period: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
      revenue: r.revenue,
      orders: r.count,
    })),
    topProducts: topProducts.map((p) => ({
      id: p._id,
      name: p.product.translations.fr.name,
      unitsSold: p.unitsSold,
    })),
  });
}
