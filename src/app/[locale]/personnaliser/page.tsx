"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { WizardStepper } from "@/components/configurator/WizardStepper";
import { Step1ContentType } from "@/components/configurator/steps/Step1ContentType";
import { Step2TracePreview } from "@/components/configurator/steps/Step2TracePreview";
import { Step3ColorAssign } from "@/components/configurator/steps/Step3ColorAssign";
import { Step4Dimensions } from "@/components/configurator/steps/Step4Dimensions";
import { Step5Summary } from "@/components/configurator/steps/Step5Summary";
import { useConfiguratorStore } from "@/store/configuratorStore";

export default function ConfiguratorPage() {
  const t = useTranslations("Configurator");
  const { step, goNext, goBack, canProceedFromCurrentStep } = useConfiguratorStore();

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
        {step === 1 && <Step1ContentType />}
        {step === 2 && <Step2TracePreview />}
        {step === 3 && <Step3ColorAssign />}
        {step === 4 && <Step4Dimensions />}
        {step === 5 && <Step5Summary />}
      </div>

      {step < 5 && (
        <div className="mt-10 flex items-center justify-between">
          <Button variant="ghost" onClick={goBack} disabled={step === 1}>
            {t("back")}
          </Button>
          <div className="text-end">
            {!canProceed && step === 2 && (
              <p className="mb-2 text-xs text-destructive">{t("cannotProceedCollision")}</p>
            )}
            {!canProceed && step === 4 && (
              <p className="mb-2 text-xs text-destructive">{t("cannotProceedCollision")}</p>
            )}
            <Button onClick={goNext} disabled={!canProceed} className="glow-primary px-6">
              {t("next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
