import { Order } from "@/models/Order";

export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await Order.countDocuments({
    createdAt: { $gte: new Date(`${year}-01-01`), $lt: new Date(`${year + 1}-01-01`) },
  });
  const sequence = String(count + 1).padStart(4, "0");
  return `NZ-${year}-${sequence}`;
}
