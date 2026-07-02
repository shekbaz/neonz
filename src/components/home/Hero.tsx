"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function Hero() {
  const t = useTranslations("Home");

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Configurateur néon en ligne
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="max-w-2xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
        >
          {t("heroTitle")}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-5 max-w-xl text-lg text-muted-foreground"
        >
          {t("heroSubtitle")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-10 flex flex-col gap-3 sm:flex-row"
        >
          <Link href="/personnaliser">
            <Button size="lg" className="shadow-[0_0_24px_-6px] shadow-primary/60">
              {t("heroCtaCustomize")}
            </Button>
          </Link>
          <Link href="/catalogue">
            <Button size="lg" variant="outline">
              {t("heroCtaCatalog")}
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
