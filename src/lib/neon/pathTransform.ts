/**
 * Transformations géométriques (translation, rotation, échelle) d'un
 * attribut SVG "d" — utilisées pour la duplication, le déplacement, la
 * rotation et le redimensionnement d'un tracé néon dans le configurateur.
 *
 * Périmètre volontairement borné : les tracés manipulés viennent uniquement
 * de potrace (vectorize.ts) et opentype.js (textToPath.ts). Vérifié
 * empiriquement (génération réelle d'un tracé + inspection des lettres de
 * commande) : ces deux sources n'émettent JAMAIS que M/L/C/Q/Z — jamais
 * H/V/S/T/A. `translateSvgPathD` reste compatible H/V (une translation ne
 * nécessite pas de connaître la position courante). `rotateSvgPathD` et
 * `scaleSvgPathD`, eux, ignorent H/V (jamais rencontrés en pratique) : les
 * transformer correctement nécessiterait de suivre le point courant tout du
 * long du tracé, ce qui est hors du périmètre couvert ici.
 *
 * Règle générale : un point ABSOLU se transforme par la formule complète
 * (avec pivot pour rotation/échelle). Un delta RELATIF (commande minuscule)
 * est un vecteur : invariant par translation, mais soumis à la même partie
 * linéaire (rotation/échelle) qu'un point, sans le décalage de pivot.
 * Exception commune aux deux : le tout premier "moveto" d'un tracé est
 * toujours absolu par la spec SVG, même écrit en minuscule ("m").
 */

const COMMAND_REGEX = /([MLHVCSQTZmlhvcsqtz])([^MLHVCSQTZmlhvcsqtz]*)/g;

// Nombre de coordonnées (x,y) consommées par répétition de paramètres, pour
// chaque commande. H/V n'ont qu'une seule valeur (x ou y uniquement).
const PARAM_PAIR_COUNT: Record<string, number> = {
  M: 1,
  L: 1,
  C: 3,
  S: 2,
  Q: 2,
  T: 1,
};

function parseNumbers(raw: string): number[] {
  const matches = raw.match(/-?\d*\.?\d+(?:e-?\d+)?/gi);
  return matches ? matches.map(Number) : [];
}

type PointMap = (x: number, y: number) => [number, number];
type VectorMap = (dx: number, dy: number) => [number, number];

/**
 * Cœur commun : applique `mapPoint` aux coordonnées absolues et `mapVector`
 * aux deltas relatifs. `mapHV` (optionnel) gère H/V absolus — par défaut,
 * H/V sont laissés inchangés (cas jamais rencontré avec potrace/opentype en
 * dehors d'une translation pure, qui passe par `mapHV` dédié dans
 * `translateSvgPathD`).
 */
function transformSvgPathD(
  d: string,
  mapPoint: PointMap,
  mapVector: VectorMap,
  mapHV?: { h: (x: number) => number; v: (y: number) => number }
): string {
  let isFirstCommand = true;
  let result = "";

  const matches = [...d.matchAll(COMMAND_REGEX)];
  for (const match of matches) {
    const command = match[1];
    const upper = command.toUpperCase();
    const isAbsolute = command === upper;
    const isFirstMoveTo = isFirstCommand && upper === "M";
    isFirstCommand = false;

    if (upper === "Z") {
      result += command;
      continue;
    }

    const numbers = parseNumbers(match[2]);

    // "m" en tout premier tracé : seule la 1ère paire (x,y) est absolue par
    // la spec SVG — d'éventuelles paires supplémentaires (lineto implicite)
    // restent relatives.
    if (isFirstMoveTo && !isAbsolute) {
      const [x, y] = mapPoint(numbers[0] ?? 0, numbers[1] ?? 0);
      const rest = numbers.slice(2);
      const restPairs: number[] = [];
      for (let i = 0; i < rest.length; i += 2) {
        const [vx, vy] = mapVector(rest[i], rest[i + 1] ?? 0);
        restPairs.push(vx, vy);
      }
      result += command + " " + [x, y, ...restPairs].join(" ") + " ";
      continue;
    }

    if (!isAbsolute) {
      if (upper === "H") {
        const [vx] = mapVector(numbers[0] ?? 0, 0);
        result += command + " " + vx + " ";
      } else if (upper === "V") {
        const [, vy] = mapVector(0, numbers[0] ?? 0);
        result += command + " " + vy + " ";
      } else {
        // Les commandes relatives sont des vecteurs : chaque paire (dx,dy)
        // se transforme indépendamment, peu importe son regroupement.
        const shifted: number[] = [];
        for (let i = 0; i < numbers.length; i += 2) {
          const [vx, vy] = mapVector(numbers[i], numbers[i + 1] ?? 0);
          shifted.push(vx, vy);
        }
        result += command + " " + shifted.join(" ") + " ";
      }
      continue;
    }

    let shifted: number[];
    if (upper === "H") {
      shifted = numbers.map((n) => mapHV?.h(n) ?? n);
    } else if (upper === "V") {
      shifted = numbers.map((n) => mapHV?.v(n) ?? n);
    } else {
      const pairCount = PARAM_PAIR_COUNT[upper] ?? 1;
      shifted = [];
      for (let i = 0; i < numbers.length; i += pairCount * 2) {
        for (let j = 0; j < pairCount; j++) {
          const [px, py] = mapPoint(numbers[i + j * 2], numbers[i + j * 2 + 1] ?? 0);
          shifted.push(px, py);
        }
      }
    }

    result += command + " " + shifted.join(" ") + " ";
  }

  return result.trim();
}

export function translateSvgPathD(d: string, dx: number, dy: number): string {
  if (dx === 0 && dy === 0) return d;
  return transformSvgPathD(
    d,
    (x, y) => [x + dx, y + dy],
    (vx, vy) => [vx, vy],
    { h: (x) => x + dx, v: (y) => y + dy }
  );
}

/** Rotation (degrés) autour du pivot (cx, cy). H/V absolus ignorés (jamais émis par potrace/opentype). */
export function rotateSvgPathD(d: string, angleDeg: number, cx: number, cy: number): string {
  if (angleDeg % 360 === 0) return d;
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return transformSvgPathD(
    d,
    (x, y) => {
      const dx = x - cx;
      const dy = y - cy;
      return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
    },
    (vx, vy) => [vx * cos - vy * sin, vx * sin + vy * cos]
  );
}

/** Échelle uniforme autour du pivot (cx, cy). H/V absolus ignorés (jamais émis par potrace/opentype). */
export function scaleSvgPathD(d: string, factor: number, cx: number, cy: number): string {
  if (factor === 1) return d;
  return transformSvgPathD(
    d,
    (x, y) => [cx + (x - cx) * factor, cy + (y - cy) * factor],
    (vx, vy) => [vx * factor, vy * factor]
  );
}

/**
 * Met à l'échelle (uniforme, préserve le ratio) un lot de tracés fraîchement
 * générés (texte/image, dont les coordonnées démarrent près de l'origine)
 * pour tenir dans une boîte cible, puis les positionne à (targetX, targetY) —
 * utilisé pour "ajouter" un élément sur le canvas unifié du configurateur
 * (Step1Create.tsx) et pour repositionner une revectorisation à l'identique.
 */
export function fitAndPlacePaths<T extends { d: string }>(
  paths: T[],
  sourceWidth: number,
  sourceHeight: number,
  targetX: number,
  targetY: number,
  targetWidth: number,
  targetHeight: number
): T[] {
  if (sourceWidth <= 0 || sourceHeight <= 0) return paths;
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  return paths.map((p) => ({
    ...p,
    d: translateSvgPathD(scaleSvgPathD(p.d, scale, 0, 0), targetX, targetY),
  }));
}
