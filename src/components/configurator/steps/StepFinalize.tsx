"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { NeonCanvasEditor, type NeonCanvasHandle } from "@/components/configurator/NeonCanvasEditor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useConfiguratorStore, type SupportType } from "@/store/configuratorStore";
import { calculateDesignPrice, applyFinalOptions } from "@/lib/neon/pricing";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SUPPORT_OPTIONS: { value: SupportType; labelKey: string }[] = [
  { value: "acrylic-transparent", labelKey: "supportAcrylicTransparent" },
  { value: "acrylic-black", labelKey: "supportAcrylicBlack" },
  { value: "silhouette-cut", labelKey: "supportSilhouette" },
];

function deriveSourceType(elements: { type: string }[]): "image" | "text" | "draw" | "mixed" {
  const types = new Set(elements.map((e) => e.type));
  if (types.size === 1 && types.has("text")) return "text";
  if (types.size === 1 && types.has("draw")) return "draw";
  return "mixed";
}

export function StepFinalize() {
  const t = useTranslations("Configurator.stepFinalize");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  const { elements, workspaceWidthPx, workspaceHeightPx, widthCm, heightCm, support, hasRemote, pxToCm, setSupport, setHasRemote, reset } =
    useConfiguratorStore();

  const canvasRef = useRef<NeonCanvasHandle>(null);
  const [submitting, setSubmitting] = useState(false);
  const breakdown = useMemo(
    () =>
      applyFinalOptions(calculateDesignPrice({ elements, pxToCm }), {
        support,
        hasRemote,
        hasController: elements.some((e) => e.blink),
      }),
    [elements, pxToCm, support, hasRemote]
  );

  async function handleOrder() {
    setSubmitting(true);
    try {
      const previewImageUrl = canvasRef.current?.exportDataURL();
      if (!previewImageUrl) throw new Error("Impossible d'exporter l'aperçu du design.");

      const res = await fetch("/api/customize/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: deriveSourceType(elements),
          elements,
          previewImageUrl,
          dimensions: { widthCm, heightCm },
          pxToCmRatio: pxToCm,
          support,
          hasRemote,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Impossible d'enregistrer le design.");
      }

      const design = await res.json();
      const price = breakdown.total;

      reset();
      router.push({
        pathname: "/checkout",
        query: { type: "custom", id: design._id, name: "Enseigne personnalisée", price: String(price) },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <NeonCanvasEditor
        ref={canvasRef}
        elements={elements}
        workspaceWidthPx={workspaceWidthPx}
        workspaceHeightPx={workspaceHeightPx}
        className="h-72"
      />

      <div>
        <Label className="mb-3 block">{t("supportLabel")}</Label>
        <div className="grid grid-cols-3 gap-2">
          {SUPPORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSupport(opt.value)}
              className={cn(
                "rounded-lg border p-3 text-xs font-medium transition-all",
                support === opt.value
                  ? "border-primary bg-primary/10 text-primary dark:shadow-[0_0_14px_-4px_var(--color-primary)]"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              )}
            >
              {t(opt.labelKey as never)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <Label htmlFor="remote">{t("remoteLabel")}</Label>
        <Switch id="remote" checked={hasRemote} onCheckedChange={setHasRemote} />
      </div>

      {elements.some((e) => e.blink) && <p className="text-xs text-muted-foreground">{t("controllerIncludedHint")}</p>}

      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <p className="mb-3 text-sm font-semibold">{t("priceBreakdownTitle")}</p>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <dt>{t("lineTube")}</dt>
            <dd className="tabular-nums">
              {breakdown.tubePrice.toLocaleString()} {tCommon("currency")}
            </dd>
          </div>
          {breakdown.supportSurcharge > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <dt>{t("lineSupport")}</dt>
              <dd className="tabular-nums">
                {breakdown.supportSurcharge.toLocaleString()} {tCommon("currency")}
              </dd>
            </div>
          )}
          {breakdown.remoteSurcharge > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <dt>{t("lineRemote")}</dt>
              <dd className="tabular-nums">
                {breakdown.remoteSurcharge.toLocaleString()} {tCommon("currency")}
              </dd>
            </div>
          )}
          {breakdown.controllerSurcharge > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <dt>{t("lineController")}</dt>
              <dd className="tabular-nums">
                {breakdown.controllerSurcharge.toLocaleString()} {tCommon("currency")}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-6">
        <span className="text-lg font-semibold">{t("totalPrice")}</span>
        <span className="font-display text-4xl font-bold tracking-[0.02em] text-primary">
          {breakdown.total.toLocaleString()} <span className="text-xl">{tCommon("currency")}</span>
        </span>
      </div>

      <Button size="lg" className="glow-primary h-12 w-full text-base" disabled={submitting} onClick={handleOrder}>
        {t("addToCart")}
      </Button>
    </div>
  );
}
