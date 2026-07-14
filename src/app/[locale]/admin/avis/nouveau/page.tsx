import { getTranslations } from "next-intl/server";
import { TestimonialForm } from "@/components/admin/TestimonialForm";

export default async function NewTestimonialPage() {
  const t = await getTranslations("Admin");
  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase tracking-[0.04em]">{t("reviewsPage.newTestimonial")}</h1>
      <TestimonialForm />
    </div>
  );
}
