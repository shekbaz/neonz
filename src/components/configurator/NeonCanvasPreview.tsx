"use client";

import { forwardRef, useId, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { NeonPath } from "@/types/neon";
import { DEFAULT_GLOW_INTENSITY } from "@/types/neon";
import { cn } from "@/lib/utils";

export interface NeonCanvasHandle {
  /** Bbox union (coordonnées de l'espace de travail) des tracés donnés, ou null si aucun trouvé. */
  getSelectionBBox: (ids: string[]) => { x: number; y: number; width: number; height: number } | null;
}

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
  className?: string;
}

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * Math.max(0, Math.min(1, t));
}

/**
 * Rendu SVG du design néon avec effet de lumière simulé (superposition de
 * filtres de flou de différentes intensités, à la manière d'un vrai tube LED
 * vu de nuit). La résolution de collision est entièrement automatique côté
 * serveur (voir lib/neon/autoResolve.ts) — ce composant n'a plus besoin
 * d'afficher d'état de collision.
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
    className,
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

  function handlePathPointerDown(pathId: string, e: React.PointerEvent<SVGPathElement>) {
    if (!onDragCommit || !selectedPathIds?.includes(pathId)) return;
    e.stopPropagation();
    const p = toSvgPoint(e.clientX, e.clientY);
    pathDragStartRef.current = p;
    pathDraggedRef.current = false;
    setPathDragOffset({ dx: 0, dy: 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (!onMarqueeSelect || e.target !== e.currentTarget) return;
    const p = toSvgPoint(e.clientX, e.clientY);
    dragStartRef.current = p;
    draggedRef.current = false;
    setDragged(false);
    setMarquee({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
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

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-xl ring-1 transition-colors",
        background === "night"
          ? "bg-[oklch(0.13_0.025_272)] ring-foreground/15"
          : "bg-[oklch(0.96_0.006_84)] ring-[oklch(0.25_0.02_264/0.12)]",
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
                  onPathClick && "cursor-pointer",
                  isSelected && "opacity-100",
                  isSelected && onDragCommit && "cursor-move",
                  path.blink && "animate-neon-blink"
                )}
                style={isSelected ? { outline: "2px dashed white" } : undefined}
              />
            </g>
          );
        })}

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

      {paths.length === 0 && (
        <p className="absolute text-sm text-muted-foreground">Aucun tracé à afficher pour le moment.</p>
      )}
    </div>
  );
});
