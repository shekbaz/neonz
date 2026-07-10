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
import { toast } from "sonner";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { NeonCanvasPreview, type NeonCanvasHandle } from "@/components/configurator/NeonCanvasPreview";
import { ColorPicker } from "@/components/configurator/ColorPicker";
import { DayNightToggle } from "@/components/configurator/DayNightToggle";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { useCollisionRecheck } from "@/hooks/useCollisionRecheck";
import { MAX_DIMENSION_CM, DEFAULT_GLOW_INTENSITY, NEON_FONTS, NEON_COLORS, type NeonFontId } from "@/types/neon";
import { CONTROLLER_OPTION_PRICE } from "@/lib/neon/pricing";
import { fitAndPlacePaths } from "@/lib/neon/pathTransform";
import { rectPathD, circlePathD } from "@/lib/neon/shapePaths";
import { DEFAULT_TRACE_SETTINGS } from "@/lib/neon/traceSettings";
import { detectEdges, buildSpatialGrid, type Point, type SpatialGrid } from "@/lib/neon/edgeDetection";
import type { NeonPath } from "@/types/neon";

function sliderValue(v: number | readonly number[]): number {
  return Array.isArray(v) ? v[0] : (v as number);
}

const NUDGE_STEP_PX = 6;
const DROP_BOX_RATIO = 0.4; // taille cible d'un élément ajouté, en fraction du workspace
const SNAP_CELL_SIZE = 20;

export function Step1Create() {
  const t = useTranslations("Configurator.stepCreate");
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
    setPaths,
    addPathsGroup,
    addDrawnPath,
    removePaths,
    duplicatePaths,
    nudgePaths,
    rotatePaths,
    scalePaths,
    replaceGroup,
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
  const [selectedPathIds, setSelectedPathIds] = useState<string[]>([]);
  const [soloMode, setSoloMode] = useState(false);
  const [background, setBackground] = useState<"day" | "night">("night");
  const [loadingPrice, setLoadingPrice] = useState(false);
  const canvasRef = useRef<NeonCanvasHandle>(null);
  const dropCounterRef = useRef(0);

  // --- Ajout de contenu (texte / image / dessin / ligne / formes) ---
  const [canvasMode, setCanvasMode] = useState<"select" | "draw" | "line">("select");
  const [addingText, setAddingText] = useState(false);
  const [textValue, setTextValue] = useState("");
  const [textFontId, setTextFontId] = useState<NeonFontId>(NEON_FONTS[0].id);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageTraceSettings, setImageTraceSettings] = useState({
    threshold: DEFAULT_TRACE_SETTINGS.threshold,
    invert: DEFAULT_TRACE_SETTINGS.invert,
    blurSigma: DEFAULT_TRACE_SETTINGS.blurSigma,
  });
  // groupId -> URL de l'image source, pour permettre la revectorisation d'un groupe déjà posé.
  const [groupImageUrls, setGroupImageUrls] = useState<Record<string, string>>({});
  const [revectorizing, setRevectorizing] = useState(false);

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

  const priceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (paths.length === 0) {
      setPriceBreakdown(null);
      return;
    }
    if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current);
    priceDebounceRef.current = setTimeout(async () => {
      setLoadingPrice(true);
      try {
        const res = await fetch("/api/customize/price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paths, workspaceWidthPx, workspaceHeightPx, widthCm, heightCm, support, hasRemote }),
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
  }, [paths, widthCm, heightCm, support, hasRemote]);

  function nextDropPosition(targetWidth: number, targetHeight: number) {
    const cascade = (dropCounterRef.current % 5) * 18;
    dropCounterRef.current += 1;
    return {
      x: (workspaceWidthPx - targetWidth) / 2 + cascade,
      y: (workspaceHeightPx - targetHeight) / 2 + cascade,
    };
  }

  async function handleAddText() {
    if (!textValue.trim()) return;
    try {
      const res = await fetch("/api/customize/text-to-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textValue, fontId: textFontId }),
      });
      if (!res.ok) throw new Error(t("addTextError"));
      const data = await res.json();
      const targetWidth = workspaceWidthPx * DROP_BOX_RATIO;
      const targetHeight = workspaceHeightPx * DROP_BOX_RATIO;
      const { x, y } = nextDropPosition(targetWidth, targetHeight);
      const groupId = `text-${crypto.randomUUID()}`;
      const placed = fitAndPlacePaths<NeonPath>(data.paths, data.workspaceWidthPx, data.workspaceHeightPx, x, y, targetWidth, targetHeight).map(
        (p) => ({ ...p, groupId })
      );
      addPathsGroup(placed);
      setSelectedPathIds(placed.map((p) => p.id));
      setTextValue("");
      setAddingText(false);
      await recheckCollision();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("addTextError"));
    }
  }

  async function vectorizeAndPlace(imageUrl: string, settings: typeof imageTraceSettings, targetBox?: { x: number; y: number; width: number; height: number }) {
    const res = await fetch("/api/customize/vectorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl, ...settings }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? t("addImageError"));
    }
    const data = await res.json();
    const box = targetBox ?? {
      ...nextDropPosition(workspaceWidthPx * DROP_BOX_RATIO, workspaceHeightPx * DROP_BOX_RATIO),
      width: workspaceWidthPx * DROP_BOX_RATIO,
      height: workspaceHeightPx * DROP_BOX_RATIO,
    };
    return fitAndPlacePaths<NeonPath>(data.paths, data.workspaceWidthPx, data.workspaceHeightPx, box.x, box.y, box.width, box.height);
  }

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}));
        throw new Error(data.error ?? t("addImageError"));
      }
      const { url } = await uploadRes.json();
      const groupId = `image-${crypto.randomUUID()}`;
      const placed = (await vectorizeAndPlace(url, imageTraceSettings)).map((p) => ({ ...p, groupId }));
      addPathsGroup(placed);
      setGroupImageUrls((prev) => ({ ...prev, [groupId]: url }));
      setSelectedPathIds(placed.map((p) => p.id));
      await recheckCollision();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("addImageError"));
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  async function handleRevectorize(groupId: string) {
    const imageUrl = groupImageUrls[groupId];
    if (!imageUrl) return;
    const groupIds = paths.filter((p) => p.groupId === groupId).map((p) => p.id);
    const box = canvasRef.current?.getSelectionBBox(groupIds);
    setRevectorizing(true);
    try {
      const placed = await vectorizeAndPlace(
        imageUrl,
        imageTraceSettings,
        box ? { x: box.x, y: box.y, width: box.width, height: box.height } : undefined
      );
      replaceGroup(groupId, placed);
      setSelectedPathIds(placed.map((p) => p.id));
      await recheckCollision();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("addImageError"));
    } finally {
      setRevectorizing(false);
    }
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
  }

  function handleThresholdChange(value: number) {
    setEdgeThreshold(value);
    runEdgeDetection(value);
  }

  async function handleStrokeComplete(points: Point[]) {
    const groupId = `draw-${crypto.randomUUID()}`;
    addDrawnPath(points, drawColor, groupId);
    await recheckCollision();
  }

  async function handleAddShape(shape: "rect" | "circle") {
    const size = Math.min(workspaceWidthPx, workspaceHeightPx) * 0.3;
    const { x, y } = nextDropPosition(size, size);
    const d =
      shape === "rect" ? rectPathD(x, y, size, size) : circlePathD(x + size / 2, y + size / 2, size / 2);
    const groupId = `draw-shape-${crypto.randomUUID()}`;
    const newPath: NeonPath = { id: crypto.randomUUID(), d, color: drawColor, order: 0, groupId };
    addPathsGroup([newPath]);
    setSelectedPathIds([newPath.id]);
    await recheckCollision();
  }

  function handleClearAll() {
    if (paths.length === 0) return;
    if (!window.confirm(t("confirmClearAll"))) return;
    setPaths([], workspaceWidthPx, workspaceHeightPx);
    setSelectedPathIds([]);
    setGroupImageUrls({});
  }

  async function handleExport() {
    await canvasRef.current?.exportAsPNG(`neonz-${Date.now()}.png`);
  }

  function handlePathClick(pathId: string, e: React.MouseEvent) {
    setSelectedPathIds((prev) => {
      if (e.shiftKey) return prev.includes(pathId) ? prev.filter((id) => id !== pathId) : [...prev, pathId];
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
    setSelectedPathIds(duplicatePaths(selectedPathIds));
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
      if (canvasMode !== "select") return;

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
  }, [selectedPathIds, canvasMode]);

  const selectedPaths = paths.filter((p) => selectedPathIds.includes(p.id));
  const anchor = selectedPaths[0];
  const anchorGroupSiblings = anchor?.groupId ? paths.filter((p) => p.groupId === anchor.groupId) : [];
  const canApplyToGroup = anchor?.groupId != null && anchorGroupSiblings.length > selectedPaths.length;
  const selectedIsWholeImageGroup =
    anchor?.groupId?.startsWith("image-") &&
    selectedPathIds.length === anchorGroupSiblings.length &&
    anchorGroupSiblings.every((p) => selectedPathIds.includes(p.id));

  function applyToGroup() {
    if (!anchor?.groupId) return;
    const groupIds = anchorGroupSiblings.map((p) => p.id);
    setPathsGlow(groupIds, anchor.glowIntensity ?? DEFAULT_GLOW_INTENSITY);
    setPathsBlink(groupIds, anchor.blink ?? false);
    setSelectedPathIds(groupIds);
  }

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
          <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleImageFileChange} />
          <Button type="button" size="sm" variant="outline" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage}>
            {uploadingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />} {t("addImage")}
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
        <Button type="button" size="sm" variant="outline" onClick={handleExport} disabled={paths.length === 0}>
          <Download className="h-3.5 w-3.5" /> {t("export")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleClearAll}
          disabled={paths.length === 0}
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
          <label className="block">
            <input ref={referenceFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleReferenceUpload} />
            <Button type="button" size="sm" variant="outline" onClick={() => referenceFileInputRef.current?.click()}>
              <UploadCloud className="h-3.5 w-3.5" /> {t("referenceImageLabel")}
            </Button>
          </label>
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

      <NeonCanvasPreview
        ref={canvasRef}
        paths={paths}
        workspaceWidthPx={workspaceWidthPx}
        workspaceHeightPx={workspaceHeightPx}
        background={background}
        selectedPathIds={canvasMode === "select" ? selectedPathIds : undefined}
        onPathClick={canvasMode === "select" ? handlePathClick : undefined}
        onMarqueeSelect={canvasMode === "select" ? handleMarqueeSelect : undefined}
        onDragCommit={canvasMode === "select" ? handleDragCommit : undefined}
        dimUnselected={canvasMode === "select" && soloMode}
        mode={canvasMode}
        strokeColor={drawColor}
        onStrokeComplete={handleStrokeComplete}
        referenceImageUrl={canvasMode === "draw" || canvasMode === "line" ? referenceImageUrl : undefined}
        snapEnabled={(canvasMode === "draw" || canvasMode === "line") && snapEnabled}
        snapGrid={spatialGrid}
        showEdgePoints={(canvasMode === "draw" || canvasMode === "line") && showEdges}
        edgePoints={edgePoints}
        showGrid
        className="h-72"
      />

      {resolutionStatus === "unresolved" && resolutionFailureReason === "editCausedCollision" && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{t("editCausedCollision")}</p>
        </div>
      )}

      {canvasMode === "select" && paths.length > 0 && (
        <div>
          <Label className="mb-3 block">{t("globalColorLabel")}</Label>
          <ColorPicker value={paths[0].color} onChange={setAllPathColors} />
        </div>
      )}

      {canvasMode === "select" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{t("selectPathHint")}</p>
            <DayNightToggle value={background} onChange={setBackground} />
          </div>

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
            <Button type="button" variant={soloMode ? "default" : "outline"} size="sm" onClick={() => setSoloMode((v) => !v)} disabled={selectedPathIds.length === 0}>
              {soloMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {t("isolate")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleDuplicate} disabled={selectedPathIds.length === 0}>
              <Copy className="h-3.5 w-3.5" /> {t("duplicate")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleDelete} disabled={selectedPathIds.length === 0} className="text-destructive hover:text-destructive">
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
              <ColorPicker value={anchor.color} onChange={(hex) => selectedPathIds.forEach((id) => setPathColor(id, hex))} />

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <Label>{t("glowLabel")}</Label>
                  <span className="text-xs text-muted-foreground">{anchor.glowIntensity ?? DEFAULT_GLOW_INTENSITY}</span>
                </div>
                <Slider min={0} max={100} step={1} value={[anchor.glowIntensity ?? DEFAULT_GLOW_INTENSITY]} onValueChange={(v) => setPathsGlow(selectedPathIds, sliderValue(v))} />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <Label htmlFor="blink-switch">{t("blinkLabel")}</Label>
                  {anchor.blink && <p className="text-xs text-muted-foreground">{t("blinkControllerHint", { price: CONTROLLER_OPTION_PRICE.toLocaleString() })}</p>}
                </div>
                <Switch id="blink-switch" checked={anchor.blink ?? false} onCheckedChange={(v) => setPathsBlink(selectedPathIds, v)} />
              </div>

              {canApplyToGroup && (
                <button type="button" onClick={applyToGroup} className="mt-3 text-xs font-medium text-primary hover:underline">
                  {t("applyToGroup")}
                </button>
              )}

              {selectedIsWholeImageGroup && anchor.groupId && groupImageUrls[anchor.groupId] && (
                <Accordion className="mt-4">
                  <AccordionItem value="image-settings">
                    <AccordionTrigger>{t("advancedTraceToggle")}</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <Label>{t("thresholdLabel")}</Label>
                            <span className="text-xs text-muted-foreground">{imageTraceSettings.threshold}</span>
                          </div>
                          <Slider
                            min={0}
                            max={255}
                            step={1}
                            value={[imageTraceSettings.threshold]}
                            onValueChange={(v) => setImageTraceSettings((s) => ({ ...s, threshold: sliderValue(v) }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="trace-invert">{t("invertLabel")}</Label>
                          <Switch
                            id="trace-invert"
                            checked={imageTraceSettings.invert}
                            onCheckedChange={(v) => setImageTraceSettings((s) => ({ ...s, invert: v }))}
                          />
                        </div>
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <Label>{t("blurLabel")}</Label>
                            <span className="text-xs text-muted-foreground">{imageTraceSettings.blurSigma}</span>
                          </div>
                          <Slider
                            min={0}
                            max={10}
                            step={1}
                            value={[imageTraceSettings.blurSigma]}
                            onValueChange={(v) => setImageTraceSettings((s) => ({ ...s, blurSigma: sliderValue(v) }))}
                          />
                        </div>
                        <Button type="button" size="sm" onClick={() => handleRevectorize(anchor.groupId!)} disabled={revectorizing}>
                          {revectorizing && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {t("revectorize")}
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
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
          {loadingPrice && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        {priceBreakdown ? (
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <dt>{t("lineBase")}</dt>
              <dd className="tabular-nums">
                {priceBreakdown.fixedFee.toLocaleString()} {tCommon("currency")}
              </dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>{t("lineTube")}</dt>
              <dd className="tabular-nums">
                {priceBreakdown.tubePrice.toLocaleString()} {tCommon("currency")}
              </dd>
            </div>
            {priceBreakdown.colorSurcharge > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <dt>{t("lineColors")}</dt>
                <dd className="tabular-nums">
                  {priceBreakdown.colorSurcharge.toLocaleString()} {tCommon("currency")}
                </dd>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <dt>{t("lineSize")}</dt>
              <dd className="tabular-nums">
                {priceBreakdown.sizeSurcharge.toLocaleString()} {tCommon("currency")}
              </dd>
            </div>
            {priceBreakdown.complexitySurcharge > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <dt>{t("lineComplexity")}</dt>
                <dd className="tabular-nums">
                  {priceBreakdown.complexitySurcharge.toLocaleString()} {tCommon("currency")}
                </dd>
              </div>
            )}
            {priceBreakdown.controllerSurcharge > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <dt>{t("lineController")}</dt>
                <dd className="tabular-nums">
                  {priceBreakdown.controllerSurcharge.toLocaleString()} {tCommon("currency")}
                </dd>
              </div>
            )}
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
