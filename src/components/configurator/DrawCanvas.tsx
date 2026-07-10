"use client";

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2, Upload, Undo2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/configurator/ColorPicker";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { useCollisionRecheck } from "@/hooks/useCollisionRecheck";
import { detectEdges, buildSpatialGrid, snapToNearest, type Point, type SpatialGrid } from "@/lib/neon/edgeDetection";
import { NEON_COLORS } from "@/types/neon";

const WORKSPACE_WIDTH_PX = 600;
const WORKSPACE_HEIGHT_PX = 400;
const SNAP_CELL_SIZE = 20;
const SNAP_MAX_DISTANCE = 20;

function sliderValue(v: number | readonly number[]): number {
  return Array.isArray(v) ? v[0] : (v as number);
}

export function DrawCanvas() {
  const t = useTranslations("Configurator.step1");
  const { paths, addDrawnPath, setPaths, undo, canUndo, resolutionStatus, resolutionFailureReason } =
    useConfiguratorStore();
  const recheckCollision = useCollisionRecheck();
  const filterId = useId();

  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const referenceImgRef = useRef<HTMLImageElement | null>(null);
  const isDrawingRef = useRef(false);

  const [currentColor, setCurrentColor] = useState<string>(NEON_COLORS[0].hex);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [edgePoints, setEdgePoints] = useState<Point[]>([]);
  const [spatialGrid, setSpatialGrid] = useState<SpatialGrid | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showEdges, setShowEdges] = useState(false);
  const [edgeThreshold, setEdgeThreshold] = useState(80);

  function toSvgPoint(clientX: number, clientY: number): Point {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const transformed = pt.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  function maybeSnap(p: Point): Point {
    if (!snapEnabled || !spatialGrid) return p;
    return snapToNearest(p, spatialGrid, SNAP_CELL_SIZE, SNAP_MAX_DISTANCE);
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    isDrawingRef.current = true;
    setCurrentPoints([maybeSnap(toSvgPoint(e.clientX, e.clientY))]);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!isDrawingRef.current) return;
    setCurrentPoints((prev) => [...prev, maybeSnap(toSvgPoint(e.clientX, e.clientY))]);
  }

  async function handlePointerUp() {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentPoints.length >= 2) {
      addDrawnPath(currentPoints, currentColor, WORKSPACE_WIDTH_PX, WORKSPACE_HEIGHT_PX);
      await recheckCollision();
    }
    setCurrentPoints([]);
  }

  function runEdgeDetection(threshold: number) {
    const img = referenceImgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = WORKSPACE_WIDTH_PX;
    canvas.height = WORKSPACE_HEIGHT_PX;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, WORKSPACE_WIDTH_PX, WORKSPACE_HEIGHT_PX);
    const imageData = ctx.getImageData(0, 0, WORKSPACE_WIDTH_PX, WORKSPACE_HEIGHT_PX);
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

  function handleClear() {
    setPaths([], WORKSPACE_WIDTH_PX, WORKSPACE_HEIGHT_PX);
  }

  const currentD = currentPoints.length >= 2 ? "M " + currentPoints.map((p) => `${p.x} ${p.y}`).join(" L ") : "";
  // Échantillonnage d'affichage uniquement — la grille de snap, elle, garde tous les points détectés.
  const displayedEdgePoints = showEdges ? edgePoints.filter((_, i) => i % 3 === 0) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="block">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleReferenceUpload} className="hidden" />
          <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> {t("referenceImageLabel")}
          </Button>
        </label>
        <Button type="button" size="sm" variant="outline" onClick={undo} disabled={!canUndo()}>
          <Undo2 className="h-3.5 w-3.5" /> {t("undoStroke")}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handleClear} disabled={paths.length === 0}>
          <Trash2 className="h-3.5 w-3.5" /> {t("clearAll")}
        </Button>
      </div>

      <div>
        <Label className="mb-2 block">{t("strokeColorLabel")}</Label>
        <ColorPicker value={currentColor} onChange={setCurrentColor} />
      </div>

      {referenceImageUrl && (
        <div className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
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

      <div className="relative overflow-hidden rounded-xl bg-[oklch(0.13_0.025_272)] ring-1 ring-foreground/15">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WORKSPACE_WIDTH_PX} ${WORKSPACE_HEIGHT_PX}`}
          className="h-64 w-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <defs>
            <filter id={`${filterId}-draw-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {referenceImageUrl && (
            <image
              href={referenceImageUrl}
              width={WORKSPACE_WIDTH_PX}
              height={WORKSPACE_HEIGHT_PX}
              opacity={0.3}
              preserveAspectRatio="xMidYMid slice"
            />
          )}

          {displayedEdgePoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={1} fill="#FF00FF" opacity={0.6} />
          ))}

          {paths.map((path) => (
            <path
              key={path.id}
              d={path.d}
              stroke={path.color}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              filter={`url(#${filterId}-draw-glow)`}
            />
          ))}

          {currentD && (
            <path
              d={currentD}
              stroke={currentColor}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              filter={`url(#${filterId}-draw-glow)`}
            />
          )}
        </svg>

        {paths.length === 0 && !currentD && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            {t("drawHint")}
          </p>
        )}
      </div>

      {resolutionStatus === "unresolved" && resolutionFailureReason === "editCausedCollision" && (
        <p className="text-sm text-destructive">{t("drawCollisionHint")}</p>
      )}
    </div>
  );
}
