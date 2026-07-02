"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConfiguratorStep } from "@/store/configuratorStore";

export function WizardStepper({ current }: { current: ConfiguratorStep }) {
  const t = useTranslations("Configurator.steps");
  const steps: { key: ConfiguratorStep; label: string }[] = [
    { key: 1, label: t("content") },
    { key: 2, label: t("trace") },
    { key: 3, label: t("colors") },
    { key: 4, label: t("dimensions") },
    { key: 5, label: t("summary") },
  ];

  return (
    <ol className="mb-10 flex items-center justify-between gap-2">
      {steps.map((step, i) => (
        <li key={step.key} className="flex flex-1 items-center gap-2">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
              current === step.key && "border-primary bg-primary/20 text-primary",
              current > step.key && "border-primary bg-primary text-primary-foreground",
              current < step.key && "border-border text-muted-foreground"
            )}
          >
            {current > step.key ? <Check className="h-4 w-4" /> : step.key}
          </div>
          <span className={cn("hidden text-xs font-medium sm:inline", current === step.key ? "text-foreground" : "text-muted-foreground")}>
            {step.label}
          </span>
          {i < steps.length - 1 && <div className="mx-1 h-px flex-1 bg-muted" />}
        </li>
      ))}
    </ol>
  );
}
