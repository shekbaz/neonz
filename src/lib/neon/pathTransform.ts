/**
 * Décalage (translation) d'un attribut SVG "d" — utilisé pour la duplication
 * et le repositionnement fin ("nudge") d'un tracé néon dans le configurateur.
 *
 * Périmètre volontairement borné : les tracés manipulés viennent uniquement
 * de potrace (vectorize.ts) et opentype.js (textToPath.ts), jamais d'un SVG
 * arbitraire fourni par un utilisateur. Ces deux sources n'émettent que les
 * commandes M/L/H/V/C/S/Q/T/Z (potrace ajoute occasionnellement des courbes
 * cubiques C, opentype des quadratiques Q) — pas d'arcs elliptiques (A).
 *
 * Règle : une translation uniforme ne modifie PAS les deltas des commandes
 * relatives (minuscules) — seules les commandes absolues (majuscules) sont
 * décalées. Exception : le tout premier "moveto" d'un tracé est toujours
 * absolu par la spec SVG, même écrit en minuscule ("m").
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

export function translateSvgPathD(d: string, dx: number, dy: number): string {
  if (dx === 0 && dy === 0) return d;

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
    // restent relatives et ne doivent pas être décalées.
    if (isFirstMoveTo && !isAbsolute) {
      const shifted = numbers.map((n, i) => (i === 0 ? n + dx : i === 1 ? n + dy : n));
      result += command + " " + shifted.join(" ") + " ";
      continue;
    }

    if (!isAbsolute) {
      result += command + match[2];
      continue;
    }

    let shifted: number[];
    if (upper === "H") {
      shifted = numbers.map((n) => n + dx);
    } else if (upper === "V") {
      shifted = numbers.map((n) => n + dy);
    } else {
      const pairCount = PARAM_PAIR_COUNT[upper] ?? 1;
      shifted = numbers.map((n, i) => {
        // Repère si n est une coordonnée x (pair) ou y (impair) au sein d'un
        // groupe de `pairCount` paires répétées.
        const posInGroup = i % (pairCount * 2);
        const isX = posInGroup % 2 === 0;
        return n + (isX ? dx : dy);
      });
    }

    result += command + " " + shifted.join(" ") + " ";
  }

  return result.trim();
}
