"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { WizardStepper } from "@/components/configurator/WizardStepper";
import { Step1Create } from "@/components/configurator/steps/Step1Create";
import { StepFinalize } from "@/components/configurator/steps/StepFinalize";
import { useConfiguratorStore } from "@/store/configuratorStore";

export default function ConfiguratorPage() {
  const t = useTranslations("Configurator");
  const { step, goNext, goBack, canProceedFromCurrentStep } = useConfiguratorStore();

  const canProceed = canProceedFromCurrentStep();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
        <span className="tube-dash" aria-hidden />
        {t("workshopEyebrow")}
      </p>
      <h1 className="mb-10 font-display text-5xl font-bold uppercase tracking-[0.03em] sm:text-6xl">{t("title")}</h1>

      <WizardStepper current={step} />

      <div className="min-h-[400px]">
        {step === 1 && <Step1Create />}
        {step === 2 && <StepFinalize />}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={goBack} disabled={step === 1}>
          {t("back")}
        </Button>
        {step < 2 && (
          <Button onClick={goNext} disabled={!canProceed} className="glow-primary px-6">
            {t("next")}
          </Button>
        )}
      </div>
    </div>
  );
}
