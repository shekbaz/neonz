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
  const t = useTranslations("Configurator.step3");

  return (
    <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
      <button
        type="button"
        onClick={() => onChange("day")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
          value === "day" ? "bg-white text-black" : "text-muted-foreground"
        )}
      >
        <Sun className="h-3.5 w-3.5" />
        {t("dayPreview")}
      </button>
      <button
        type="button"
        onClick={() => onChange("night")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
          value === "night" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
        )}
      >
        <Moon className="h-3.5 w-3.5" />
        {t("nightPreview")}
      </button>
    </div>
  );
}
