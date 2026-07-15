import { getTranslations } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { CategoryDeleteButton } from "@/components/admin/CategoryDeleteButton";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

export default async function AdminCategoriesPage() {
  const t = await getTranslations("Admin");
  await connectDB();
  const categories = await Category.find().sort({ order: 1 }).lean();

  return (
    <div>
      <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl font-bold uppercase tracking-[0.04em]">{t("categories")}</h1>
        <Link href="/admin/categories/nouveau">
          <Button size="sm">{t("categoriesPage.addCategory")}</Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("categoriesPage.colName")}</TableHead>
            <TableHead>{t("categoriesPage.colSlug")}</TableHead>
            <TableHead>{t("categoriesPage.colOrder")}</TableHead>
            <TableHead className="text-end">{t("categoriesPage.colActions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((cat) => (
            <TableRow key={String(cat._id)}>
              <TableCell className="font-medium">{cat.translations?.fr?.name}</TableCell>
              <TableCell>{cat.slug}</TableCell>
              <TableCell>{cat.order}</TableCell>
              <TableCell className="text-end">
                <Link href={`/admin/categories/${String(cat._id)}`}>
                  <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Link>
                <CategoryDeleteButton categoryId={String(cat._id)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {categories.length === 0 && <p className="mt-6 text-sm text-muted-foreground">{t("categoriesPage.empty")}</p>}
    </div>
  );
}
