import { getTranslations } from "next-intl/server";

export default async function CgvPage() {
  const t = await getTranslations("Cgv");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 font-display text-4xl font-bold uppercase tracking-[0.03em] sm:text-5xl">{t("title")}</h1>
      <div className="space-y-6 text-sm text-muted-foreground">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("objHeading")}</h2>
          <p>{t("objText")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("ordersHeading")}</h2>
          <p>{t("ordersText")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("paymentHeading")}</h2>
          <p>{t("paymentText")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("deliveryHeading")}</h2>
          <p>{t("deliveryText")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("withdrawalHeading")}</h2>
          <p>{t("withdrawalText")}</p>
        </section>
      </div>
    </div>
  );
}
