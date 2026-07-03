"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function Hero() {
  const t = useTranslations("Home");

  return (
    <section className="relative overflow-hidden">
      {/* La nuit, la devanture rayonne : néon à gauche, argon à droite. */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -start-32 top-8 h-[26rem] w-[26rem] rounded-full bg-primary/[0.05] blur-[120px] dark:bg-primary/[0.14]" />
        <div className="absolute -end-32 bottom-0 h-[26rem] w-[26rem] rounded-full bg-accent/[0.05] blur-[120px] dark:bg-accent/[0.12]" />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-8 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary"
        >
          <span className="tube-dash" aria-hidden />
          Enseignes néon LED sur-mesure
          <span className="tube-dash" aria-hidden />
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="tube-sign max-w-4xl font-display text-5xl font-bold uppercase leading-[0.95] tracking-[0.02em] text-foreground sm:text-7xl md:text-8xl"
        >
          {t("heroTitle")}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 max-w-lg text-lg leading-relaxed text-muted-foreground"
        >
          {t("heroSubtitle")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12 flex flex-col gap-3 sm:flex-row"
        >
          <Link href="/personnaliser">
            <Button size="lg" className="glow-primary h-12 px-8 text-base">
              {t("heroCtaCustomize")}
            </Button>
          </Link>
          <Link href="/catalogue">
            <Button size="lg" variant="outline" className="h-12 px-8 text-base">
              {t("heroCtaCatalog")}
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
