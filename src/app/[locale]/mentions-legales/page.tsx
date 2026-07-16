import { getTranslations } from "next-intl/server";

export default async function MentionsLegalesPage() {
  const t = await getTranslations("MentionsLegales");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 font-display text-4xl font-bold uppercase tracking-[0.03em] sm:text-5xl">{t("title")}</h1>
      <div className="space-y-6 text-sm text-muted-foreground">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("publisherHeading")}</h2>
          <p>{t("publisherText")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("directorHeading")}</h2>
          <p>{t("directorText")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("hostingHeading")}</h2>
          <p>{t("hostingText")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("ipHeading")}</h2>
          <p>{t("ipText")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("liabilityHeading")}</h2>
          <p>{t("liabilityText")}</p>
        </section>
      </div>
    </div>
  );
}
