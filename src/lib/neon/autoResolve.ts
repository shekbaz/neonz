import { svgPathProperties } from "svg-path-properties";
import type { NeonPath } from "@/types/neon";
import { MAX_DIMENSION_CM, NEON_TUBE_WIDTH_CM, type NeonFontId } from "@/types/neon";
import { DEFAULT_TRACE_SETTINGS, type TraceSettings } from "@/lib/neon/traceSettings";
import { vectorizeImage } from "@/lib/neon/vectorize";
import { textToNeonPaths } from "@/lib/neon/textToPath";
import { checkCollisions } from "@/lib/neon/collision";
import { computeScaleRatio } from "@/lib/neon/unitConversion";
import type { CollisionResult } from "@/types/neon";

/**
 * Résolution automatique de collision — orchestration serveur (un seul aller-
 * retour réseau client, tout se joue en interne ici).
 *
 * Le client ne doit JAMAIS voir le mot "collision", un ID de tracé interne ou
 * une distance en cm : soit la résolution réussit silencieusement (éventuel
 * agrandissement des dimensions ou simplification du tracé, reflétés dans le
 * résultat), soit elle échoue et on retourne une clé de message en langage
 * clair (failureReasonKey).
 *
 * Trois leviers, dans l'ordre :
 *  1. Desserrer l'espacement/le détail — aide les collisions entre tracés
 *     DIFFÉRENTS (translation relative), pas les self-collisions (ex: le
 *     "trou" intérieur d'un "O" très proche de son contour extérieur —
 *     aucun espacement ne change une distance interne à un même tracé).
 *  2. Agrandir l'enseigne au facteur d'échelle EXACT requis pour que la zone
 *     la plus serrée franchisse le seuil minimal (plutôt que de deviner par
 *     incréments arbitraires, qui peut s'arrêter à mi-chemin) : utile pour
 *     les self-collisions et tout résidu après (1).
 *  3. (Image uniquement) Si un résidu persiste, abandonner le plus petit
 *     tracé impliqué dans une collision plutôt que d'échouer — un fragment
 *     de bruit de vectorisation (ex: un petit trait isolé) coûte moins cher
 *     à supprimer qu'à faire échouer toute la demande.
 */

export interface AutoResolveParams {
  sourceType: "image" | "text";
  sourceImageUrl?: string;
  sourceText?: string;
  fontId?: NeonFontId;
  targetWidthCm: number;
  targetHeightCm: number;
  /** Réglages de départ (ex: ceux déjà atteints par un run précédent, pour
   *  éviter de repartir de zéro à chaque léger changement de dimensions). */
  startingTraceSettings?: Partial<TraceSettings>;
}

export interface AutoResolveResult {
  resolved: boolean;
  paths: NeonPath[];
  workspaceWidthPx: number;
  workspaceHeightPx: number;
  pxToCm: number;
  widthCm: number;
  heightCm: number;
  traceSettingsUsed: TraceSettings;
  attempts: number;
  failureReasonKey?: "traceTooDenseText" | "traceTooDenseImage";
}

interface TraceOutcome {
  paths: NeonPath[];
  workspaceWidthPx: number;
  workspaceHeightPx: number;
}

interface State {
  outcome: TraceOutcome;
  widthCm: number;
  heightCm: number;
  pxToCmX: number;
  collision: CollisionResult;
  attempts: number;
}

const MAX_SPACING_ATTEMPTS = 3;
const SPACING_INCREMENT_PX = 20;
const TURD_SIZE_MULTIPLIER = 1.6;
const GROWTH_SAFETY_MARGIN = 1.02;
const MAX_GROWTH_REFINEMENTS = 3;
const MAX_PATH_DROPS = 2;
const MIN_PATHS_REMAINING = 1;
/** En dessous de ce seuil (px), deux tracés sont considérés comme se
 *  chevauchant réellement : aucun agrandissement ne peut jamais les séparer
 *  (une mise à l'échelle uniforme préserve un chevauchement à distance 0). */
const NEAR_ZERO_PX = 0.01;

async function trace(
  params: AutoResolveParams,
  settings: TraceSettings,
  imageBuffer: Buffer | null
): Promise<TraceOutcome> {
  if (params.sourceType === "image") {
    if (!imageBuffer) throw new Error("Image source manquante.");
    return vectorizeImage(imageBuffer, {
      threshold: settings.threshold,
      turdSize: settings.turdSize,
      steps: settings.steps,
      invert: settings.invert,
      blurSigma: settings.blurSigma,
    });
  }

  return textToNeonPaths(params.sourceText ?? "", {
    fontId: params.fontId ?? "pacifico",
    fontSizePx: settings.fontSizePx,
    extraLetterSpacingPx: settings.letterSpacingPx,
  });
}

function evaluate(outcome: TraceOutcome, widthCm: number, heightCm: number): { pxToCmX: number; collision: CollisionResult } {
  const { pxToCmX } = computeScaleRatio({
    workspaceWidthPx: outcome.workspaceWidthPx,
    workspaceHeightPx: outcome.workspaceHeightPx,
    targetWidthCm: widthCm,
    targetHeightCm: heightCm,
  });
  const collision = checkCollisions(outcome.paths, pxToCmX);
  return { pxToCmX, collision };
}

function pathLengthPx(d: string): number {
  try {
    return new svgPathProperties(d).getTotalLength();
  } catch {
    return 0;
  }
}

/**
 * Agrandit l'enseigne au facteur d'échelle exact requis pour que la zone la
 * plus serrée franchisse le seuil minimal (+ marge de sécurité), en
 * plusieurs raffinements si l'arrondi cm laisse un résidu. Une mise à
 * l'échelle uniforme multiplie toutes les distances par le même facteur :
 * résoudre la zone la plus contraignante résout donc aussi les autres.
 */
function growUntilResolved(state: State): State {
  const { outcome } = state;
  let { widthCm, heightCm, pxToCmX, collision, attempts } = state;

  for (let i = 0; i < MAX_GROWTH_REFINEMENTS && collision.hasCollision; i++) {
    const worstDistanceCm = Math.min(...collision.zones.map((z) => z.minDistanceCm));

    // Distance quasi nulle = tracés qui se chevauchent réellement (pas juste
    // proches) : aucune mise à l'échelle ne peut jamais les séparer.
    if (worstDistanceCm <= NEAR_ZERO_PX * pxToCmX) break;

    const factor = (NEON_TUBE_WIDTH_CM / worstDistanceCm) * GROWTH_SAFETY_MARGIN;
    const grownWidth = Math.min(MAX_DIMENSION_CM, Math.round(widthCm * factor));
    const grownHeight = Math.min(MAX_DIMENSION_CM, Math.round(heightCm * factor));

    widthCm = grownWidth;
    heightCm = grownHeight;
    attempts++;
    const previousPxToCmX = pxToCmX;
    ({ pxToCmX, collision } = evaluate(outcome, widthCm, heightCm));

    // L'échelle effective (px→cm) est ce qui détermine réellement les
    // distances — pas widthCm/heightCm individuellement. Sur un texte en une
    // ligne, la largeur est presque toujours l'axe contraignant : une fois
    // plafonnée à MAX_DIMENSION_CM, continuer à agrandir la hauteur seule ne
    // change rien à l'échelle effective. Sans ce garde-fou, la boucle
    // gaspillait les itérations restantes sur une hauteur toujours plus
    // grande sans le moindre effet sur la collision.
    if (pxToCmX === previousPxToCmX) break;
  }

  return { outcome, widthCm, heightCm, pxToCmX, collision, attempts };
}

function toResult(state: State, settings: TraceSettings, failureReasonKey?: "traceTooDenseText" | "traceTooDenseImage"): AutoResolveResult {
  return {
    resolved: !state.collision.hasCollision,
    paths: state.outcome.paths,
    workspaceWidthPx: state.outcome.workspaceWidthPx,
    workspaceHeightPx: state.outcome.workspaceHeightPx,
    pxToCm: state.pxToCmX,
    widthCm: state.widthCm,
    heightCm: state.heightCm,
    traceSettingsUsed: settings,
    attempts: state.attempts,
    failureReasonKey: state.collision.hasCollision ? failureReasonKey : undefined,
  };
}

export async function resolveDesign(params: AutoResolveParams): Promise<AutoResolveResult> {
  const settings: TraceSettings = { ...DEFAULT_TRACE_SETTINGS, ...params.startingTraceSettings };
  const widthCm = params.targetWidthCm;
  const heightCm = params.targetHeightCm;

  let imageBuffer: Buffer | null = null;
  if (params.sourceType === "image") {
    if (!params.sourceImageUrl) throw new Error("Image source manquante.");
    const res = await fetch(params.sourceImageUrl);
    if (!res.ok) throw new Error("Impossible de récupérer l'image fournie.");
    imageBuffer = Buffer.from(await res.arrayBuffer());
  }

  const outcome = await trace(params, settings, imageBuffer);
  const { pxToCmX, collision } = evaluate(outcome, widthCm, heightCm);
  let state: State = { outcome, widthCm, heightCm, pxToCmX, collision, attempts: 1 };

  if (!state.collision.hasCollision) return toResult(state, settings);

  // Phase 1 : desserrer le détail/l'espacement — on va jusqu'au bout des
  // tentatives autorisées plutôt que d'abandonner dès qu'un essai
  // intermédiaire ne réduit pas immédiatement le NOMBRE de zones (une
  // collision peut s'améliorer en distance sur plusieurs pas avant de
  // repasser sous le seuil et disparaître du comptage).
  //
  // Cas TEXTE : ajouter de l'espacement élargit le tracé en PIXELS
  // (l'avancée du curseur augmente). Réévaluer contre une largeur cible
  // FIXE ferait alors paradoxalement RÉTRÉCIR l'échelle effective (px→cm)
  // à chaque tentative, aggravant artificiellement les distances rapportées
  // — l'espacement semblerait ne jamais aider. On fige donc l'échelle de
  // référence (celle du tout premier tracé) pendant cette phase : les
  // lettres gardent leur taille réelle, le panneau devient simplement un
  // peu plus large — exactement ce qu'on attend en ajoutant de l'espace.
  const hasInterCollision = state.collision.zones.some((z) => z.pathIds[0] !== z.pathIds[1]);
  if (hasInterCollision) {
    const isText = params.sourceType === "text";
    const referencePxToCm = state.pxToCmX;

    for (let i = 0; i < MAX_SPACING_ATTEMPTS && state.collision.hasCollision; i++) {
      if (isText) {
        settings.letterSpacingPx = Math.min(200, settings.letterSpacingPx + SPACING_INCREMENT_PX);
      } else {
        settings.turdSize = Math.min(200, Math.round(settings.turdSize * TURD_SIZE_MULTIPLIER));
      }

      const newOutcome = await trace(params, settings, imageBuffer);

      if (isText) {
        // Échelle figée : la taille des lettres ne change pas, seule la
        // largeur totale du tracé grandit avec l'espacement ajouté.
        const collision = checkCollisions(newOutcome.paths, referencePxToCm);
        state = { ...state, outcome: newOutcome, collision, pxToCmX: referencePxToCm, attempts: state.attempts + 1 };
      } else {
        const { pxToCmX, collision } = evaluate(newOutcome, state.widthCm, state.heightCm);
        state = { ...state, outcome: newOutcome, collision, pxToCmX, attempts: state.attempts + 1 };
      }
    }

    if (isText) {
      // La taille physique implicite a pu grandir (texte plus large à
      // échelle de lettre inchangée) — on la reporte, plafonnée au maximum
      // fabricable, puis on réévalue à l'échelle réellement applicable
      // (si le plafond force une compression, cette étape le reflète).
      const naturalWidthCm = state.outcome.workspaceWidthPx * referencePxToCm;
      const naturalHeightCm = state.outcome.workspaceHeightPx * referencePxToCm;
      const widthCm = Math.min(MAX_DIMENSION_CM, Math.round(naturalWidthCm));
      const heightCm = Math.min(MAX_DIMENSION_CM, Math.round(naturalHeightCm));
      const evalResult = evaluate(state.outcome, widthCm, heightCm);
      state = { ...state, widthCm, heightCm, ...evalResult };
    }
  }

  if (!state.collision.hasCollision) return toResult(state, settings);

  // Phase 2 : agrandissement déterministe.
  state = growUntilResolved(state);
  if (!state.collision.hasCollision) return toResult(state, settings);

  // Un résidu uniquement fait de self-collisions (contours internes d'une
  // MÊME lettre — ex: le "e"/"h" en script, la boucle d'un "q") est toléré :
  // c'est presque toujours un artefact de la vectorisation du contour de
  // police, pas un vrai risque de fabrication (un néoniste courbe un seul
  // tube continu pour une lettre). Le bloquer forcerait à agrandir bien
  // au-delà du nécessaire pour un gain de lisibilité marginal — alors que
  // les VRAIES collisions entre lettres/tracés différents restent, elles,
  // pleinement résolues à ce stade.
  const onlySelfCollisionsRemain = state.collision.zones.every((z) => z.pathIds[0] === z.pathIds[1]);
  if (onlySelfCollisionsRemain) {
    return toResult({ ...state, collision: { ...state.collision, hasCollision: false, zones: [] } }, settings);
  }

  // Phase 3 (image uniquement) : un résidu de bruit de vectorisation (petit
  // tracé isolé trop proche d'un autre) coûte moins cher à abandonner qu'à
  // faire échouer toute la demande — on garde le tracé le plus significatif
  // (le plus long) et on retire le plus petit impliqué dans une collision.
  if (params.sourceType === "image") {
    for (let drop = 0; drop < MAX_PATH_DROPS && state.collision.hasCollision; drop++) {
      if (state.outcome.paths.length <= MIN_PATHS_REMAINING) break;

      const collidingIds = new Set(state.collision.zones.flatMap((z) => z.pathIds));
      const candidates = state.outcome.paths.filter((p) => collidingIds.has(p.id));
      if (candidates.length === 0) break;

      const smallest = candidates.reduce((a, b) => (pathLengthPx(a.d) < pathLengthPx(b.d) ? a : b));
      const newOutcome = { ...state.outcome, paths: state.outcome.paths.filter((p) => p.id !== smallest.id) };
      const evalResult = evaluate(newOutcome, state.widthCm, state.heightCm);
      state = { ...state, outcome: newOutcome, ...evalResult, attempts: state.attempts + 1 };

      if (state.collision.hasCollision) {
        state = growUntilResolved(state);
      }
    }
  }

  if (state.collision.zones.every((z) => z.pathIds[0] === z.pathIds[1])) {
    return toResult({ ...state, collision: { ...state.collision, hasCollision: false, zones: [] } }, settings);
  }

  return toResult(state, settings, params.sourceType === "image" ? "traceTooDenseImage" : "traceTooDenseText");
}
