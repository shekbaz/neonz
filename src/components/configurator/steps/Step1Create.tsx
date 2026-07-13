"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
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
  Undo2,
  Redo2,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Type,
  UploadCloud,
  Pencil,
  MousePointer2,
  Minus,
  Square as SquareIcon,
  Circle as CircleIcon,
  Download,
  Trash,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { NeonCanvasEditor, type NeonCanvasHandle } from "@/components/configurator/NeonCanvasEditor";
import { ColorPicker } from "@/components/configurator/ColorPicker";
import { DayNightToggle } from "@/components/configurator/DayNightToggle";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { MAX_DIMENSION_CM, DEFAULT_GLOW_INTENSITY, NEON_FONTS, NEON_COLORS, type NeonFontId } from "@/types/neon";
import type { NeonElement, Point } from "@/types/neon";
import { calculateDesignPrice, CONTROLLER_OPTION_PRICE } from "@/lib/neon/pricing";
import { detectEdges, buildSpatialGrid, type SpatialGrid } from "@/lib/neon/edgeDetection";

function sliderValue(v: number | readonly number[]): number {
  return Array.isArray(v) ? v[0] : (v as number);
}

const NUDGE_STEP_PX = 6;
const SNAP_CELL_SIZE = 20;

export function Step1Create() {
  const t = useTranslations("Configurator.stepCreate");
  const tCommon = useTranslations("Common");
  const {
    elements,
    workspaceWidthPx,
    workspaceHeightPx,
    widthCm,
    heightCm,
    setAllElementColors,
    setElementColor,
    setDimensions,
    setPriceBreakdown,
    priceBreakdown,
    setElements,
    addElement,
    removeElements,
    duplicateElements,
    nudgeElements,
    rotateElements,
    scaleElements,
    setElementsGlow,
    setElementsBlink,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useConfiguratorStore();

  const [localWidth, setLocalWidth] = useState(widthCm);
  const [localHeight, setLocalHeight] = useState(heightCm);
  const [linked, setLinked] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [soloMode, setSoloMode] = useState(false);
  const [background, setBackground] = useState<"day" | "night">("night");
  const canvasRef = useRef<NeonCanvasHandle>(null);

  const [canvasMode, setCanvasMode] = useState<"select" | "draw" | "line">("select");
  const [addingText, setAddingText] = useState(false);
  const [textValue, setTextValue] = useState("");
  const [textFontId, setTextFontId] = useState<NeonFontId>(NEON_FONTS[0].id);

  const [drawColor, setDrawColor] = useState<string>(NEON_COLORS[0].hex);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [edgePoints, setEdgePoints] = useState<Point[]>([]);
  const [spatialGrid, setSpatialGrid] = useState<SpatialGrid | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showEdges, setShowEdges] = useState(false);
  const [edgeThreshold, setEdgeThreshold] = useState(80);
  const referenceImgRef = useRef<HTMLImageElement | null>(null);
  const referenceFileInputRef = useRef<HTMLInputElement>(null);

  const aspectRatio = workspaceWidthPx > 0 ? workspaceHeightPx / workspaceWidthPx : 1;

  function handleWidthChange(value: number) {
    setLocalWidth(value);
    if (linked) setLocalHeight(Math.min(MAX_DIMENSION_CM, Math.max(10, Math.round(value * aspectRatio))));
  }
  function handleHeightChange(value: number) {
    setLocalHeight(value);
    if (linked) setLocalWidth(Math.min(MAX_DIMENSION_CM, Math.max(10, Math.round(value / aspectRatio))));
  }

  const dimensionsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (dimensionsDebounceRef.current) clearTimeout(dimensionsDebounceRef.current);
    dimensionsDebounceRef.current = setTimeout(() => {
      if (localWidth !== widthCm || localHeight !== heightCm) setDimensions(localWidth, localHeight);
    }, 400);
    return () => {
      if (dimensionsDebounceRef.current) clearTimeout(dimensionsDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localWidth, localHeight]);

  const pxToCm = workspaceWidthPx > 0 ? widthCm / workspaceWidthPx : 1;
  useEffect(() => {
    if (elements.length === 0) {
      setPriceBreakdown(null);
      return;
    }
    setPriceBreakdown(calculateDesignPrice({ elements, pxToCm }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, pxToCm]);

  function nextDropPosition() {
    return { x: workspaceWidthPx / 2, y: workspaceHeightPx / 2 };
  }

  function handleAddText() {
    if (!textValue.trim()) return;
    const { x, y } = nextDropPosition();
    const el: NeonElement = {
      id: crypto.randomUUID(),
      type: "text",
      x,
      y,
      content: textValue,
      color: drawColor,
      fontSize: workspaceWidthPx * 0.09,
      fontId: textFontId,
      rotation: 0,
    };
    addElement(el);
    setSelectedIds([el.id]);
    setTextValue("");
    setAddingText(false);
  }

  function runEdgeDetection(threshold: number) {
    const img = referenceImgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = workspaceWidthPx;
    canvas.height = workspaceHeightPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, workspaceWidthPx, workspaceHeightPx);
    const imageData = ctx.getImageData(0, 0, workspaceWidthPx, workspaceHeightPx);
    const edges = detectEdges(imageData, threshold);
    setEdgePoints(edges);
    setSpatialGrid(buildSpatialGrid(edges, SNAP_CELL_SIZE));
  }

  function handleReferenceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setReferenceImageUrl(url);
      const img = new Image();
      img.onload = () => {
        referenceImgRef.current = img;
        runEdgeDetection(edgeThreshold);
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
    if (referenceFileInputRef.current) referenceFileInputRef.current.value = "";
  }

  function handleThresholdChange(value: number) {
    setEdgeThreshold(value);
    runEdgeDetection(value);
  }

  function handleStrokeComplete(points: Point[]) {
    addElement({ id: crypto.randomUUID(), type: "draw", points, color: drawColor });
  }
  function handleLineComplete(a: Point, b: Point) {
    addElement({ id: crypto.randomUUID(), type: "line", x1: a.x, y1: a.y, x2: b.x, y2: b.y, color: drawColor });
  }

  function handleAddShape(shape: "rect" | "circle") {
    const size = Math.min(workspaceWidthPx, workspaceHeightPx) * 0.3;
    const { x, y } = nextDropPosition();
    const el: NeonElement =
      shape === "rect"
        ? { id: crypto.randomUUID(), type: "rect", x: x - size / 2, y: y - size / 2, width: size, height: size, color: drawColor, rotation: 0 }
        : { id: crypto.randomUUID(), type: "circle", x, y, radius: size / 2, color: drawColor, rotation: 0 };
    addElement(el);
    setSelectedIds([el.id]);
  }

  function handleClearAll() {
    if (elements.length === 0) return;
    if (!window.confirm(t("confirmClearAll"))) return;
    setElements([], workspaceWidthPx, workspaceHeightPx);
    setSelectedIds([]);
  }

  function handleExport() {
    canvasRef.current?.exportAsPNG(`neonz-${Date.now()}.png`);
  }

  function handleElementClick(id: string, additive: boolean) {
    setSelectedIds((prev) => {
      if (additive) return prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      return [id];
    });
  }
  function handleMarqueeSelect(ids: string[], additive: boolean) {
    if (ids.length === 0 && !additive) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds((prev) => (additive ? Array.from(new Set([...prev, ...ids])) : ids));
  }

  function handleDelete() {
    const ok = removeElements(selectedIds);
    if (!ok) {
      toast.error(t("cannotDeleteAll"));
      return;
    }
    setSelectedIds([]);
  }
  function handleDuplicate() {
    if (selectedIds.length === 0) return;
    setSelectedIds(duplicateElements(selectedIds));
  }
  function handleNudge(dx: number, dy: number) {
    if (selectedIds.length === 0) return;
    nudgeElements(selectedIds, dx, dy);
  }
  function getPivot() {
    const box = canvasRef.current?.getSelectionBBox(selectedIds);
    if (box) return { cx: box.x + box.width / 2, cy: box.y + box.height / 2 };
    return { cx: workspaceWidthPx / 2, cy: workspaceHeightPx / 2 };
  }
  function handleRotate(deltaDeg: number) {
    if (selectedIds.length === 0) return;
    const { cx, cy } = getPivot();
    rotateElements(selectedIds, deltaDeg, cx, cy);
  }
  function handleScale(factor: number) {
    if (selectedIds.length === 0) return;
    const { cx, cy } = getPivot();
    scaleElements(selectedIds, factor, cx, cy);
  }
  function handleDragCommit(ids: string[], dxPx: number, dyPx: number) {
    if (dxPx === 0 && dyPx === 0) return;
    nudgeElements(ids, dxPx, dyPx);
  }
  function handleResizeCommit(ids: string[], factor: number, cx: number, cy: number) {
    if (ids.length === 0 || factor === 1) return;
    scaleElements(ids, factor, cx, cy);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (canvasMode !== "select") return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length > 0) {
        e.preventDefault();
        handleDelete();
      } else if (e.key === "Escape") {
        setSelectedIds([]);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, canvasMode]);

  const selectedElements = elements.filter((e) => selectedIds.includes(e.id));
  const anchor = selectedElements[0];

  const totalLengthLabel = useMemo(() => {
    if (!priceBreakdown) return null;
    return `${priceBreakdown.totalTubeLengthCm.toLocaleString()} cm`;
  }, [priceBreakdown]);

  return (
    <div className="space-y-8">
      {/* Barre d'ajout */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
        <Button
          type="button"
          size="sm"
          variant={addingText ? "default" : "outline"}
          onClick={() => {
            setCanvasMode("select");
            setAddingText((v) => !v);
          }}
        >
          <Type className="h-3.5 w-3.5" /> {t("addText")}
        </Button>
        <label className="block">
          <input ref={referenceFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleReferenceUpload} />
          <Button type="button" size="sm" variant="outline" onClick={() => referenceFileInputRef.current?.click()}>
            <UploadCloud className="h-3.5 w-3.5" /> {t("addImage")}
          </Button>
        </label>
        <Button
          type="button"
          size="sm"
          variant={canvasMode === "draw" ? "default" : "outline"}
          onClick={() => {
            setAddingText(false);
            setCanvasMode((m) => (m === "draw" ? "select" : "draw"));
          }}
        >
          {canvasMode === "draw" ? <MousePointer2 className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          {canvasMode === "draw" ? t("backToSelect") : t("drawTool")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={canvasMode === "line" ? "default" : "outline"}
          onClick={() => {
            setAddingText(false);
            setCanvasMode((m) => (m === "line" ? "select" : "line"));
          }}
        >
          {canvasMode === "line" ? <MousePointer2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
          {canvasMode === "line" ? t("backToSelect") : t("lineTool")}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => handleAddShape("rect")}>
          <SquareIcon className="h-3.5 w-3.5" /> {t("addRect")}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => handleAddShape("circle")}>
          <CircleIcon className="h-3.5 w-3.5" /> {t("addCircle")}
        </Button>
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        <Button type="button" size="sm" variant="outline" onClick={handleExport} disabled={elements.length === 0}>
          <Download className="h-3.5 w-3.5" /> {t("export")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleClearAll}
          disabled={elements.length === 0}
          className="text-destructive hover:text-destructive"
        >
          <Trash className="h-3.5 w-3.5" /> {t("clearAll")}
        </Button>
      </div>

      {addingText && canvasMode === "select" && (
        <div className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div>
            <Label htmlFor="add-text-input">{t("textLabel")}</Label>
            <Input id="add-text-input" maxLength={60} value={textValue} onChange={(e) => setTextValue(e.target.value.replace(/[\r\n]+/g, " "))} />
          </div>
          <div>
            <Label htmlFor="add-text-font">{t("fontLabel")}</Label>
            <Select items={NEON_FONTS.map((f) => ({ value: f.id, label: f.label }))} value={textFontId} onValueChange={(v) => v && setTextFontId(v as NeonFontId)}>
              <SelectTrigger id="add-text-font" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NEON_FONTS.map((font) => (
                  <SelectItem key={font.id} value={font.id}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block">{t("strokeColorLabel")}</Label>
            <ColorPicker value={drawColor} onChange={setDrawColor} />
          </div>
          <Button type="button" size="sm" onClick={handleAddText} disabled={!textValue.trim()}>
            {t("confirmAddText")}
          </Button>
        </div>
      )}

      {(canvasMode === "draw" || canvasMode === "line") && (
        <div className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div>
            <Label className="mb-2 block">{t("strokeColorLabel")}</Label>
            <ColorPicker value={drawColor} onChange={setDrawColor} />
          </div>
          {referenceImageUrl && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="snap-toggle">{t("snapToggleLabel")}</Label>
                <Switch id="snap-toggle" checked={snapEnabled} onCheckedChange={setSnapEnabled} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>{t("snapSensitivityLabel")}</Label>
                  <span className="text-xs text-muted-foreground">{edgeThreshold}</span>
                </div>
                <Slider min={20} max={150} step={5} value={[edgeThreshold]} onValueChange={(v) => handleThresholdChange(sliderValue(v))} />
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowEdges((v) => !v)}>
                {showEdges ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {t("toggleEdgesLabel")}
              </Button>
            </div>
          )}
        </div>
      )}

      <NeonCanvasEditor
        ref={canvasRef}
        elements={elements}
        workspaceWidthPx={workspaceWidthPx}
        workspaceHeightPx={workspaceHeightPx}
        background={background}
        selectedIds={canvasMode === "select" ? selectedIds : []}
        onElementClick={canvasMode === "select" ? handleElementClick : undefined}
        onMarqueeSelect={canvasMode === "select" ? handleMarqueeSelect : undefined}
        onDragCommit={canvasMode === "select" ? handleDragCommit : undefined}
        onResizeCommit={canvasMode === "select" ? handleResizeCommit : undefined}
        dimUnselected={canvasMode === "select" && soloMode}
        mode={canvasMode}
        strokeColor={drawColor}
        onStrokeComplete={handleStrokeComplete}
        onLineComplete={handleLineComplete}
        referenceImageUrl={canvasMode === "draw" || canvasMode === "line" ? referenceImageUrl : undefined}
        snapEnabled={(canvasMode === "draw" || canvasMode === "line") && snapEnabled}
        snapGrid={spatialGrid}
        showEdgePoints={(canvasMode === "draw" || canvasMode === "line") && showEdges}
        edgePoints={edgePoints}
        showGrid
        className="h-72"
      />

      {canvasMode === "select" && elements.length > 0 && (
        <div>
          <Label className="mb-3 block">{t("globalColorLabel")}</Label>
          <ColorPicker value={elements[0].color} onChange={setAllElementColors} />
        </div>
      )}

      {canvasMode === "select" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{t("selectPathHint")}</p>
            <DayNightToggle value={background} onChange={setBackground} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={undo} disabled={!canUndo()}>
              <Undo2 className="h-3.5 w-3.5" /> {t("undo")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={redo} disabled={!canRedo()}>
              <Redo2 className="h-3.5 w-3.5" /> {t("redo")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedIds(elements.map((e) => e.id))}>
              <CheckSquare className="h-3.5 w-3.5" /> {t("selectAll")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedIds([])}>
              <Square className="h-3.5 w-3.5" /> {t("deselectAll")}
            </Button>
            <Button type="button" variant={soloMode ? "default" : "outline"} size="sm" onClick={() => setSoloMode((v) => !v)} disabled={selectedIds.length === 0}>
              {soloMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {t("isolate")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleDuplicate} disabled={selectedIds.length === 0}>
              <Copy className="h-3.5 w-3.5" /> {t("duplicate")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleDelete} disabled={selectedIds.length === 0} className="text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" /> {t("delete")}
            </Button>
          </div>

          {selectedIds.length > 0 && (
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
                {t("selectionCountLabel", { count: selectedElements.length })}
              </p>
              <ColorPicker value={anchor.color} onChange={(hex) => selectedIds.forEach((id) => setElementColor(id, hex))} />

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <Label>{t("glowLabel")}</Label>
                  <span className="text-xs text-muted-foreground">{anchor.glowIntensity ?? DEFAULT_GLOW_INTENSITY}</span>
                </div>
                <Slider min={0} max={100} step={1} value={[anchor.glowIntensity ?? DEFAULT_GLOW_INTENSITY]} onValueChange={(v) => setElementsGlow(selectedIds, sliderValue(v))} />
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
                <Switch id="blink-switch" checked={anchor.blink ?? false} onCheckedChange={(v) => setElementsBlink(selectedIds, v)} />
              </div>
            </div>
          )}
        </>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Label>{t("linkProportions")}</Label>
          <Switch checked={linked} onCheckedChange={setLinked} />
        </div>
        <p className="text-xs text-muted-foreground">{t("linkedProportionsHint")}</p>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <Label>{t("widthLabel")}</Label>
            <Input type="number" min={10} max={MAX_DIMENSION_CM} value={localWidth} onChange={(e) => handleWidthChange(Number(e.target.value))} className="w-24 text-end" />
          </div>
          <Slider min={10} max={MAX_DIMENSION_CM} step={1} value={[localWidth]} onValueChange={(v) => handleWidthChange(sliderValue(v))} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <Label>{t("heightLabel")}</Label>
            <Input type="number" min={10} max={MAX_DIMENSION_CM} value={localHeight} onChange={(e) => handleHeightChange(Number(e.target.value))} className="w-24 text-end" />
          </div>
          <Slider min={10} max={MAX_DIMENSION_CM} step={1} value={[localHeight]} onValueChange={(v) => handleHeightChange(sliderValue(v))} />
        </div>

        <p className="text-xs text-muted-foreground">{t("maxSizeWarning")}</p>
      </div>

      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">{t("priceBreakdownTitle")}</p>
        </div>
        {priceBreakdown ? (
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <dt>{t("lineLength")}</dt>
              <dd className="tabular-nums">{totalLengthLabel}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5 font-semibold text-foreground">
              <dt>{t("lineTotal")}</dt>
              <dd className="tabular-nums">
                {priceBreakdown.total.toLocaleString()} {tCommon("currency")}
              </dd>
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
