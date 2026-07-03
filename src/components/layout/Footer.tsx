import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("Nav");
  const tFooter = useTranslations("Footer");

  return (
    /* La vitrine reste allumée toute la journée : le pied de page vit en mode nuit. */
    <footer className="dark border-t border-border bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6">
        <p className="font-display text-6xl font-bold leading-none tracking-[0.06em] sm:text-8xl">
          NEON<span className="tube">Z</span>
        </p>

        <div className="mt-10 grid gap-10 md:grid-cols-3">
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            {tFooter("tagline")}
          </p>

          <nav className="flex flex-col items-start gap-2.5 text-sm">
            <span className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <span className="tube-dash" aria-hidden />
              {tFooter("shopHeading")}
            </span>
            <Link href="/catalogue" className="text-muted-foreground transition-colors hover:text-foreground">{t("catalog")}</Link>
            <Link href="/personnaliser" className="text-muted-foreground transition-colors hover:text-foreground">{t("customize")}</Link>
          </nav>

          <nav className="flex flex-col items-start gap-2.5 text-sm">
            <span className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <span className="tube-dash" aria-hidden />
              {tFooter("helpHeading")}
            </span>
            <Link href="/faq" className="text-muted-foreground transition-colors hover:text-foreground">{t("faq")}</Link>
            <Link href="/contact" className="text-muted-foreground transition-colors hover:text-foreground">{t("contact")}</Link>
            <Link href="/cgv" className="text-muted-foreground transition-colors hover:text-foreground">{tFooter("terms")}</Link>
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} NEONZ. {tFooter("rights")}</span>
          <span>{tFooter("tagline2")}</span>
        </div>
      </div>
    </footer>
  );
}
