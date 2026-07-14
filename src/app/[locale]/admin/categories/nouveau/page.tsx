import { getTranslations } from "next-intl/server";
import { CategoryForm } from "@/components/admin/CategoryForm";

export default async function NewCategoryPage() {
  const t = await getTranslations("Admin");
  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase tracking-[0.04em]">{t("categoriesPage.newCategory")}</h1>
      <CategoryForm />
    </div>
  );
}
