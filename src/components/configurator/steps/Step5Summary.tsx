"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { NeonCanvasPreview } from "@/components/configurator/NeonCanvasPreview";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useConfiguratorStore, type SupportType } from "@/store/configuratorStore";
import { useCartStore } from "@/store/cartStore";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SUPPORT_OPTIONS: { value: SupportType; labelKey: string }[] = [
  { value: "acrylic-transparent", labelKey: "supportAcrylicTransparent" },
  { value: "acrylic-black", labelKey: "supportAcrylicBlack" },
  { value: "silhouette-cut", labelKey: "supportSilhouette" },
];

export function Step5Summary() {
  const t = useTranslations("Configurator.step5");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const addCartItem = useCartStore((s) => s.addItem);

  const {
    paths,
    workspaceWidthPx,
    workspaceHeightPx,
    widthCm,
    heightCm,
    support,
    hasRemote,
    priceBreakdown,
    sourceType,
    sourceImageUrl,
    sourceText,
    fontId,
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

  async function handleAddToCart() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/customize/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          sourceImageUrl: sourceType === "image" ? sourceImageUrl : undefined,
          sourceText: sourceType === "text" ? sourceText : undefined,
          fontFamily: sourceType === "text" ? fontId : undefined,
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

      addCartItem({
        id: design._id,
        type: "custom",
        name: sourceType === "text" ? sourceText : "Enseigne personnalisée",
        unitPrice: priceBreakdown?.total ?? 0,
        quantity: 1,
      });

      toast.success("Votre design a été ajouté au panier !");
      reset();
      router.push("/panier");
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
                "rounded-xl border p-3 text-xs font-medium transition-colors",
                support === opt.value ? "border-primary bg-primary/20" : "border-border"
              )}
            >
              {t(opt.labelKey as never)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/50 p-4">
        <Label htmlFor="remote">{t("remoteLabel")}</Label>
        <Switch id="remote" checked={hasRemote} onCheckedChange={setHasRemote} />
      </div>

      <div className="flex items-center justify-between border-t border-border pt-6">
        <span className="text-lg font-semibold">{t("totalPrice")}</span>
        {loadingPrice ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <span className="text-2xl font-bold text-primary">
            {priceBreakdown?.total.toLocaleString() ?? "—"} {tCommon("currency")}
          </span>
        )}
      </div>

      <Button size="lg" className="w-full" disabled={submitting || loadingPrice} onClick={handleAddToCart}>
        {t("addToCart")}
      </Button>
    </div>
  );
}
