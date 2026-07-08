"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NeonCanvasPreview } from "@/components/configurator/NeonCanvasPreview";
import { ColorPicker } from "@/components/configurator/ColorPicker";
import { DayNightToggle } from "@/components/configurator/DayNightToggle";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { MAX_DIMENSION_CM } from "@/types/neon";
import { NEON_COLORS } from "@/types/neon";

function sliderValue(v: number | readonly number[]): number {
  return Array.isArray(v) ? v[0] : (v as number);
}

export function Step2Style() {
  const t = useTranslations("Configurator.step2");
  const tCommon = useTranslations("Common");
  const {
    paths,
    workspaceWidthPx,
    workspaceHeightPx,
    widthCm,
    heightCm,
    support,
    hasRemote,
    resolutionStatus,
    priceBreakdown,
    setAllPathColors,
    setPathColor,
    setDimensions,
    setPriceBreakdown,
  } = useConfiguratorStore();

  const [localWidth, setLocalWidth] = useState(widthCm);
  const [localHeight, setLocalHeight] = useState(heightCm);
  const [linked, setLinked] = useState(true);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(paths[0]?.id ?? null);
  const [background, setBackground] = useState<"day" | "night">("night");
  const [loadingPrice, setLoadingPrice] = useState(false);

  // Un design déjà auto-agrandi par la résolution de collision (voir
  // useAutoResolveDesign) doit se refléter ici sans que l'utilisateur ait
  // touché les champs lui-même. Ajustement pendant le rendu (plutôt qu'un
  // effet) pour éviter un rendu intermédiaire avec les anciennes valeurs.
  const [syncedWidthCm, setSyncedWidthCm] = useState(widthCm);
  const [syncedHeightCm, setSyncedHeightCm] = useState(heightCm);
  if (widthCm !== syncedWidthCm || heightCm !== syncedHeightCm) {
    setSyncedWidthCm(widthCm);
    setSyncedHeightCm(heightCm);
    setLocalWidth(widthCm);
    setLocalHeight(heightCm);
  }

  const aspectRatio = workspaceWidthPx > 0 ? workspaceHeightPx / workspaceWidthPx : 1;

  function handleWidthChange(value: number) {
    setLocalWidth(value);
    if (linked) {
      setLocalHeight(Math.min(MAX_DIMENSION_CM, Math.max(10, Math.round(value * aspectRatio))));
    }
  }

  function handleHeightChange(value: number) {
    setLocalHeight(value);
    if (linked) {
      setLocalWidth(Math.min(MAX_DIMENSION_CM, Math.max(10, Math.round(value / aspectRatio))));
    }
  }

  const dimensionsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (dimensionsDebounceRef.current) clearTimeout(dimensionsDebounceRef.current);
    dimensionsDebounceRef.current = setTimeout(() => {
      if (localWidth !== widthCm || localHeight !== heightCm) {
        setDimensions(localWidth, localHeight, widthCm > 0 ? heightCm / widthCm : 1);
      }
    }, 400);
    return () => {
      if (dimensionsDebounceRef.current) clearTimeout(dimensionsDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localWidth, localHeight]);

  // Prix live : uniquement une fois le design résolu (tracés garantis sans
  // collision) — support/télécommande sont choisis à l'étape suivante, ce
  // panneau montre déjà base/tube/couleurs/taille pour rendre les choix
  // transparents pendant qu'ils sont faits.
  const priceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (resolutionStatus !== "resolved") return;
    if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current);
    priceDebounceRef.current = setTimeout(async () => {
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
    }, 400);
    return () => {
      if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paths, widthCm, heightCm, support, hasRemote, resolutionStatus]);

  const globalColor = paths[0]?.color ?? NEON_COLORS[0].hex;
  const selectedPath = paths.find((p) => p.id === selectedPathId);
  const selectedIndex = selectedPath ? paths.findIndex((p) => p.id === selectedPath.id) + 1 : 0;

  return (
    <div className="space-y-8">
      <NeonCanvasPreview
        paths={paths}
        workspaceWidthPx={workspaceWidthPx}
        workspaceHeightPx={workspaceHeightPx}
        className="h-64"
      />

      <div>
        <Label className="mb-3 block">{t("globalColorLabel")}</Label>
        <ColorPicker value={globalColor} onChange={setAllPathColors} />
      </div>

      <Accordion>
        <AccordionItem value="advanced-color">
          <AccordionTrigger>{t("advancedColorToggle")}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{t("selectPathHint")}</p>
                <DayNightToggle value={background} onChange={setBackground} />
              </div>

              <NeonCanvasPreview
                paths={paths}
                workspaceWidthPx={workspaceWidthPx}
                workspaceHeightPx={workspaceHeightPx}
                background={background}
                selectedPathId={selectedPathId}
                onPathClick={setSelectedPathId}
                className="h-64"
              />

              {selectedPath && (
                <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {t("selectedPathLabel", { index: selectedIndex })}
                  </p>
                  <ColorPicker value={selectedPath.color} onChange={(hex) => setPathColor(selectedPath.id, hex)} />
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Label>{t("linkProportions")}</Label>
          <Switch checked={linked} onCheckedChange={setLinked} />
        </div>
        <p className="text-xs text-muted-foreground">{t("linkedProportionsHint")}</p>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <Label>{t("widthLabel")}</Label>
            <Input
              type="number"
              min={10}
              max={MAX_DIMENSION_CM}
              value={localWidth}
              onChange={(e) => handleWidthChange(Number(e.target.value))}
              className="w-24 text-end"
            />
          </div>
          <Slider min={10} max={MAX_DIMENSION_CM} step={1} value={[localWidth]} onValueChange={(v) => handleWidthChange(sliderValue(v))} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <Label>{t("heightLabel")}</Label>
            <Input
              type="number"
              min={10}
              max={MAX_DIMENSION_CM}
              value={localHeight}
              onChange={(e) => handleHeightChange(Number(e.target.value))}
              className="w-24 text-end"
            />
          </div>
          <Slider min={10} max={MAX_DIMENSION_CM} step={1} value={[localHeight]} onValueChange={(v) => handleHeightChange(sliderValue(v))} />
        </div>

        <p className="text-xs text-muted-foreground">{t("maxSizeWarning")}</p>
      </div>

      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">{t("priceBreakdownTitle")}</p>
          {loadingPrice && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
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
            <div className="flex justify-between border-t border-border pt-1.5 font-semibold text-foreground">
              <dt>{t("lineTotal")}</dt>
              <dd className="tabular-nums">{priceBreakdown.total.toLocaleString()} {tCommon("currency")}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{t("priceEstimateFootnote")}</p>
      </div>
    </div>
  );
}
