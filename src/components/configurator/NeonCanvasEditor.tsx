"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { NeonElement, Point } from "@/types/neon";
import { DEFAULT_GLOW_INTENSITY, NEON_FONT_FAMILIES } from "@/types/neon";
import type { SpatialGrid } from "@/lib/neon/edgeDetection";
import { snapToNearest } from "@/lib/neon/edgeDetection";
import { elementBBox, unionBBox, type BBox } from "@/lib/neon/elementGeometry";
import { cn } from "@/lib/utils";

export interface NeonCanvasHandle {
  getSelectionBBox: (ids: string[]) => BBox | null;
  exportAsPNG: (fileName: string) => void;
  exportDataURL: () => string | null;
}

interface NeonCanvasEditorProps {
  elements: NeonElement[];
  workspaceWidthPx: number;
  workspaceHeightPx: number;
  background?: "day" | "night";
  selectedIds?: string[];
  onElementClick?: (id: string, additive: boolean) => void;
  onMarqueeSelect?: (ids: string[], additive: boolean) => void;
  onDragCommit?: (ids: string[], dx: number, dy: number) => void;
  onResizeCommit?: (ids: string[], factor: number, cx: number, cy: number) => void;
  dimUnselected?: boolean;
  showGrid?: boolean;
  className?: string;
  /** "draw" capture un trait libre ; "line" capture un segment droit (clic point A, clic point B). */
  mode?: "select" | "draw" | "line";
  strokeColor?: string;
  onStrokeComplete?: (points: Point[]) => void;
  onLineComplete?: (a: Point, b: Point) => void;
  /** Image de référence (superposée en transparence) pour tracer par-dessus en mode dessin. */
  referenceImageUrl?: string | null;
  snapEnabled?: boolean;
  snapGrid?: SpatialGrid | null;
  showEdgePoints?: boolean;
  edgePoints?: Point[];
}

const NEON_TUBE_STROKE_PX = 4;
const HANDLE_SIZE = 10;
const HIT_PADDING = 14;
const GRID_DIVISIONS = 12;
const BLINK_INTERVAL_MS = 650;

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * Math.max(0, Math.min(1, t));
}

type ResizeCorner = "tl" | "tr" | "br" | "bl";
const OPPOSITE: Record<ResizeCorner, ResizeCorner> = { tl: "br", tr: "bl", br: "tl", bl: "tr" };

function bboxCorner(box: BBox, corner: ResizeCorner): Point {
  switch (corner) {
    case "tl":
      return { x: box.x, y: box.y };
    case "tr":
      return { x: box.x + box.width, y: box.y };
    case "br":
      return { x: box.x + box.width, y: box.y + box.height };
    case "bl":
      return { x: box.x, y: box.y + box.height };
  }
}

/**
 * Canvas 2D raster unique pour le configurateur néon : rendu (glow simulé via
 * `shadowBlur`, clignotement, grille de repère, image de référence) et
 * interactions directes à la souris/tactile (sélection, glisser-déposer,
 * marquee, poignées de redimensionnement, capture de trait libre/segment).
 */
export const NeonCanvasEditor = forwardRef<NeonCanvasHandle, NeonCanvasEditorProps>(function NeonCanvasEditor(
  {
    elements,
    workspaceWidthPx,
    workspaceHeightPx,
    background = "night",
    selectedIds = [],
    onElementClick,
    onMarqueeSelect,
    onDragCommit,
    onResizeCommit,
    dimUnselected = false,
    showGrid = false,
    className,
    mode = "select",
    strokeColor = "#FF073A",
    onStrokeComplete,
    onLineComplete,
    referenceImageUrl,
    snapEnabled = false,
    snapGrid = null,
    showEdgePoints = false,
    edgePoints = [],
  },
  ref
) {
  const t = useTranslations("Configurator");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const referenceImgRef = useRef<HTMLImageElement | null>(null);
  const [referenceImgLoaded, setReferenceImgLoaded] = useState(0);

  const [blinkOn, setBlinkOn] = useState(true);

  const marqueeStartRef = useRef<Point | null>(null);
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const marqueeDraggedRef = useRef(false);

  const dragStartRef = useRef<Point | null>(null);
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number } | null>(null);
  const dragMovedRef = useRef(false);

  const resizeStartRef = useRef<{ pivot: Point; startDist: number; originalBBox: BBox } | null>(null);
  const [resizeLive, setResizeLive] = useState<{ pivot: Point; factor: number } | null>(null);

  const isDrawingRef = useRef(false);
  const [currentDrawPoints, setCurrentDrawPoints] = useState<Point[]>([]);

  const lineStartRef = useRef<Point | null>(null);
  const [lineCursor, setLineCursor] = useState<Point | null>(null);

  useEffect(() => {
    lineStartRef.current = null;
    setLineCursor(null);
  }, [mode]);

  useEffect(() => {
    if (!referenceImageUrl) {
      referenceImgRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      referenceImgRef.current = img;
      setReferenceImgLoaded((n) => n + 1);
    };
    img.src = referenceImageUrl;
  }, [referenceImageUrl]);

  useEffect(() => {
    if (!elements.some((e) => e.blink)) return;
    const interval = setInterval(() => setBlinkOn((v) => !v), BLINK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [elements]);

  const selectionBBox = (() => {
    if (selectedIds.length === 0) return null;
    const boxes = elements.filter((e) => selectedIds.includes(e.id)).map(elementBBox);
    return unionBBox(boxes);
  })();

  useImperativeHandle(ref, () => ({
    getSelectionBBox(ids) {
      const boxes = elements.filter((e) => ids.includes(e.id)).map(elementBBox);
      return unionBBox(boxes);
    },
    exportAsPNG(fileName) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = fileName;
      link.href = canvas.toDataURL("image/png");
      link.click();
    },
    exportDataURL() {
      return canvasRef.current?.toDataURL("image/png") ?? null;
    },
  }));

  function drawElement(ctx: CanvasRenderingContext2D, el: NeonElement, isSelected: boolean) {
    if (el.blink && !blinkOn) return;

    const intensity = el.glowIntensity ?? DEFAULT_GLOW_INTENSITY;
    ctx.save();
    ctx.strokeStyle = el.color;
    ctx.fillStyle = el.color;
    ctx.lineWidth = NEON_TUBE_STROKE_PX;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = el.color;
    ctx.shadowBlur = lerp(4, 26, intensity / 100);
    ctx.globalAlpha = dimUnselected && !isSelected ? 0.15 : 1;

    if ("rotation" in el && el.rotation) {
      const box = elementBBox(el);
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    switch (el.type) {
      case "draw": {
        if (el.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(el.points[0].x, el.points[0].y);
          el.points.forEach((p) => ctx.lineTo(p.x, p.y));
          ctx.stroke();
        }
        break;
      }
      case "line": {
        ctx.beginPath();
        ctx.moveTo(el.x1, el.y1);
        ctx.lineTo(el.x2, el.y2);
        ctx.stroke();
        break;
      }
      case "rect": {
        if (el.width && el.height) ctx.strokeRect(el.x, el.y, el.width, el.height);
        break;
      }
      case "circle": {
        if (el.radius) {
          ctx.beginPath();
          ctx.arc(el.x, el.y, el.radius, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
      case "text": {
        ctx.font = `700 ${el.fontSize}px "${NEON_FONT_FAMILIES[el.fontId] ?? "sans-serif"}"`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(el.content, el.x, el.y);
        break;
      }
    }
    ctx.restore();
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = workspaceWidthPx || 1;
    canvas.height = workspaceHeightPx || 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = background === "night" ? "#0a0a0f" : "#f5f4f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (showGrid) {
      const stepX = canvas.width / GRID_DIVISIONS;
      const stepY = canvas.height / GRID_DIVISIONS;
      ctx.save();
      ctx.strokeStyle = background === "night" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
      ctx.lineWidth = 1;
      for (let i = 1; i < GRID_DIVISIONS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * stepX, 0);
        ctx.lineTo(i * stepX, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * stepY);
        ctx.lineTo(canvas.width, i * stepY);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (referenceImgRef.current) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.drawImage(referenceImgRef.current, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    if (showEdgePoints && edgePoints.length > 0) {
      ctx.save();
      ctx.fillStyle = "#FF00FF";
      for (let i = 0; i < edgePoints.length; i += 3) {
        ctx.fillRect(edgePoints[i].x - 1, edgePoints[i].y - 1, 2, 2);
      }
      ctx.restore();
    }

    for (const el of elements) {
      const isSelected = selectedIds.includes(el.id);
      if (isSelected && resizeLive && resizeStartRef.current) {
        ctx.save();
        const { pivot, factor } = resizeLive;
        ctx.translate(pivot.x, pivot.y);
        ctx.scale(factor, factor);
        ctx.translate(-pivot.x, -pivot.y);
        drawElement(ctx, el, isSelected);
        ctx.restore();
      } else if (isSelected && dragOffset) {
        ctx.save();
        ctx.translate(dragOffset.dx, dragOffset.dy);
        drawElement(ctx, el, isSelected);
        ctx.restore();
      } else {
        drawElement(ctx, el, isSelected);
      }
    }

    if (isDrawingRef.current && currentDrawPoints.length >= 2) {
      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = NEON_TUBE_STROKE_PX;
      ctx.lineCap = "round";
      ctx.shadowColor = strokeColor;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(currentDrawPoints[0].x, currentDrawPoints[0].y);
      currentDrawPoints.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.restore();
    }

    if (mode === "line" && lineStartRef.current && lineCursor) {
      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = NEON_TUBE_STROKE_PX;
      ctx.lineCap = "round";
      ctx.setLineDash([8, 5]);
      ctx.shadowColor = strokeColor;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(lineStartRef.current.x, lineStartRef.current.y);
      ctx.lineTo(lineCursor.x, lineCursor.y);
      ctx.stroke();
      ctx.restore();
    }

    // Sélection : contour + poignées de redimensionnement
    if (selectionBBox && mode === "select") {
      const box =
        resizeLive && resizeStartRef.current
          ? (() => {
              const corners: Point[] = (["tl", "tr", "br", "bl"] as ResizeCorner[]).map((c) => {
                const o = bboxCorner(resizeStartRef.current!.originalBBox, c);
                return {
                  x: resizeLive.pivot.x + (o.x - resizeLive.pivot.x) * resizeLive.factor,
                  y: resizeLive.pivot.y + (o.y - resizeLive.pivot.y) * resizeLive.factor,
                };
              });
              const xs = corners.map((c) => c.x);
              const ys = corners.map((c) => c.y);
              return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
            })()
          : dragOffset
            ? { ...selectionBBox, x: selectionBBox.x + dragOffset.dx, y: selectionBBox.y + dragOffset.dy }
            : selectionBBox;

      ctx.save();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.globalAlpha = 0.8;
      ctx.strokeRect(box.x - 6, box.y - 6, box.width + 12, box.height + 12);
      ctx.setLineDash([]);
      ctx.restore();

      if (onResizeCommit && !dragOffset) {
        ctx.save();
        ctx.fillStyle = "#5b8def";
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        for (const corner of ["tl", "tr", "br", "bl"] as ResizeCorner[]) {
          const p = bboxCorner(box, corner);
          ctx.fillRect(p.x - HANDLE_SIZE / 2, p.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
          ctx.strokeRect(p.x - HANDLE_SIZE / 2, p.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
        }
        ctx.restore();
      }
    }

    if (marquee && marqueeDraggedRef.current) {
      ctx.save();
      const x = Math.min(marquee.x1, marquee.x2);
      const y = Math.min(marquee.y1, marquee.y2);
      const w = Math.abs(marquee.x2 - marquee.x1);
      const h = Math.abs(marquee.y2 - marquee.y1);
      ctx.fillStyle = "rgba(91, 141, 239, 0.15)";
      ctx.strokeStyle = "rgba(91, 141, 239, 0.9)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }
  }

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    elements,
    workspaceWidthPx,
    workspaceHeightPx,
    background,
    selectedIds,
    dimUnselected,
    showGrid,
    referenceImgLoaded,
    showEdgePoints,
    edgePoints,
    currentDrawPoints,
    lineCursor,
    marquee,
    dragOffset,
    resizeLive,
    blinkOn,
    mode,
  ]);

  function toWorkspacePoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function maybeSnap(p: Point): Point {
    if (!snapEnabled || !snapGrid) return p;
    return snapToNearest(p, snapGrid, 20, 20);
  }

  function hitTest(p: Point): NeonElement | null {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      const b = elementBBox(el);
      if (
        p.x >= b.x - HIT_PADDING &&
        p.x <= b.x + b.width + HIT_PADDING &&
        p.y >= b.y - HIT_PADDING &&
        p.y <= b.y + b.height + HIT_PADDING
      ) {
        return el;
      }
    }
    return null;
  }

  function resizeHandleAt(p: Point): ResizeCorner | null {
    if (!selectionBBox) return null;
    for (const corner of ["tl", "tr", "br", "bl"] as ResizeCorner[]) {
      const c = bboxCorner(selectionBBox, corner);
      if (Math.abs(p.x - c.x) < HANDLE_SIZE && Math.abs(p.y - c.y) < HANDLE_SIZE) return corner;
    }
    return null;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const p = toWorkspacePoint(e);

    if (mode === "draw") {
      isDrawingRef.current = true;
      setCurrentDrawPoints([maybeSnap(p)]);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (mode === "line") {
      const snapped = maybeSnap(p);
      if (!lineStartRef.current) {
        lineStartRef.current = snapped;
        setLineCursor(snapped);
      } else {
        onLineComplete?.(lineStartRef.current, snapped);
        lineStartRef.current = null;
        setLineCursor(null);
      }
      return;
    }

    // mode === "select"
    const handle = resizeHandleAt(p);
    if (handle && selectionBBox) {
      const pivot = bboxCorner(selectionBBox, OPPOSITE[handle]);
      const startDist = Math.max(1, Math.hypot(p.x - pivot.x, p.y - pivot.y));
      resizeStartRef.current = { pivot, startDist, originalBBox: selectionBBox };
      setResizeLive({ pivot, factor: 1 });
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    const hit = hitTest(p);
    if (hit) {
      if (!selectedIds.includes(hit.id) || !e.shiftKey) {
        onElementClick?.(hit.id, e.shiftKey);
      }
      dragStartRef.current = p;
      dragMovedRef.current = false;
      setDragOffset({ dx: 0, dy: 0 });
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    marqueeStartRef.current = p;
    marqueeDraggedRef.current = false;
    setMarquee({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const p = toWorkspacePoint(e);

    if (mode === "draw") {
      if (!isDrawingRef.current) return;
      setCurrentDrawPoints((prev) => [...prev, maybeSnap(p)]);
      return;
    }

    if (mode === "line") {
      if (!lineStartRef.current) return;
      setLineCursor(maybeSnap(p));
      return;
    }

    if (resizeStartRef.current) {
      const { pivot, startDist } = resizeStartRef.current;
      const dist = Math.hypot(p.x - pivot.x, p.y - pivot.y);
      setResizeLive({ pivot, factor: Math.min(20, Math.max(0.05, dist / startDist)) });
      return;
    }

    if (dragStartRef.current) {
      const dx = p.x - dragStartRef.current.x;
      const dy = p.y - dragStartRef.current.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMovedRef.current = true;
      setDragOffset({ dx, dy });
      return;
    }

    if (marqueeStartRef.current) {
      const start = marqueeStartRef.current;
      if (Math.abs(p.x - start.x) > 3 || Math.abs(p.y - start.y) > 3) marqueeDraggedRef.current = true;
      setMarquee({ x1: start.x, y1: start.y, x2: p.x, y2: p.y });
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (mode === "draw") {
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        if (currentDrawPoints.length >= 2) onStrokeComplete?.(currentDrawPoints);
        setCurrentDrawPoints([]);
      }
      return;
    }

    if (mode === "line") return;

    if (resizeStartRef.current) {
      if (resizeLive && Math.abs(resizeLive.factor - 1) > 0.01 && selectedIds.length > 0) {
        onResizeCommit?.(selectedIds, resizeLive.factor, resizeStartRef.current.pivot.x, resizeStartRef.current.pivot.y);
      }
      resizeStartRef.current = null;
      setResizeLive(null);
      return;
    }

    if (dragStartRef.current) {
      if (dragMovedRef.current && dragOffset && selectedIds.length > 0) {
        onDragCommit?.(selectedIds, dragOffset.dx, dragOffset.dy);
      }
      dragStartRef.current = null;
      dragMovedRef.current = false;
      setDragOffset(null);
      return;
    }

    if (marqueeStartRef.current && marquee) {
      if (marqueeDraggedRef.current) {
        const rx1 = Math.min(marquee.x1, marquee.x2);
        const ry1 = Math.min(marquee.y1, marquee.y2);
        const rx2 = Math.max(marquee.x1, marquee.x2);
        const ry2 = Math.max(marquee.y1, marquee.y2);
        const ids = elements
          .filter((el) => {
            const b = elementBBox(el);
            return b.x < rx2 && b.x + b.width > rx1 && b.y < ry2 && b.y + b.height > ry1;
          })
          .map((el) => el.id);
        onMarqueeSelect?.(ids, e.shiftKey);
      } else {
        onMarqueeSelect?.([], false);
      }
      marqueeStartRef.current = null;
      marqueeDraggedRef.current = false;
      setMarquee(null);
    }
  }

  const cursor =
    mode === "draw" || mode === "line" ? "crosshair" : resizeStartRef.current ? "nwse-resize" : dragStartRef.current ? "move" : "default";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-xl ring-1 transition-colors",
        background === "night" ? "bg-[oklch(0.13_0.025_272)] ring-foreground/15" : "bg-[oklch(0.96_0.006_84)] ring-[oklch(0.25_0.02_264/0.12)]",
        mode !== "select" && "touch-none",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={mode === "draw" ? handlePointerUp : undefined}
        className="touch-none"
        style={{
          cursor,
          aspectRatio: `${workspaceWidthPx || 1} / ${workspaceHeightPx || 1}`,
          maxWidth: "100%",
          maxHeight: "100%",
          width: "auto",
          height: "auto",
        }}
      />
      {elements.length === 0 && currentDrawPoints.length === 0 && (
        <p className="pointer-events-none absolute text-sm text-muted-foreground">{t("canvasEmptyState")}</p>
      )}
    </div>
  );
});
