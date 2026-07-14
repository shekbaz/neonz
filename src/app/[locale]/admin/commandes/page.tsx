import { getTranslations } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  const { status } = await searchParams;

  const t = await getTranslations("Admin");
  const tStatus = await getTranslations("OrderStatus");
  const tShared = await getTranslations("Admin.orderShared");

  await connectDB();
  const filter = status
    ? { status: status as "pending" | "confirmed" | "in_production" | "shipped" | "delivered" | "cancelled" }
    : {};
  const orders = await Order.find(filter)
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const statusKeys = ["pending", "confirmed", "in_production", "shipped", "delivered", "cancelled"] as const;

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase tracking-[0.04em]">{t("orders")}</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/commandes" className="text-sm text-muted-foreground hover:text-foreground">
          {t("ordersPage.all")}
        </Link>
        {statusKeys.map((key) => (
          <Link
            key={key}
            href={{ pathname: "/admin/commandes", query: { status: key } }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {tStatus(key)}
          </Link>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("ordersPage.colOrderNumber")}</TableHead>
            <TableHead>{t("ordersPage.colItem")}</TableHead>
            <TableHead>{t("ordersPage.colClient")}</TableHead>
            <TableHead>{t("ordersPage.colPhone")}</TableHead>
            <TableHead>{t("ordersPage.colDate")}</TableHead>
            <TableHead>{t("ordersPage.colStatus")}</TableHead>
            <TableHead className="text-end">{t("ordersPage.colTotal")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const clientName = order.contactName ?? (order.user as unknown as { name?: string })?.name ?? "—";
            const clientPhone = order.contactPhone ?? "—";
            const isNew = order.status === "pending";
            const depositPending = (order.payment?.depositRequired ?? 0) > 0 && !order.payment?.depositReceived;
            const firstItem = order.items[0];
            const extraCount = order.items.length - 1;
            const firstItemLabel =
              firstItem?.type === "custom"
                ? tShared("customSign")
                : (firstItem?.snapshot?.translations?.[locale]?.name ??
                  firstItem?.snapshot?.translations?.fr?.name ??
                  tShared("catalogProduct"));
            const firstItemImage = firstItem?.type === "catalog" ? firstItem?.snapshot?.images?.[0] : undefined;
            return (
              <TableRow key={String(order._id)}>
                <TableCell>
                  <Link href={`/admin/commandes/${order._id}`} className="font-medium text-primary hover:underline">
                    {order.orderNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {firstItemImage ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URLs Cloudinary externes ou chemins /demo statiques
                      <img src={firstItemImage} alt="" className="h-10 w-10 shrink-0 rounded-md border border-border object-cover" />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-md border border-dashed border-border" />
                    )}
                    <span className="text-sm">
                      {firstItemLabel}
                      {extraCount > 0 && <span className="text-muted-foreground"> +{extraCount}</span>}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {clientName}
                    {isNew && <Badge className="bg-primary/15 text-primary hover:bg-primary/15">{t("ordersPage.toCall")}</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  {clientPhone !== "—" ? (
                    <a href={`tel:${clientPhone}`} className="text-primary hover:underline">
                      {clientPhone}
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">{tStatus(order.status as never)}</Badge>
                    {depositPending && (
                      <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/15">
                        {t("ordersPage.depositPending")}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-end">{order.total.toLocaleString()} DZD</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {orders.length === 0 && <p className="mt-6 text-sm text-muted-foreground">{t("ordersPage.empty")}</p>}
    </div>
  );
}
