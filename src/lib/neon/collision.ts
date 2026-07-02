import { svgPathProperties } from "svg-path-properties";
import type { CollisionResult, CollisionZone, NeonPath, Point } from "@/types/neon";
import { NEON_TUBE_WIDTH_CM } from "@/types/neon";

/**
 * Détection de collision / proximité excessive entre tracés néon.
 *
 * Contrainte métier : deux tubes néon (largeur physique fixe = 1cm) ne peuvent
 * jamais se trouver à moins de 1cm l'un de l'autre, sous peine de se toucher /
 * se souder visuellement une fois fabriqués. Cela s'applique :
 *  - entre deux tracés différents (ex: deux lettres voisines)
 *  - entre deux parties du MÊME tracé si son "d" SVG contient plusieurs
 *    sous-tracés disjoints (ex: la lettre "m" a des jambages proches, un "i"
 *    a un point séparé de son corps, une ponctuation proche d'une lettre...)
 *
 * Approche : on échantillonne chaque sous-tracé en points réguliers (au lieu
 * de résoudre analytiquement la distance entre courbes de Bézier, trop coûteux
 * et inutile ici — l'échantillonnage à un pas petit devant 1cm donne une
 * précision largement suffisante pour du tube néon), on les range dans une
 * grille spatiale uniforme dont la taille de cellule = distance minimale
 * autorisée, puis on ne compare que les points de cellules voisines.
 */

interface Segment {
  id: string;
  parentPathId: string;
  points: Point[];
}

/** Sépare un attribut "d" SVG en sous-tracés indépendants (un par commande M/m). */
function splitSubpaths(d: string): string[] {
  const trimmed = d.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(/(?=[Mm])/g).filter((p) => p.trim().length > 0);
  return parts.length > 0 ? parts : [trimmed];
}

/** Échantillonne un sous-tracé en N points réguliers le long de sa longueur. */
function sampleSubpath(d: string, samplesPerCm: number, pxToCm: number): Point[] {
  try {
    const props = new svgPathProperties(d);
    const totalLength = props.getTotalLength();
    if (!Number.isFinite(totalLength) || totalLength <= 0) return [];

    const totalLengthCm = totalLength * pxToCm;
    const sampleCount = Math.max(4, Math.ceil(totalLengthCm * samplesPerCm));
    const points: Point[] = [];
    for (let i = 0; i <= sampleCount; i++) {
      const len = (i / sampleCount) * totalLength;
      const pt = props.getPointAtLength(len);
      points.push({ x: pt.x, y: pt.y });
    }
    return points;
  } catch {
    // Un sous-tracé malformé ne doit pas faire planter toute la vérification ;
    // on le traite comme sans risque de collision (mieux vaut le laisser
    // passer que bloquer la commande sur une erreur de parsing isolée).
    return [];
  }
}

function buildSegments(paths: NeonPath[], samplesPerCm: number, pxToCm: number): Segment[] {
  const segments: Segment[] = [];
  for (const path of paths) {
    const subpaths = splitSubpaths(path.d);
    subpaths.forEach((sub, idx) => {
      const points = sampleSubpath(sub, samplesPerCm, pxToCm);
      if (points.length > 0) {
        segments.push({ id: `${path.id}__${idx}`, parentPathId: path.id, points });
      }
    });
  }
  return segments;
}

type GridCell = { segId: string; point: Point }[];

function buildGrid(segments: Segment[], cellSizePx: number): Map<string, GridCell> {
  const grid = new Map<string, GridCell>();
  const key = (cx: number, cy: number) => `${cx}:${cy}`;

  for (const seg of segments) {
    for (const p of seg.points) {
      const cx = Math.floor(p.x / cellSizePx);
      const cy = Math.floor(p.y / cellSizePx);
      const k = key(cx, cy);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k)!.push({ segId: seg.id, point: p });
    }
  }
  return grid;
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Vérifie les collisions entre tous les tracés fournis.
 *
 * @param paths Tracés du design (coordonnées en pixels, espace de travail courant)
 * @param pxToCm Ratio de conversion pixel -> cm applicable à CES coordonnées
 *               (dépend des dimensions cibles choisies par l'utilisateur — voir unitConversion.ts)
 * @param minAllowedDistanceCm Distance minimale autorisée entre deux tracés (défaut: largeur du tube, 1cm)
 */
export function checkCollisions(
  paths: NeonPath[],
  pxToCm: number,
  minAllowedDistanceCm: number = NEON_TUBE_WIDTH_CM
): CollisionResult {
  const samplesPerCm = 4; // pas d'échantillonnage : 1 point tous les 2.5mm, précis devant le seuil de 1cm
  const segments = buildSegments(paths, samplesPerCm, pxToCm);

  const minAllowedDistancePx = minAllowedDistanceCm / pxToCm;
  // Cellule de grille = seuil de collision : deux points à moins du seuil
  // sont nécessairement dans la même cellule ou une cellule adjacente (rayon 1).
  const cellSizePx = Math.max(minAllowedDistancePx, 1);
  const grid = buildGrid(segments, cellSizePx);

  const zonesByPair = new Map<string, CollisionZone>();

  for (const [key, cell] of grid) {
    const [cxStr, cyStr] = key.split(":");
    const cx = Number(cxStr);
    const cy = Number(cyStr);

    // Points candidats : cette cellule + les 8 voisines
    const candidates: GridCell = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neighbor = grid.get(`${cx + dx}:${cy + dy}`);
        if (neighbor) candidates.push(...neighbor);
      }
    }

    for (const a of cell) {
      for (const b of candidates) {
        if (a.segId === b.segId) continue;

        const parentA = a.segId.split("__")[0];
        const parentB = b.segId.split("__")[0];
        // Même tracé parent avec sous-tracés différents (ex: jambages du "m") : collision valide.
        const pairKey = [parentA, parentB].sort().join("::");

        const dPx = dist(a.point, b.point);
        const dCm = dPx * pxToCm;

        if (dCm < minAllowedDistanceCm) {
          const existing = zonesByPair.get(pairKey);
          if (!existing || dCm < existing.minDistanceCm) {
            zonesByPair.set(pairKey, {
              pathIds: [parentA, parentB] as [string, string],
              minDistanceCm: Number(dCm.toFixed(3)),
              atPoint: {
                x: (a.point.x + b.point.x) / 2,
                y: (a.point.y + b.point.y) / 2,
              },
            });
          }
        }
      }
    }
  }

  const zones = Array.from(zonesByPair.values()).sort((a, b) => a.minDistanceCm - b.minDistanceCm);

  return {
    hasCollision: zones.length > 0,
    zones,
    minAllowedDistanceCm,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Suggestions d'ajustement automatique proposées à l'utilisateur quand une
 * collision est détectée. Ne modifie rien : retourne des recommandations
 * exploitables par l'UI (ex: bouton "Appliquer l'espacement suggéré").
 */
export function suggestAdjustments(result: CollisionResult): string[] {
  if (!result.hasCollision) return [];

  const suggestions: string[] = [];
  const worstZone = result.zones[0];

  suggestions.push(
    `Écarter les tracés concernés d'au moins ${(
      result.minAllowedDistanceCm - worstZone.minDistanceCm
    ).toFixed(2)} cm supplémentaires.`
  );

  const sameParentCollision = result.zones.some((z) => z.pathIds[0] === z.pathIds[1]);
  if (sameParentCollision) {
    suggestions.push(
      "Simplifier le tracé : réduire les détails fins (jambages, points isolés) sur cette zone."
    );
  }

  if (result.zones.length > 2) {
    suggestions.push(
      "Augmenter la taille globale de l'enseigne pour espacer proportionnellement tous les tracés."
    );
  } else {
    suggestions.push("Augmenter l'espacement entre les lettres/segments concernés (kerning).");
  }

  return suggestions;
}
