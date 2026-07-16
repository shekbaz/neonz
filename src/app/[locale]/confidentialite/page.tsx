import { getTranslations } from "next-intl/server";

export default async function ConfidentialitePage() {
  const t = await getTranslations("Confidentialite");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 font-display text-4xl font-bold uppercase tracking-[0.03em] sm:text-5xl">{t("title")}</h1>
      <div className="space-y-6 text-sm text-muted-foreground">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("collectHeading")}</h2>
          <p>{t("collectText")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("useHeading")}</h2>
          <p>{t("useText")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("shareHeading")}</h2>
          <p>{t("shareText")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("retentionHeading")}</h2>
          <p>{t("retentionText")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("rightsHeading")}</h2>
          <p>{t("rightsText")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("securityHeading")}</h2>
          <p>{t("securityText")}</p>
        </section>
      </div>
    </div>
  );
}
