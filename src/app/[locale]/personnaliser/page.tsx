import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default async function ConfiguratorPage() {
  const t = await getTranslations("Configurator");

  return (
    <div className="mx-auto flex min-h-[72vh] max-w-2xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
      <p className="mb-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
        <span className="tube-dash" aria-hidden />
        {t("workshopEyebrow")}
        <span className="tube-dash" aria-hidden />
      </p>

      <svg
        viewBox="0 0 140 64"
        className="flicker-unlit mb-8 h-16 w-36 text-primary"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M8 46 C 20 12, 42 12, 54 32 S 84 56, 100 22 S 118 8, 132 18"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>

      <span className="mb-5 inline-block rounded-full border border-primary/30 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-primary">
        {t("comingSoonBadge")}
      </span>

      <h1 className="mb-4 font-display text-5xl font-bold uppercase tracking-[0.03em] sm:text-6xl">{t("title")}</h1>

      <p className="max-w-md text-lg leading-relaxed text-muted-foreground">{t("comingSoon")}</p>

      <Link href="/catalogue" className="mt-10">
        <Button size="lg" variant="outline" className="h-12 px-8 text-base">
          {t("comingSoonCta")}
        </Button>
      </Link>
    </div>
  );
}
