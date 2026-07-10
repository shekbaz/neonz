/**
 * Réglages internes du traçage (vectorisation image / conversion texte).
 * Module framework-agnostic (pas de "use client", pas de dépendance à
 * Zustand) car importé à la fois côté client (store) et côté serveur
 * (lib/neon/autoResolve.ts, route /api/customize/auto-trace).
 */
export interface TraceSettings {
  /** Image : seuil noir/blanc 0-255 (potrace) */
  threshold: number;
  /** Image : taille min. (px) d'un détail conservé — filtre le bruit */
  turdSize: number;
  /** Image : 1 = silhouette simple, 2-5 = posterize multi-niveaux */
  steps: number;
  /** Texte : corps de police en px dans l'espace de travail */
  fontSizePx: number;
  /** Texte : espacement additionnel entre lettres, en px */
  letterSpacingPx: number;
  /** Image : inverse noir/blanc avant traçage (utile sur logo clair sur fond sombre) */
  invert: boolean;
  /** Image : flou gaussien (px) appliqué avant traçage pour lisser le bruit — 0 = désactivé */
  blurSigma: number;
}

export const DEFAULT_TRACE_SETTINGS: TraceSettings = {
  threshold: 160,
  turdSize: 8,
  steps: 1,
  fontSizePx: 200,
  letterSpacingPx: 0,
  invert: false,
  blurSigma: 0,
};
