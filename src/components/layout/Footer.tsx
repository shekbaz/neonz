import { useTranslations } from "next-intl";
import { Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("Nav");

  return (
    <footer className="border-t border-border bg-background/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-3.5 w-3.5" fill="currentColor" />
            </span>
            <span className="text-lg font-bold tracking-tight">NEONZ</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Enseignes lumineuses néon LED, prêtes à l&apos;achat ou entièrement personnalisées.
          </p>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <Link href="/catalogue" className="text-muted-foreground hover:text-foreground">{t("catalog")}</Link>
          <Link href="/personnaliser" className="text-muted-foreground hover:text-foreground">{t("customize")}</Link>
          <Link href="/faq" className="text-muted-foreground hover:text-foreground">{t("faq")}</Link>
          <Link href="/contact" className="text-muted-foreground hover:text-foreground">{t("contact")}</Link>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <Link href="/cgv" className="text-muted-foreground hover:text-foreground">CGV</Link>
        </div>
      </div>

      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} NEONZ. Tous droits réservés.
      </div>
    </footer>
  );
}
