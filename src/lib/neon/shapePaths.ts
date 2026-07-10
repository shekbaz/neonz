/**
 * Génération de tracés SVG pour les formes ajoutables directement sur le
 * canvas unifié (rectangle, cercle) — voir Step1Create.tsx. N'utilise que
 * M/L/C/Z, le périmètre de commandes géré par pathTransform.ts (rotation/
 * échelle) ; un cercle est donc approximé par 4 courbes de Bézier cubiques
 * plutôt qu'une commande d'arc SVG (A), jamais gérée par ce moteur.
 */

export function rectPathD(x: number, y: number, width: number, height: number): string {
  return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
}

const CIRCLE_KAPPA = 0.5522847498;

export function circlePathD(cx: number, cy: number, r: number): string {
  const k = CIRCLE_KAPPA * r;
  return [
    `M ${cx - r} ${cy}`,
    `C ${cx - r} ${cy - k} ${cx - k} ${cy - r} ${cx} ${cy - r}`,
    `C ${cx + k} ${cy - r} ${cx + r} ${cy - k} ${cx + r} ${cy}`,
    `C ${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r}`,
    `C ${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy}`,
    "Z",
  ].join(" ");
}
