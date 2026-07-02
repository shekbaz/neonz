"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { NeonCanvasPreview } from "@/components/configurator/NeonCanvasPreview";
import { CollisionWarning } from "@/components/configurator/CollisionWarning";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { MAX_DIMENSION_CM } from "@/types/neon";

export function Step4Dimensions() {
  const t = useTranslations("Configurator.step4");
  const {
    paths,
    workspaceWidthPx,
    workspaceHeightPx,
    widthCm,
    heightCm,
    collisionResult,
    setDimensions,
    setCollisionResult,
  } = useConfiguratorStore();

  const [localWidth, setLocalWidth] = useState(widthCm);
  const [localHeight, setLocalHeight] = useState(heightCm);
  const [recalculating, setRecalculating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setRecalculating(true);
      try {
        const res = await fetch("/api/customize/collision-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paths,
            workspaceWidthPx,
            workspaceHeightPx,
            widthCm: localWidth,
            heightCm: localHeight,
          }),
        });
        const data = await res.json();
        setCollisionResult(data.result);
        setSuggestions(data.suggestions ?? []);
        setDimensions(localWidth, localHeight, data.pxToCm);
      } finally {
        setRecalculating(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localWidth, localHeight]);

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>{t("widthLabel")}</Label>
          <span className="text-sm font-semibold text-primary">{localWidth} cm</span>
        </div>
        <Slider
          min={10}
          max={MAX_DIMENSION_CM}
          step={1}
          value={[localWidth]}
          onValueChange={(v) => setLocalWidth(Array.isArray(v) ? v[0] : v)}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>{t("heightLabel")}</Label>
          <span className="text-sm font-semibold text-primary">{localHeight} cm</span>
        </div>
        <Slider
          min={10}
          max={MAX_DIMENSION_CM}
          step={1}
          value={[localHeight]}
          onValueChange={(v) => setLocalHeight(Array.isArray(v) ? v[0] : v)}
        />
      </div>

      <p className="text-xs text-muted-foreground">{t("maxSizeWarning")}</p>

      {recalculating ? (
        <div className="flex h-64 items-center justify-center gap-3 rounded-2xl border border-white/10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          {t("recalculating")}
        </div>
      ) : (
        <NeonCanvasPreview
          paths={paths}
          workspaceWidthPx={workspaceWidthPx}
          workspaceHeightPx={workspaceHeightPx}
          collisionZones={collisionResult?.zones}
          className="h-64"
        />
      )}

      <CollisionWarning result={collisionResult} suggestions={suggestions} />
    </div>
  );
}
