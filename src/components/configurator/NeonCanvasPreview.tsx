"use client";

import { useId } from "react";
import type { CollisionZone, NeonPath } from "@/types/neon";
import { cn } from "@/lib/utils";

interface NeonCanvasPreviewProps {
  paths: NeonPath[];
  workspaceWidthPx: number;
  workspaceHeightPx: number;
  background?: "day" | "night";
  selectedPathId?: string | null;
  collisionZones?: CollisionZone[];
  onPathClick?: (pathId: string) => void;
  className?: string;
}

/**
 * Rendu SVG du design néon avec effet de lumière simulé (superposition de
 * filtres de flou de différentes intensités, à la manière d'un vrai tube LED
 * vu de nuit). Les tracés en zone de collision sont surlignés en rouge.
 */
export function NeonCanvasPreview({
  paths,
  workspaceWidthPx,
  workspaceHeightPx,
  background = "night",
  selectedPathId,
  collisionZones = [],
  onPathClick,
  className,
}: NeonCanvasPreviewProps) {
  const filterId = useId();

  const pathIdsInCollision = new Set(collisionZones.flatMap((z) => z.pathIds));

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-2xl border transition-colors",
        background === "night" ? "border-white/10 bg-[#0a0a10]" : "border-black/10 bg-[#f4f4f2]",
        className
      )}
    >
      <svg
        viewBox={`0 0 ${workspaceWidthPx || 1} ${workspaceHeightPx || 1}`}
        className="h-full max-h-[480px] w-full max-w-full p-8"
        role="img"
      >
        <defs>
          <filter id={`${filterId}-glow-sm`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur-sm" />
            <feMerge>
              <feMergeNode in="blur-sm" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`${filterId}-glow-lg`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="blur-lg" />
            <feMerge>
              <feMergeNode in="blur-lg" />
            </feMerge>
          </filter>
        </defs>

        {paths.map((path) => {
          const isCollision = pathIdsInCollision.has(path.id);
          const isSelected = selectedPathId === path.id;

          return (
            <g key={path.id}>
              {/* Halo large (glow ambiant) */}
              <path
                d={path.d}
                stroke={isCollision ? "#ff0033" : path.color}
                strokeWidth={6}
                fill="none"
                strokeLinecap="round"
                opacity={background === "night" ? 0.5 : 0.25}
                filter={`url(#${filterId}-glow-lg)`}
              />
              {/* Tube net + halo proche */}
              <path
                d={path.d}
                stroke={isCollision ? "#ff0033" : path.color}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                filter={`url(#${filterId}-glow-sm)`}
                onClick={() => onPathClick?.(path.id)}
                className={cn(onPathClick && "cursor-pointer", isSelected && "opacity-100")}
                style={isSelected ? { outline: "2px dashed white" } : undefined}
              />
            </g>
          );
        })}
      </svg>

      {paths.length === 0 && (
        <p className="absolute text-sm text-muted-foreground">Aucun tracé à afficher pour le moment.</p>
      )}
    </div>
  );
}
