"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { NeonCanvasPreview } from "@/components/configurator/NeonCanvasPreview";
import { ColorPicker } from "@/components/configurator/ColorPicker";
import { DayNightToggle } from "@/components/configurator/DayNightToggle";
import { useConfiguratorStore } from "@/store/configuratorStore";

export function Step3ColorAssign() {
  const t = useTranslations("Configurator.step3");
  const { paths, workspaceWidthPx, workspaceHeightPx, setPathColor } = useConfiguratorStore();
  const [selectedPathId, setSelectedPathId] = useState<string | null>(paths[0]?.id ?? null);
  const [background, setBackground] = useState<"day" | "night">("night");

  const selectedPath = paths.find((p) => p.id === selectedPathId);

  return (
    <div className="space-y-6">
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
        className="h-80"
      />

      {selectedPath && (
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Couleur du tracé sélectionné ({selectedPath.id})</p>
          <ColorPicker value={selectedPath.color} onChange={(hex) => setPathColor(selectedPath.id, hex)} />
        </div>
      )}
    </div>
  );
}
