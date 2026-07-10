"use client";

import { useConfiguratorStore } from "@/store/configuratorStore";

/**
 * Revérifie la collision côté serveur (endpoint léger, pas de re-vectorisation)
 * après une mutation géométrique manuelle (ajout ou édition de zone dans le
 * canvas unifié, voir Step1Create.tsx). La validation stricte avant commande
 * reste de toute façon systématique (voir /api/customize/designs).
 */
export function useCollisionRecheck() {
  const { workspaceWidthPx, workspaceHeightPx, widthCm, heightCm, setResolutionStatus } = useConfiguratorStore();

  return async function recheckCollision() {
    const current = useConfiguratorStore.getState().paths;
    if (current.length === 0) return;
    try {
      const res = await fetch("/api/customize/collision-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: current, workspaceWidthPx, workspaceHeightPx, widthCm, heightCm }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.result?.hasCollision) {
        setResolutionStatus("unresolved", "editCausedCollision");
      } else {
        setResolutionStatus("resolved");
      }
    } catch {
      // best-effort : la revalidation stricte a lieu de toute façon avant la commande
    }
  };
}
