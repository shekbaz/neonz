import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { CategoryForm } from "@/components/admin/CategoryForm";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("Admin");
  await connectDB();

  const category = await Category.findById(id).lean();
  if (!category) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase tracking-[0.04em]">{t("categoriesPage.editCategory")}</h1>
      <CategoryForm
        categoryId={String(category._id)}
        initialData={JSON.parse(
          JSON.stringify({
            slug: category.slug,
            image: category.image ?? "",
            order: category.order,
            translations: category.translations,
          })
        )}
      />
    </div>
  );
}
