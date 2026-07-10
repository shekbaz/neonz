"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Loader2,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Undo2,
  Redo2,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { NeonCanvasPreview, type NeonCanvasHandle } from "@/components/configurator/NeonCanvasPreview";
import { ColorPicker } from "@/components/configurator/ColorPicker";
import { DayNightToggle } from "@/components/configurator/DayNightToggle";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { useCollisionRecheck } from "@/hooks/useCollisionRecheck";
import { MAX_DIMENSION_CM, DEFAULT_GLOW_INTENSITY } from "@/types/neon";
import { NEON_COLORS } from "@/types/neon";
import { CONTROLLER_OPTION_PRICE } from "@/lib/neon/pricing";

function sliderValue(v: number | readonly number[]): number {
  return Array.isArray(v) ? v[0] : (v as number);
}

const NUDGE_STEP_PX = 6;

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
    resolutionFailureReason,
    priceBreakdown,
    setAllPathColors,
    setPathColor,
    setDimensions,
    setPriceBreakdown,
    removePaths,
    duplicatePaths,
    nudgePaths,
    rotatePaths,
    scalePaths,
    setPathsGlow,
    setPathsBlink,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useConfiguratorStore();
  const recheckCollision = useCollisionRecheck();

  const [localWidth, setLocalWidth] = useState(widthCm);
  const [localHeight, setLocalHeight] = useState(heightCm);
  const [linked, setLinked] = useState(true);
  const [selectedPathIds, setSelectedPathIds] = useState<string[]>(paths[0] ? [paths[0].id] : []);
  const [soloMode, setSoloMode] = useState(false);
  const [background, setBackground] = useState<"day" | "night">("night");
  const [loadingPrice, setLoadingPrice] = useState(false);
  const canvasRef = useRef<NeonCanvasHandle>(null);

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

  function handlePathClick(pathId: string, e: React.MouseEvent) {
    setSelectedPathIds((prev) => {
      if (e.shiftKey) {
        return prev.includes(pathId) ? prev.filter((id) => id !== pathId) : [...prev, pathId];
      }
      return [pathId];
    });
  }

  function handleMarqueeSelect(ids: string[], additive: boolean) {
    if (ids.length === 0 && !additive) return;
    setSelectedPathIds((prev) => (additive ? Array.from(new Set([...prev, ...ids])) : ids));
  }

  function handleDelete() {
    const ok = removePaths(selectedPathIds);
    if (!ok) {
      toast.error(t("cannotDeleteAll"));
      return;
    }
    setSelectedPathIds([]);
    recheckCollision();
  }

  function handleDuplicate() {
    if (selectedPathIds.length === 0) return;
    const newIds = duplicatePaths(selectedPathIds);
    setSelectedPathIds(newIds);
    recheckCollision();
  }

  function handleNudge(dx: number, dy: number) {
    if (selectedPathIds.length === 0) return;
    nudgePaths(selectedPathIds, dx, dy);
    recheckCollision();
  }

  function getPivot() {
    const box = canvasRef.current?.getSelectionBBox(selectedPathIds);
    if (box) return { cx: box.x + box.width / 2, cy: box.y + box.height / 2 };
    return { cx: workspaceWidthPx / 2, cy: workspaceHeightPx / 2 };
  }

  function handleRotate(deltaDeg: number) {
    if (selectedPathIds.length === 0) return;
    const { cx, cy } = getPivot();
    rotatePaths(selectedPathIds, deltaDeg, cx, cy);
    recheckCollision();
  }

  function handleScale(factor: number) {
    if (selectedPathIds.length === 0) return;
    const { cx, cy } = getPivot();
    scalePaths(selectedPathIds, factor, cx, cy);
    recheckCollision();
  }

  function handleDragCommit(ids: string[], dxPx: number, dyPx: number) {
    if (dxPx === 0 && dyPx === 0) return;
    nudgePaths(ids, dxPx, dyPx);
    recheckCollision();
  }

  function handleUndo() {
    undo();
    recheckCollision();
  }

  function handleRedo() {
    redo();
    recheckCollision();
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedPathIds.length > 0) {
        e.preventDefault();
        handleDelete();
      } else if (e.key === "Escape") {
        setSelectedPathIds([]);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPathIds]);

  const globalColor = paths[0]?.color ?? NEON_COLORS[0].hex;
  const selectedPaths = paths.filter((p) => selectedPathIds.includes(p.id));
  const anchor = selectedPaths[0];
  const anchorGroupSiblings = anchor?.groupId ? paths.filter((p) => p.groupId === anchor.groupId) : [];
  const canApplyToGroup = anchor?.groupId != null && anchorGroupSiblings.length > selectedPaths.length;

  function applyToGroup() {
    if (!anchor?.groupId) return;
    const groupIds = anchorGroupSiblings.map((p) => p.id);
    setPathsGlow(groupIds, anchor.glowIntensity ?? DEFAULT_GLOW_INTENSITY);
    setPathsBlink(groupIds, anchor.blink ?? false);
    setSelectedPathIds(groupIds);
  }

  return (
    <div className="space-y-8">
      <NeonCanvasPreview
        paths={paths}
        workspaceWidthPx={workspaceWidthPx}
        workspaceHeightPx={workspaceHeightPx}
        className="h-64"
      />

      {resolutionStatus === "unresolved" && resolutionFailureReason === "editCausedCollision" && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{t("editCausedCollision")}</p>
        </div>
      )}

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
                ref={canvasRef}
                paths={paths}
                workspaceWidthPx={workspaceWidthPx}
                workspaceHeightPx={workspaceHeightPx}
                background={background}
                selectedPathIds={selectedPathIds}
                onPathClick={handlePathClick}
                onMarqueeSelect={handleMarqueeSelect}
                onDragCommit={handleDragCommit}
                dimUnselected={soloMode}
                className="h-64"
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleUndo} disabled={!canUndo()}>
                  <Undo2 className="h-3.5 w-3.5" /> {t("undo")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleRedo} disabled={!canRedo()}>
                  <Redo2 className="h-3.5 w-3.5" /> {t("redo")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedPathIds(paths.map((p) => p.id))}>
                  <CheckSquare className="h-3.5 w-3.5" /> {t("selectAll")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedPathIds([])}>
                  <Square className="h-3.5 w-3.5" /> {t("deselectAll")}
                </Button>
                <Button
                  type="button"
                  variant={soloMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSoloMode((v) => !v)}
                  disabled={selectedPathIds.length === 0}
                >
                  {soloMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {t("isolate")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleDuplicate} disabled={selectedPathIds.length === 0}>
                  <Copy className="h-3.5 w-3.5" /> {t("duplicate")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={selectedPathIds.length === 0}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" /> {t("delete")}
                </Button>
              </div>

              {selectedPathIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="me-1 text-xs text-muted-foreground">{t("nudgeLabel")}</span>
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => handleNudge(0, -NUDGE_STEP_PX)}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => handleNudge(0, NUDGE_STEP_PX)}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => handleNudge(-NUDGE_STEP_PX, 0)}>
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => handleNudge(NUDGE_STEP_PX, 0)}>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  <span className="mx-1 h-4 w-px bg-border" aria-hidden />
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => handleRotate(-15)}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => handleRotate(15)}>
                    <RotateCw className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => handleScale(0.9)}>
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => handleScale(1.1)}>
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {anchor && (
                <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {t("selectionCountLabel", { count: selectedPaths.length })}
                  </p>
                  <ColorPicker
                    value={anchor.color}
                    onChange={(hex) => selectedPathIds.forEach((id) => setPathColor(id, hex))}
                  />

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <Label>{t("glowLabel")}</Label>
                      <span className="text-xs text-muted-foreground">{anchor.glowIntensity ?? DEFAULT_GLOW_INTENSITY}</span>
                    </div>
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      value={[anchor.glowIntensity ?? DEFAULT_GLOW_INTENSITY]}
                      onValueChange={(v) => setPathsGlow(selectedPathIds, sliderValue(v))}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <Label htmlFor="blink-switch">{t("blinkLabel")}</Label>
                      {anchor.blink && (
                        <p className="text-xs text-muted-foreground">
                          {t("blinkControllerHint", { price: CONTROLLER_OPTION_PRICE.toLocaleString() })}
                        </p>
                      )}
                    </div>
                    <Switch
                      id="blink-switch"
                      checked={anchor.blink ?? false}
                      onCheckedChange={(v) => setPathsBlink(selectedPathIds, v)}
                    />
                  </div>

                  {canApplyToGroup && (
                    <button type="button" onClick={applyToGroup} className="mt-3 text-xs font-medium text-primary hover:underline">
                      {t("applyToGroup")}
                    </button>
                  )}
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
            {priceBreakdown.controllerSurcharge > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <dt>{t("lineController")}</dt>
                <dd className="tabular-nums">{priceBreakdown.controllerSurcharge.toLocaleString()} {tCommon("currency")}</dd>
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
