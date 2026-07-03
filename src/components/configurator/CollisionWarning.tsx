"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CollisionResult } from "@/types/neon";

interface CollisionWarningProps {
  result: CollisionResult | null;
  suggestions: string[];
  onApplyAutoFix?: () => void;
  isApplyingFix?: boolean;
}

export function CollisionWarning({ result, suggestions, onApplyAutoFix, isApplyingFix }: CollisionWarningProps) {
  const t = useTranslations("Configurator.step2");

  if (!result) return null;

  if (!result.hasCollision) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-600/25 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-400">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        {t("noCollision")}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
      <div className="flex items-start gap-2 text-destructive">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">{t("collisionWarningTitle")}</p>
          <p className="mt-1 text-sm text-destructive/85">{t("collisionWarningDesc")}</p>
        </div>
      </div>

      <ul className="mt-3 space-y-1 font-mono text-xs tabular-nums text-destructive/90">
        {result.zones.slice(0, 5).map((zone, i) => (
          <li key={i}>
            • {zone.pathIds[0]} ↔ {zone.pathIds[1]} — {zone.minDistanceCm.toFixed(2)}cm (min. requis: {result.minAllowedDistanceCm}cm)
          </li>
        ))}
      </ul>

      {suggestions.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-destructive">{t("suggestionsTitle")}</p>
          <ul className="mt-1 list-disc space-y-1 ps-5 text-sm text-destructive/85">
            {suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {onApplyAutoFix && (
        <Button size="sm" variant="secondary" className="mt-4" onClick={onApplyAutoFix} disabled={isApplyingFix}>
          {t("applyAutoFix")}
        </Button>
      )}
    </div>
  );
}
