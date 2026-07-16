import { getTranslations } from "next-intl/server";
import { PricingConfigForm } from "@/components/admin/PricingConfigForm";
import { getPricingSettings } from "@/lib/neon/getPricingSettings";

export default async function AdminPricingPage() {
  const t = await getTranslations("Admin");
  const settings = await getPricingSettings();

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase tracking-[0.04em]">{t("pricingPage.title")}</h1>
      <PricingConfigForm initialSettings={settings} />
    </div>
  );
}
