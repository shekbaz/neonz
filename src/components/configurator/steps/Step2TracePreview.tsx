"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, RotateCcw, SlidersHorizontal } from "lucide-react";
import { NeonCanvasPreview } from "@/components/configurator/NeonCanvasPreview";
import { CollisionWarning } from "@/components/configurator/CollisionWarning";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useConfiguratorStore } from "@/store/configuratorStore";
import type { NeonPath } from "@/types/neon";
import { toast } from "sonner";

/** Délai avant relance du pipeline après un réglage (évite de spammer l'API
 *  à chaque pixel de drag d'un slider). */
const PIPELINE_DEBOUNCE_MS = 400;

interface TraceResult {
  paths: NeonPath[];
  workspaceWidthPx: number;
  workspaceHeightPx: number;
}

/** Extrait un message d'erreur lisible d'une réponse API (l'API peut renvoyer
 *  une chaîne, un objet zod, ou un corps non-JSON). */
async function readApiError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null);
  return data && typeof data.error === "string" ? data.error : fallback;
}

export function Step2TracePreview() {
  const t = useTranslations("Configurator.step2");
  const {
    sourceType,
    sourceImageUrl,
    sourceText,
    fontId,
    traceSettings,
    paths,
    workspaceWidthPx,
    workspaceHeightPx,
    widthCm,
    heightCm,
    collisionResult,
    isProcessing,
    setTraceSettings,
    resetTraceSettings,
    setPaths,
    setDimensions,
    setCollisionResult,
    setIsProcessing,
  } = useConfiguratorStore();

  const [suggestions, setSuggestions] = useState<string[]>([]);
  // Identifiant de requête : seule la réponse du dernier run est appliquée
  // (le debounce n'empêche pas deux requêtes lentes de se chevaucher).
  const runIdRef = useRef(0);

  const runPipeline = useCallback(async () => {
    const runId = ++runIdRef.current;
    const isStale = () => runId !== runIdRef.current;

    setIsProcessing(true);
    try {
      let traceResult: TraceResult;

      if (sourceType === "image" && sourceImageUrl) {
        const res = await fetch("/api/customize/vectorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: sourceImageUrl,
            threshold: traceSettings.threshold,
            turdSize: traceSettings.turdSize,
            steps: traceSettings.steps,
          }),
        });
        if (!res.ok) throw new Error(await readApiError(res, "Échec de la vectorisation."));
        traceResult = await res.json();
      } else if (sourceType === "text" && sourceText.trim()) {
        const res = await fetch("/api/customize/text-to-path", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: sourceText,
            fontId,
            fontSizePx: traceSettings.fontSizePx,
            extraLetterSpacingPx: traceSettings.letterSpacingPx,
          }),
        });
        if (!res.ok) throw new Error(await readApiError(res, "Échec de la conversion du texte."));
        traceResult = await res.json();
      } else {
        return;
      }

      if (isStale()) return;
      setPaths(traceResult.paths, traceResult.workspaceWidthPx, traceResult.workspaceHeightPx);

      const collisionRes = await fetch("/api/customize/collision-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paths: traceResult.paths,
          workspaceWidthPx: traceResult.workspaceWidthPx,
          workspaceHeightPx: traceResult.workspaceHeightPx,
          widthCm,
          heightCm,
        }),
      });
      if (!collisionRes.ok) {
        throw new Error(await readApiError(collisionRes, "Échec de la vérification de collision."));
      }
      const collisionData = await collisionRes.json();
      if (isStale()) return;
      setCollisionResult(collisionData.result);
      setSuggestions(collisionData.suggestions ?? []);
      setDimensions(widthCm, heightCm, collisionData.pxToCm);
    } catch (error) {
      if (!isStale()) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
      }
    } finally {
      if (!isStale()) setIsProcessing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceType, sourceImageUrl, sourceText, fontId, traceSettings, widthCm, heightCm]);

  // Relance le pipeline à chaque changement de source OU de réglage,
  // avec un léger debounce pour absorber les drags de slider.
  const isFirstRunRef = useRef(true);
  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      runPipeline();
      return;
    }
    const timer = setTimeout(runPipeline, PIPELINE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [runPipeline]);

  function handleAutoFix() {
    if (sourceType === "image") {
      setTraceSettings({
        turdSize: Math.min(200, Math.round(traceSettings.turdSize * 2.5)),
      });
    } else {
      setTraceSettings({
        letterSpacingPx: Math.min(200, traceSettings.letterSpacingPx + 15),
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <NeonCanvasPreview
          paths={paths}
          workspaceWidthPx={workspaceWidthPx}
          workspaceHeightPx={workspaceHeightPx}
          collisionZones={collisionResult?.zones}
          className="h-80"
        />
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center gap-3 rounded-xl bg-background/60 text-sm text-muted-foreground backdrop-blur-[2px]">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t("processing")}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            {t("settingsTitle")}
          </p>
          <Button variant="ghost" size="sm" onClick={resetTraceSettings}>
            <RotateCcw className="h-3.5 w-3.5" />
            {t("resetSettings")}
          </Button>
        </div>

        {sourceType === "image" ? (
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <SettingSlider
              label={t("threshold")}
              hint={t("thresholdHint")}
              value={traceSettings.threshold}
              min={0}
              max={255}
              step={1}
              onChange={(threshold) => setTraceSettings({ threshold })}
            />
            <SettingSlider
              label={t("turdSize")}
              hint={t("turdSizeHint")}
              value={traceSettings.turdSize}
              min={2}
              max={100}
              step={1}
              unit=" px"
              onChange={(turdSize) => setTraceSettings({ turdSize })}
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="trace-steps">{t("steps")}</Label>
              <Select
                value={String(traceSettings.steps)}
                onValueChange={(v) => setTraceSettings({ steps: Number(v) })}
              >
                <SelectTrigger id="trace-steps" className="w-full sm:w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t("stepsSimple")}</SelectItem>
                  <SelectItem value="2">{t("stepsLevels", { count: 2 })}</SelectItem>
                  <SelectItem value="3">{t("stepsLevels", { count: 3 })}</SelectItem>
                  <SelectItem value="4">{t("stepsLevels", { count: 4 })}</SelectItem>
                  <SelectItem value="5">{t("stepsLevels", { count: 5 })}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("stepsHint")}</p>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <SettingSlider
              label={t("fontSize")}
              hint={t("fontSizeHint")}
              value={traceSettings.fontSizePx}
              min={80}
              max={400}
              step={5}
              unit=" px"
              onChange={(fontSizePx) => setTraceSettings({ fontSizePx })}
            />
            <SettingSlider
              label={t("letterSpacing")}
              hint={t("letterSpacingHint")}
              value={traceSettings.letterSpacingPx}
              min={0}
              max={100}
              step={1}
              unit=" px"
              onChange={(letterSpacingPx) => setTraceSettings({ letterSpacingPx })}
            />
          </div>
        )}
      </div>

      <CollisionWarning
        result={collisionResult}
        suggestions={suggestions}
        onApplyAutoFix={handleAutoFix}
        isApplyingFix={isProcessing}
      />
    </div>
  );
}

function sliderValue(v: number | readonly number[]): number {
  return Array.isArray(v) ? v[0] : (v as number);
}

interface SettingSliderProps {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}

function SettingSlider({
  label,
  hint,
  value,
  min,
  max,
  step,
  unit = "",
  onChange,
}: SettingSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label>{label}</Label>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {value}
          {unit}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(sliderValue(v))}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
