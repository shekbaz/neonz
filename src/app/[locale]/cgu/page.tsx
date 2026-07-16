import { getTranslations } from "next-intl/server";

export default async function CguPage() {
  const t = await getTranslations("Cgu");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 font-display text-4xl font-bold uppercase tracking-[0.03em] sm:text-5xl">{t("title")}</h1>
      <div className="space-y-6 text-sm text-muted-foreground">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("purposeHeading")}</h2>
          <p>{t("purposeText")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("accessHeading")}</h2>
          <p>{t("accessText")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("accountHeading")}</h2>
          <p>{t("accountText")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("contentHeading")}</h2>
          <p>{t("contentText")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("ipHeading")}</h2>
          <p>{t("ipText")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t("changesHeading")}</h2>
          <p>{t("changesText")}</p>
        </section>
      </div>
    </div>
  );
}
