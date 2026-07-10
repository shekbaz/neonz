"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { NeonCanvasPreview } from "@/components/configurator/NeonCanvasPreview";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useConfiguratorStore, type SupportType } from "@/store/configuratorStore";
import { deriveSourceType } from "@/lib/neon/deriveSourceType";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SUPPORT_OPTIONS: { value: SupportType; labelKey: string }[] = [
  { value: "acrylic-transparent", labelKey: "supportAcrylicTransparent" },
  { value: "acrylic-black", labelKey: "supportAcrylicBlack" },
  { value: "silhouette-cut", labelKey: "supportSilhouette" },
];

export function StepFinalize() {
  const t = useTranslations("Configurator.stepFinalize");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  const {
    paths,
    workspaceWidthPx,
    workspaceHeightPx,
    widthCm,
    heightCm,
    support,
    hasRemote,
    priceBreakdown,
    pxToCm,
    setSupport,
    setHasRemote,
    setPriceBreakdown,
    reset,
  } = useConfiguratorStore();

  const [loadingPrice, setLoadingPrice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchPrice() {
      setLoadingPrice(true);
      try {
        const res = await fetch("/api/customize/price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paths,
            workspaceWidthPx,
            workspaceHeightPx,
            widthCm,
            heightCm,
            support,
            hasRemote,
          }),
        });
        if (res.ok) setPriceBreakdown(await res.json());
      } finally {
        setLoadingPrice(false);
      }
    }
    fetchPrice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [support, hasRemote]);

  async function handleOrder() {
    setSubmitting(true);
    try {
      const sourceType = deriveSourceType(paths);
      const res = await fetch("/api/customize/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          paths,
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
      const price = priceBreakdown?.total ?? 0;

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
      <NeonCanvasPreview
        paths={paths}
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

      {paths.some((p) => p.blink) && (
        <p className="text-xs text-muted-foreground">{t("controllerIncludedHint")}</p>
      )}

      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <p className="mb-3 text-sm font-semibold">{t("priceBreakdownTitle")}</p>
        {priceBreakdown ? (
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <dt>{t("lineBase")}</dt>
              <dd className="tabular-nums">{priceBreakdown.fixedFee.toLocaleString()} {tCommon("currency")}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>{t("lineTube")}</dt>
              <dd className="tabular-nums">{priceBreakdown.tubePrice.toLocaleString()} {tCommon("currency")}</dd>
            </div>
            {priceBreakdown.colorSurcharge > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <dt>{t("lineColors")}</dt>
                <dd className="tabular-nums">{priceBreakdown.colorSurcharge.toLocaleString()} {tCommon("currency")}</dd>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <dt>{t("lineSize")}</dt>
              <dd className="tabular-nums">{priceBreakdown.sizeSurcharge.toLocaleString()} {tCommon("currency")}</dd>
            </div>
            {priceBreakdown.complexitySurcharge > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <dt>{t("lineComplexity")}</dt>
                <dd className="tabular-nums">{priceBreakdown.complexitySurcharge.toLocaleString()} {tCommon("currency")}</dd>
              </div>
            )}
            {priceBreakdown.supportSurcharge > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <dt>{t("lineSupport")}</dt>
                <dd className="tabular-nums">{priceBreakdown.supportSurcharge.toLocaleString()} {tCommon("currency")}</dd>
              </div>
            )}
            {priceBreakdown.remoteSurcharge > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <dt>{t("lineRemote")}</dt>
                <dd className="tabular-nums">{priceBreakdown.remoteSurcharge.toLocaleString()} {tCommon("currency")}</dd>
              </div>
            )}
            {priceBreakdown.controllerSurcharge > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <dt>{t("lineController")}</dt>
                <dd className="tabular-nums">{priceBreakdown.controllerSurcharge.toLocaleString()} {tCommon("currency")}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-6">
        <span className="text-lg font-semibold">{t("totalPrice")}</span>
        {loadingPrice ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <span className="font-display text-4xl font-bold tracking-[0.02em] text-primary">
            {priceBreakdown?.total.toLocaleString() ?? "—"} <span className="text-xl">{tCommon("currency")}</span>
          </span>
        )}
      </div>

      <Button size="lg" className="glow-primary h-12 w-full text-base" disabled={submitting || loadingPrice} onClick={handleOrder}>
        {t("addToCart")}
      </Button>
    </div>
  );
}
