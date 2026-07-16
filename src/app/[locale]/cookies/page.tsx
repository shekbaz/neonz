import { getTranslations } from "next-intl/server";

export default async function CookiesPage() {
  const t = await getTranslations("Cookies");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 font-display text-4xl font-bold uppercase tracking-[0.03em] sm:text-5xl">{t("title")}</h1>
      <div className="space-y-6 text-sm text-muted-foreground">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("whatHeading")}</h2>
          <p>{t("whatText")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("typesHeading")}</h2>
          <p>{t("typesText")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("purposeHeading")}</h2>
          <p>{t("purposeText")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("managementHeading")}</h2>
          <p>{t("managementText")}</p>
        </section>
      </div>
    </div>
  );
}
