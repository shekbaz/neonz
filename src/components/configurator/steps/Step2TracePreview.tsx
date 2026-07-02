"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { NeonCanvasPreview } from "@/components/configurator/NeonCanvasPreview";
import { CollisionWarning } from "@/components/configurator/CollisionWarning";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { toast } from "sonner";

export function Step2TracePreview() {
  const t = useTranslations("Configurator.step2");
  const {
    sourceType,
    sourceImageUrl,
    sourceText,
    fontId,
    paths,
    workspaceWidthPx,
    workspaceHeightPx,
    widthCm,
    heightCm,
    collisionResult,
    isProcessing,
    setPaths,
    setDimensions,
    setCollisionResult,
    setIsProcessing,
  } = useConfiguratorStore();

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [extraTurdSize, setExtraTurdSize] = useState(0);
  const [extraSpacing, setExtraSpacing] = useState(0);
  const [applyingFix, setApplyingFix] = useState(false);

  const runPipeline = useCallback(
    async (params: { turdSizeOverride?: number; extraLetterSpacingPx?: number }) => {
      setIsProcessing(true);
      try {
        let traceResult: { paths: typeof paths; workspaceWidthPx: number; workspaceHeightPx: number };

        if (sourceType === "image" && sourceImageUrl) {
          const res = await fetch("/api/customize/vectorize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: sourceImageUrl, turdSize: params.turdSizeOverride }),
          });
          if (!res.ok) throw new Error((await res.json()).error ?? "Échec de la vectorisation.");
          traceResult = await res.json();
        } else if (sourceType === "text" && sourceText.trim()) {
          const res = await fetch("/api/customize/text-to-path", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: sourceText, fontId, extraLetterSpacingPx: params.extraLetterSpacingPx }),
          });
          if (!res.ok) throw new Error((await res.json()).error ?? "Échec de la conversion du texte.");
          traceResult = await res.json();
        } else {
          return;
        }

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
        const collisionData = await collisionRes.json();
        setCollisionResult(collisionData.result);
        setSuggestions(collisionData.suggestions ?? []);
        setDimensions(widthCm, heightCm, collisionData.pxToCm);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
      } finally {
        setIsProcessing(false);
        setApplyingFix(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourceType, sourceImageUrl, sourceText, fontId, widthCm, heightCm]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pipeline de vectorisation/collision déclenché à chaque changement de source
    runPipeline({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceType, sourceImageUrl, sourceText, fontId]);

  async function handleAutoFix() {
    setApplyingFix(true);
    if (sourceType === "image") {
      const nextTurdSize = (extraTurdSize || 8) * 2.5;
      setExtraTurdSize(nextTurdSize);
      await runPipeline({ turdSizeOverride: nextTurdSize });
    } else {
      const nextSpacing = extraSpacing + 15;
      setExtraSpacing(nextSpacing);
      await runPipeline({ extraLetterSpacingPx: nextSpacing });
    }
  }

  return (
    <div className="space-y-6">
      {isProcessing ? (
        <div className="flex h-64 items-center justify-center gap-3 rounded-2xl border border-border text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          {t("processing")}
        </div>
      ) : (
        <NeonCanvasPreview
          paths={paths}
          workspaceWidthPx={workspaceWidthPx}
          workspaceHeightPx={workspaceHeightPx}
          collisionZones={collisionResult?.zones}
          className="h-80"
        />
      )}

      <CollisionWarning
        result={collisionResult}
        suggestions={suggestions}
        onApplyAutoFix={handleAutoFix}
        isApplyingFix={applyingFix}
      />
    </div>
  );
}
