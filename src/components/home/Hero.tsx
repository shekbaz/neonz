"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function Hero() {
  const t = useTranslations("Home");

  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-background via-background to-secondary/30">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-10 h-72 w-72 rounded-full bg-primary/30 blur-[100px]" />
        <div className="absolute right-1/4 top-40 h-72 w-72 rounded-full bg-accent/30 blur-[100px]" />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="neon-glow-text max-w-3xl text-4xl font-extrabold tracking-tight text-primary sm:text-6xl"
        >
          {t("heroTitle")}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-6 max-w-xl text-lg text-muted-foreground"
        >
          {t("heroSubtitle")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col gap-4 sm:flex-row"
        >
          <Link href="/personnaliser">
            <Button size="lg" className="neon-glow-box shadow-primary/50">
              {t("heroCtaCustomize")}
            </Button>
          </Link>
          <Link href="/catalogue">
            <Button size="lg" variant="secondary">
              {t("heroCtaCatalog")}
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
