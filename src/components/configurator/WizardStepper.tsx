"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfiguratorStore, type ConfiguratorStep } from "@/store/configuratorStore";

export function WizardStepper({ current }: { current: ConfiguratorStep }) {
  const t = useTranslations("Configurator.steps");
  const { furthestStepReached, setStep } = useConfiguratorStore();

  const steps: { key: ConfiguratorStep; label: string }[] = [
    { key: 1, label: t("create") },
    { key: 2, label: t("finalize") },
  ];

  return (
    <ol className="mb-10 flex items-center justify-between gap-2">
      {steps.map((step, i) => {
        const reachable = step.key <= furthestStepReached;
        return (
          <li key={step.key} className="flex flex-1 items-center gap-2 last:flex-none">
            <button
              type="button"
              onClick={() => reachable && setStep(step.key)}
              disabled={!reachable}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 font-display text-sm font-bold transition-all enabled:cursor-pointer disabled:cursor-not-allowed",
                current === step.key &&
                  "border-primary bg-primary/10 text-primary dark:shadow-[0_0_14px_-2px_var(--color-primary)]",
                current > step.key && "border-primary bg-primary text-primary-foreground",
                current < step.key && "border-border text-muted-foreground"
              )}
              aria-current={current === step.key ? "step" : undefined}
            >
              {current > step.key ? <Check className="h-4 w-4" /> : step.key}
            </button>
            <span
              className={cn(
                "hidden text-[0.7rem] font-semibold uppercase tracking-[0.14em] sm:inline",
                current === step.key ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mx-1 h-0.5 flex-1 rounded-full transition-colors",
                  current > step.key
                    ? "bg-primary dark:shadow-[0_0_8px_var(--color-primary)]"
                    : "bg-border"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
