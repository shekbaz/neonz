"use client";

import { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { NeonPath } from "@/types/neon";
import { DEFAULT_GLOW_INTENSITY } from "@/types/neon";
import { snapToNearest, type Point, type SpatialGrid } from "@/lib/neon/edgeDetection";
import { cn } from "@/lib/utils";

export interface NeonCanvasHandle {
  /** Bbox union (coordonnées de l'espace de travail) des tracés donnés, ou null si aucun trouvé. */
  getSelectionBBox: (ids: string[]) => { x: number; y: number; width: number; height: number } | null;
  /** Sérialise le canvas courant en PNG et déclenche son téléchargement. */
  exportAsPNG: (fileName: string) => Promise<void>;
}

const SNAP_CELL_SIZE = 20;
const SNAP_MAX_DISTANCE = 20;
const GRID_DIVISIONS = 12;
const EXPORT_SUPERSAMPLE = 2;

interface NeonCanvasPreviewProps {
  paths: NeonPath[];
  workspaceWidthPx: number;
  workspaceHeightPx: number;
  background?: "day" | "night";
  selectedPathIds?: string[];
  onPathClick?: (pathId: string, e: React.MouseEvent) => void;
  /** Active la sélection par rectangle ("marquee") en glissant sur le fond du canvas. */
  onMarqueeSelect?: (ids: string[], additive: boolean) => void;
  /** Active le glisser-déposer d'une sélection déjà active ; appelé une seule fois au relâchement. */
  onDragCommit?: (ids: string[], dxPx: number, dyPx: number) => void;
  /** Estompe les tracés non sélectionnés (mode "isoler"). */
  dimUnselected?: boolean;
  /** Grille de repère visuelle en fond de canvas (n'affecte pas les données). */
  showGrid?: boolean;
  className?: string;

  /** "draw" capture un trait libre ; "line" capture un segment droit (clic point A, clic point B). */
  mode?: "select" | "draw" | "line";
  strokeColor?: string;
  onStrokeComplete?: (points: Point[]) => void;
  /** Image de référence (superposée en transparence) pour tracer par-dessus en mode dessin. */
  referenceImageUrl?: string | null;
  snapEnabled?: boolean;
  snapGrid?: SpatialGrid | null;
  showEdgePoints?: boolean;
  edgePoints?: Point[];
}

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * Math.max(0, Math.min(1, t));
}

/**
 * Rendu SVG du design néon avec effet de lumière simulé (superposition de
 * filtres de flou de différentes intensités, à la manière d'un vrai tube LED
 * vu de nuit). Gère aussi bien l'édition de zone (sélection, marquee,
 * glisser-déposer) que la capture de trait libre/segment droit (modes
 * "draw"/"line") sur la même surface, pour le canvas unifié du configurateur.
 */
export const NeonCanvasPreview = forwardRef<NeonCanvasHandle, NeonCanvasPreviewProps>(function NeonCanvasPreview(
  {
    paths,
    workspaceWidthPx,
    workspaceHeightPx,
    background = "night",
    selectedPathIds,
    onPathClick,
    onMarqueeSelect,
    onDragCommit,
    dimUnselected = false,
    showGrid = false,
    className,
    mode = "select",
    strokeColor = "#FF073A",
    onStrokeComplete,
    referenceImageUrl,
    snapEnabled = false,
    snapGrid = null,
    showEdgePoints = false,
    edgePoints = [],
  },
  ref
) {
  const filterId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const pathElRefs = useRef<Map<string, SVGPathElement>>(new Map());

  // Sélection par rectangle ("marquee"), armée depuis le fond du canvas.
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const draggedRef = useRef(false);
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [dragged, setDragged] = useState(false);

  // Glisser-déposer d'une sélection déjà active, armé depuis un tracé sélectionné.
  const pathDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [pathDragOffset, setPathDragOffset] = useState<{ dx: number; dy: number } | null>(null);
  const pathDraggedRef = useRef(false);

  // Capture de trait libre (mode "draw").
  const isDrawingRef = useRef(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);

  // Capture de segment droit (mode "line") : deux clics (point A, point B).
  const lineStartRef = useRef<Point | null>(null);
  const [lineCursor, setLineCursor] = useState<Point | null>(null);

  useEffect(() => {
    lineStartRef.current = null;
    setLineCursor(null);
  }, [mode]);

  useImperativeHandle(ref, () => ({
    getSelectionBBox(ids) {
      let box: { x: number; y: number; width: number; height: number } | null = null;
      for (const id of ids) {
        const el = pathElRefs.current.get(id);
        if (!el) continue;
        const b = el.getBBox();
        if (!box) {
          box = { x: b.x, y: b.y, width: b.width, height: b.height };
        } else {
          const minX = Math.min(box.x, b.x);
          const minY = Math.min(box.y, b.y);
          const maxX = Math.max(box.x + box.width, b.x + b.width);
          const maxY = Math.max(box.y + box.height, b.y + b.height);
          box = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        }
      }
      return box;
    },
    async exportAsPNG(fileName) {
      const svg = svgRef.current;
      if (!svg) return;
      const svgString = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      try {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Échec du rendu de l'export."));
          img.src = url;
        });
        const canvas = document.createElement("canvas");
        canvas.width = workspaceWidthPx * EXPORT_SUPERSAMPLE;
        canvas.height = workspaceHeightPx * EXPORT_SUPERSAMPLE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = background === "night" ? "#0a0a0f" : "#f5f4f0";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const link = document.createElement("a");
        link.download = fileName;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } finally {
        URL.revokeObjectURL(url);
      }
    },
  }));

  const distinctIntensities = useMemo(() => {
    const set = new Set(paths.map((p) => p.glowIntensity ?? DEFAULT_GLOW_INTENSITY));
    return Array.from(set);
  }, [paths]);

  function toSvgPoint(clientX: number, clientY: number) {
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
    if (!snapEnabled || !snapGrid) return p;
    return snapToNearest(p, snapGrid, SNAP_CELL_SIZE, SNAP_MAX_DISTANCE);
  }

  function handlePathPointerDown(pathId: string, e: React.PointerEvent<SVGPathElement>) {
    if (mode !== "select" || !onDragCommit || !selectedPathIds?.includes(pathId)) return;
    e.stopPropagation();
    const p = toSvgPoint(e.clientX, e.clientY);
    pathDragStartRef.current = p;
    pathDraggedRef.current = false;
    setPathDragOffset({ dx: 0, dy: 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (mode === "draw") {
      isDrawingRef.current = true;
      setCurrentPoints([maybeSnap(toSvgPoint(e.clientX, e.clientY))]);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (mode === "line") {
      const p = maybeSnap(toSvgPoint(e.clientX, e.clientY));
      if (!lineStartRef.current) {
        lineStartRef.current = p;
        setLineCursor(p);
      } else {
        onStrokeComplete?.([lineStartRef.current, p]);
        lineStartRef.current = null;
        setLineCursor(null);
      }
      return;
    }

    if (!onMarqueeSelect || e.target !== e.currentTarget) return;
    const p = toSvgPoint(e.clientX, e.clientY);
    dragStartRef.current = p;
    draggedRef.current = false;
    setDragged(false);
    setMarquee({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (mode === "draw") {
      if (!isDrawingRef.current) return;
      setCurrentPoints((prev) => [...prev, maybeSnap(toSvgPoint(e.clientX, e.clientY))]);
      return;
    }

    if (mode === "line") {
      if (!lineStartRef.current) return;
      setLineCursor(maybeSnap(toSvgPoint(e.clientX, e.clientY)));
      return;
    }

    if (pathDragStartRef.current) {
      const p = toSvgPoint(e.clientX, e.clientY);
      const start = pathDragStartRef.current;
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) pathDraggedRef.current = true;
      setPathDragOffset({ dx, dy });
      return;
    }

    if (!dragStartRef.current) return;
    const p = toSvgPoint(e.clientX, e.clientY);
    const start = dragStartRef.current;
    if (Math.abs(p.x - start.x) > 3 || Math.abs(p.y - start.y) > 3) {
      draggedRef.current = true;
      setDragged(true);
    }
    setMarquee({ x1: start.x, y1: start.y, x2: p.x, y2: p.y });
  }

  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (mode === "draw") {
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        if (currentPoints.length >= 2) onStrokeComplete?.(currentPoints);
        setCurrentPoints([]);
      }
      return;
    }

    if (mode === "line") return;

    if (pathDragStartRef.current) {
      if (pathDraggedRef.current && pathDragOffset && selectedPathIds) {
        onDragCommit?.(selectedPathIds, pathDragOffset.dx, pathDragOffset.dy);
      }
      pathDragStartRef.current = null;
      pathDraggedRef.current = false;
      setPathDragOffset(null);
      return;
    }

    if (!dragStartRef.current) return;
    if (draggedRef.current && marquee) {
      const rx1 = Math.min(marquee.x1, marquee.x2);
      const ry1 = Math.min(marquee.y1, marquee.y2);
      const rx2 = Math.max(marquee.x1, marquee.x2);
      const ry2 = Math.max(marquee.y1, marquee.y2);
      const ids: string[] = [];
      pathElRefs.current.forEach((el, id) => {
        const bbox = el.getBBox();
        const intersects = bbox.x < rx2 && bbox.x + bbox.width > rx1 && bbox.y < ry2 && bbox.y + bbox.height > ry1;
        if (intersects) ids.push(id);
      });
      onMarqueeSelect?.(ids, e.shiftKey);
    }
    dragStartRef.current = null;
    draggedRef.current = false;
    setDragged(false);
    setMarquee(null);
  }

  const currentStrokeD =
    currentPoints.length >= 2 ? "M " + currentPoints.map((p) => `${p.x} ${p.y}`).join(" L ") : "";
  const displayedEdgePoints = showEdgePoints ? edgePoints.filter((_, i) => i % 3 === 0) : [];

  const gridLines = useMemo(() => {
    if (!showGrid || workspaceWidthPx <= 0 || workspaceHeightPx <= 0) return null;
    const stepX = workspaceWidthPx / GRID_DIVISIONS;
    const stepY = workspaceHeightPx / GRID_DIVISIONS;
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 1; i < GRID_DIVISIONS; i++) {
      lines.push({ x1: i * stepX, y1: 0, x2: i * stepX, y2: workspaceHeightPx });
      lines.push({ x1: 0, y1: i * stepY, x2: workspaceWidthPx, y2: i * stepY });
    }
    return lines;
  }, [showGrid, workspaceWidthPx, workspaceHeightPx]);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-xl ring-1 transition-colors",
        background === "night"
          ? "bg-[oklch(0.13_0.025_272)] ring-foreground/15"
          : "bg-[oklch(0.96_0.006_84)] ring-[oklch(0.25_0.02_264/0.12)]",
        mode !== "select" && "touch-none",
        className
      )}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${workspaceWidthPx || 1} ${workspaceHeightPx || 1}`}
        className="h-full max-h-[480px] w-full max-w-full p-8"
        role="img"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={mode === "draw" ? handlePointerUp : undefined}
      >
        <defs>
          {distinctIntensities.map((intensity) => (
            <g key={intensity}>
              <filter id={`${filterId}-glow-sm-${intensity}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation={lerp(0.5, 4, intensity / 100)} result="blur-sm" />
                <feMerge>
                  <feMergeNode in="blur-sm" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id={`${filterId}-glow-lg-${intensity}`} x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation={lerp(1, 14, intensity / 100)} result="blur-lg" />
                <feMerge>
                  <feMergeNode in="blur-lg" />
                </feMerge>
              </filter>
            </g>
          ))}
        </defs>

        {gridLines && (
          <g pointerEvents="none" stroke={background === "night" ? "white" : "black"} opacity={0.06}>
            {gridLines.map((l, i) => (
              <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={1} />
            ))}
          </g>
        )}

        {referenceImageUrl && (
          <image
            href={referenceImageUrl}
            width={workspaceWidthPx}
            height={workspaceHeightPx}
            opacity={0.3}
            preserveAspectRatio="xMidYMid slice"
          />
        )}

        {displayedEdgePoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={1} fill="#FF00FF" opacity={0.6} />
        ))}

        {paths.map((path) => {
          const isSelected = selectedPathIds?.includes(path.id) ?? false;
          const intensity = path.glowIntensity ?? DEFAULT_GLOW_INTENSITY;
          const dimmed = dimUnselected && !isSelected;
          const liveTransform =
            isSelected && pathDragOffset ? `translate(${pathDragOffset.dx} ${pathDragOffset.dy})` : undefined;

          return (
            <g key={path.id} opacity={dimmed ? 0.15 : 1} transform={liveTransform}>
              {/* Halo large (glow ambiant) */}
              <path
                d={path.d}
                stroke={path.color}
                strokeWidth={6}
                fill="none"
                strokeLinecap="round"
                opacity={background === "night" ? 0.5 : 0.25}
                filter={`url(#${filterId}-glow-lg-${intensity})`}
                className={cn(path.blink && "animate-neon-blink")}
              />
              {/* Tube net + halo proche */}
              <path
                ref={(el) => {
                  if (el) pathElRefs.current.set(path.id, el);
                  else pathElRefs.current.delete(path.id);
                }}
                d={path.d}
                stroke={path.color}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                filter={`url(#${filterId}-glow-sm-${intensity})`}
                onClick={(e) => onPathClick?.(path.id, e)}
                onPointerDown={(e) => handlePathPointerDown(path.id, e)}
                className={cn(
                  mode === "select" && onPathClick && "cursor-pointer",
                  isSelected && "opacity-100",
                  isSelected && onDragCommit && "cursor-move",
                  path.blink && "animate-neon-blink"
                )}
                style={isSelected ? { outline: "2px dashed white" } : undefined}
              />
            </g>
          );
        })}

        {currentStrokeD && (
          <path d={currentStrokeD} stroke={strokeColor} strokeWidth={3} fill="none" strokeLinecap="round" />
        )}

        {lineStartRef.current && lineCursor && (
          <line
            x1={lineStartRef.current.x}
            y1={lineStartRef.current.y}
            x2={lineCursor.x}
            y2={lineCursor.y}
            stroke={strokeColor}
            strokeWidth={3}
            strokeDasharray="6 4"
          />
        )}

        {marquee && dragged && (
          <rect
            x={Math.min(marquee.x1, marquee.x2)}
            y={Math.min(marquee.y1, marquee.y2)}
            width={Math.abs(marquee.x2 - marquee.x1)}
            height={Math.abs(marquee.y2 - marquee.y1)}
            fill="oklch(0.7 0.15 250 / 0.15)"
            stroke="oklch(0.7 0.15 250)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}
      </svg>

      {paths.length === 0 && !currentStrokeD && (
        <p className="absolute text-sm text-muted-foreground">Aucun tracé à afficher pour le moment.</p>
      )}
    </div>
  );
});
