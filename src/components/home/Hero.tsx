"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function Hero() {
  const t = useTranslations("Home");

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[140px]" />
      </div>

      <div className="mx-auto flex max-w-5xl flex-col items-center px-4 py-28 text-center sm:px-6 sm:py-40">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-8 text-xs font-medium uppercase tracking-[0.2em] text-primary"
        >
          Enseignes néon LED sur-mesure
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl text-5xl font-semibold tracking-tight text-foreground sm:text-7xl"
        >
          {t("heroTitle")}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-7 max-w-lg text-lg leading-relaxed text-muted-foreground"
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
            <Button size="lg" className="h-12 rounded-full px-8 text-base">
              {t("heroCtaCustomize")}
            </Button>
          </Link>
          <Link href="/catalogue">
            <Button size="lg" variant="ghost" className="h-12 rounded-full px-8 text-base">
              {t("heroCtaCatalog")}
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
