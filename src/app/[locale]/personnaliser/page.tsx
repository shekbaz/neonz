"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { WizardStepper } from "@/components/configurator/WizardStepper";
import { Step1Content } from "@/components/configurator/steps/Step1Content";
import { Step2Style } from "@/components/configurator/steps/Step2Style";
import { Step3Finalize } from "@/components/configurator/steps/Step3Finalize";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { useAutoResolveDesign } from "@/hooks/useAutoResolveDesign";

export default function ConfiguratorPage() {
  const t = useTranslations("Configurator");
  const { step, goNext, goBack, canProceedFromCurrentStep } = useConfiguratorStore();

  useAutoResolveDesign();

  const canProceed = canProceedFromCurrentStep();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
        <span className="tube-dash" aria-hidden />
        Atelier
      </p>
      <h1 className="mb-10 font-display text-5xl font-bold uppercase tracking-[0.03em] sm:text-6xl">{t("title")}</h1>

      <WizardStepper current={step} />

      <div className="min-h-[400px]">
        {step === 1 && <Step1Content />}
        {step === 2 && <Step2Style />}
        {step === 3 && <Step3Finalize />}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={goBack} disabled={step === 1}>
          {t("back")}
        </Button>
        {step < 3 && (
          <Button onClick={goNext} disabled={!canProceed} className="glow-primary px-6">
            {t("next")}
          </Button>
        )}
      </div>
    </div>
  );
}
