"use client";

import { useEffect, useRef } from "react";
import { useConfiguratorStore } from "@/store/configuratorStore";

const DEBOUNCE_MS = 400;

/**
 * Lance automatiquement le traçage + la résolution de collision (serveur,
 * voir /api/customize/auto-trace) à chaque changement de contenu ou de
 * dimensions. Jamais bloquant pour l'utilisateur : le statut est exposé via
 * `resolutionStatus`/`resolutionFailureReason` dans le store, en langage
 * clair, sans jamais mentionner "collision" ni de détail technique.
 *
 * Monté une seule fois (page.tsx) pour couvrir aussi bien l'étape 1
 * (contenu) que l'étape 2 (dimensions) sans dupliquer l'effet.
 */
export function useAutoResolveDesign() {
  const {
    sourceType,
    sourceImageUrl,
    sourceText,
    fontId,
    widthCm,
    heightCm,
    traceSettings,
    setPaths,
    setDimensions,
    setTraceSettings,
    setResolutionStatus,
    setIsProcessing,
  } = useConfiguratorStore();

  // Identifiant de requête : seule la réponse du dernier run est appliquée
  // (le debounce n'empêche pas deux requêtes lentes de se chevaucher).
  const runIdRef = useRef(0);
  const isFirstRunRef = useRef(true);

  useEffect(() => {
    const hasContent = sourceType === "image" ? !!sourceImageUrl : sourceText.trim().length > 0;
    if (!hasContent) {
      setResolutionStatus("idle");
      return;
    }

    async function run() {
      const runId = ++runIdRef.current;
      const isStale = () => runId !== runIdRef.current;

      setIsProcessing(true);
      setResolutionStatus("resolving");
      try {
        const res = await fetch("/api/customize/auto-trace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceType,
            sourceImageUrl: sourceType === "image" ? sourceImageUrl : undefined,
            sourceText: sourceType === "text" ? sourceText : undefined,
            fontId: sourceType === "text" ? fontId : undefined,
            targetWidthCm: widthCm,
            targetHeightCm: heightCm,
            startingTraceSettings: traceSettings,
          }),
        });

        if (isStale()) return;

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setResolutionStatus("unresolved", data?.error ?? "genericError");
          return;
        }

        const result = await res.json();
        if (isStale()) return;

        setPaths(result.paths, result.workspaceWidthPx, result.workspaceHeightPx);
        setDimensions(result.widthCm, result.heightCm, result.pxToCm);
        setTraceSettings(result.traceSettingsUsed);
        setResolutionStatus(
          result.resolved ? "resolved" : "unresolved",
          result.resolved ? null : result.failureReasonKey
        );
      } catch {
        if (!isStale()) setResolutionStatus("unresolved", "genericError");
      } finally {
        if (!isStale()) setIsProcessing(false);
      }
    }

    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      run();
      return;
    }
    const timer = setTimeout(run, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // Volontairement PAS turdSize/steps/letterSpacingPx/fontSizePx : ces champs
    // sont auto-ajustés par resolveDesign() lui-même (voir autoResolve.ts) et
    // les inclure ici créerait une boucle (chaque réponse redéclenchant une
    // nouvelle requête). threshold/invert/blurSigma, eux, ne sont jamais
    // modifiés par l'algorithme — seul un réglage manuel les change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sourceType,
    sourceImageUrl,
    sourceText,
    fontId,
    widthCm,
    heightCm,
    traceSettings.threshold,
    traceSettings.invert,
    traceSettings.blurSigma,
  ]);
}
