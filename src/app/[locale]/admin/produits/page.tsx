import { Pencil } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ProductDeleteButton } from "@/components/admin/ProductDeleteButton";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default async function AdminProductsPage() {
  const t = await getTranslations("Admin");
  await connectDB();
  const products = await Product.find().sort({ createdAt: -1 }).lean();

  return (
    <div>
      <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl font-bold uppercase tracking-[0.04em]">{t("products")}</h1>
        <Link href="/admin/produits/nouveau">
          <Button size="sm">{t("productsPage.addProduct")}</Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("productsPage.colName")}</TableHead>
            <TableHead>{t("productsPage.colPrice")}</TableHead>
            <TableHead>{t("productsPage.colStock")}</TableHead>
            <TableHead>{t("productsPage.colStatus")}</TableHead>
            <TableHead className="text-end">{t("productsPage.colActions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => (
            <TableRow key={String(p._id)}>
              <TableCell className="font-medium">{p.translations?.fr?.name}</TableCell>
              <TableCell>{p.basePrice.toLocaleString()} DZD</TableCell>
              <TableCell>{p.stock}</TableCell>
              <TableCell>
                <Badge variant={p.isActive ? "default" : "secondary"}>
                  {p.isActive ? t("productsPage.active") : t("productsPage.inactive")}
                </Badge>
              </TableCell>
              <TableCell className="text-end">
                <Link href={`/admin/produits/${String(p._id)}`}>
                  <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Link>
                <ProductDeleteButton productId={String(p._id)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {products.length === 0 && <p className="mt-6 text-sm text-muted-foreground">{t("productsPage.empty")}</p>}
    </div>
  );
}
