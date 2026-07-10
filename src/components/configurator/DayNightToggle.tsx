"use client";

import { useTranslations } from "next-intl";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function DayNightToggle({
  value,
  onChange,
}: {
  value: "day" | "night";
  onChange: (value: "day" | "night") => void;
}) {
  const t = useTranslations("Configurator.stepCreate");

  return (
    <div className="inline-flex rounded-full border border-border bg-muted/60 p-1">
      <button
        type="button"
        onClick={() => onChange("day")}
        aria-pressed={value === "day"}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all",
          value === "day"
            ? "bg-[oklch(0.97_0.006_84)] text-[oklch(0.25_0.02_264)] shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Sun className="h-3.5 w-3.5" />
        {t("dayPreview")}
      </button>
      <button
        type="button"
        onClick={() => onChange("night")}
        aria-pressed={value === "night"}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all",
          value === "night"
            ? "bg-[oklch(0.16_0.03_272)] text-[oklch(0.95_0.01_80)] shadow-[0_0_12px_-2px_var(--color-primary)]"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Moon className="h-3.5 w-3.5" />
        {t("nightPreview")}
      </button>
    </div>
  );
}
