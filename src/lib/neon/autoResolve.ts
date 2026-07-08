import type { NeonPath } from "@/types/neon";
import { MAX_DIMENSION_CM, type NeonFontId } from "@/types/neon";
import { DEFAULT_TRACE_SETTINGS, type TraceSettings } from "@/lib/neon/traceSettings";
import { vectorizeImage } from "@/lib/neon/vectorize";
import { textToNeonPaths } from "@/lib/neon/textToPath";
import { checkCollisions } from "@/lib/neon/collision";
import { computeScaleRatio } from "@/lib/neon/unitConversion";

/**
 * Résolution automatique de collision — orchestration serveur (un seul aller-
 * retour réseau client, tout se joue en interne ici).
 *
 * Le client ne doit JAMAIS voir le mot "collision", un ID de tracé interne ou
 * une distance en cm : soit la résolution réussit silencieusement (éventuel
 * agrandissement des dimensions, reflété dans le résultat), soit elle échoue
 * et on retourne une clé de message en langage clair (failureReasonKey).
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

const MAX_SPACING_ATTEMPTS = 2;
const MAX_GROWTH_ATTEMPTS = 4;
const GROWTH_FACTOR = 1.15;

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
    });
  }

  return textToNeonPaths(params.sourceText ?? "", {
    fontId: params.fontId ?? "pacifico",
    fontSizePx: settings.fontSizePx,
    extraLetterSpacingPx: settings.letterSpacingPx,
  });
}

export async function resolveDesign(params: AutoResolveParams): Promise<AutoResolveResult> {
  const settings: TraceSettings = { ...DEFAULT_TRACE_SETTINGS, ...params.startingTraceSettings };
  let widthCm = params.targetWidthCm;
  let heightCm = params.targetHeightCm;
  let attempts = 0;

  let imageBuffer: Buffer | null = null;
  if (params.sourceType === "image") {
    if (!params.sourceImageUrl) throw new Error("Image source manquante.");
    const res = await fetch(params.sourceImageUrl);
    if (!res.ok) throw new Error("Impossible de récupérer l'image fournie.");
    imageBuffer = Buffer.from(await res.arrayBuffer());
  }

  let outcome = await trace(params, settings, imageBuffer);
  attempts++;

  let best = { outcome, settings: { ...settings }, widthCm, heightCm, zoneCount: Infinity };

  function evaluate(o: TraceOutcome, w: number, h: number) {
    const { pxToCmX } = computeScaleRatio({
      workspaceWidthPx: o.workspaceWidthPx,
      workspaceHeightPx: o.workspaceHeightPx,
      targetWidthCm: w,
      targetHeightCm: h,
    });
    const collision = checkCollisions(o.paths, pxToCmX);
    return { pxToCmX, collision };
  }

  let { pxToCmX, collision } = evaluate(outcome, widthCm, heightCm);

  if (!collision.hasCollision) {
    return {
      resolved: true,
      paths: outcome.paths,
      workspaceWidthPx: outcome.workspaceWidthPx,
      workspaceHeightPx: outcome.workspaceHeightPx,
      pxToCm: pxToCmX,
      widthCm,
      heightCm,
      traceSettingsUsed: settings,
      attempts,
    };
  }
  best = { outcome, settings: { ...settings }, widthCm, heightCm, zoneCount: collision.zones.length };

  // Phase 1 : desserrer le détail/l'espacement (n'aide pas les self-collisions
  // — jambages disjoints déjà substantiels qu'aucun kerning ne peut écarter).
  const isSelfCollisionOnly = collision.zones.every((z) => z.pathIds[0] === z.pathIds[1]);
  if (!isSelfCollisionOnly) {
    for (let i = 0; i < MAX_SPACING_ATTEMPTS; i++) {
      if (params.sourceType === "image") {
        settings.turdSize = Math.min(200, Math.round(settings.turdSize * 2.5));
      } else {
        settings.letterSpacingPx = Math.min(200, settings.letterSpacingPx + 15);
      }

      outcome = await trace(params, settings, imageBuffer);
      attempts++;
      ({ pxToCmX, collision } = evaluate(outcome, widthCm, heightCm));

      if (!collision.hasCollision) {
        return {
          resolved: true,
          paths: outcome.paths,
          workspaceWidthPx: outcome.workspaceWidthPx,
          workspaceHeightPx: outcome.workspaceHeightPx,
          pxToCm: pxToCmX,
          widthCm,
          heightCm,
          traceSettingsUsed: settings,
          attempts,
        };
      }

      if (collision.zones.length < best.zoneCount) {
        best = { outcome, settings: { ...settings }, widthCm, heightCm, zoneCount: collision.zones.length };
      } else {
        // Aucune amélioration : inutile d'insister sur cet axe.
        break;
      }
    }
  }

  // Phase 2 : agrandir l'enseigne (seul levier qui résout les self-collisions,
  // et filet de sécurité si le desserrage de détail n'a pas suffi).
  for (let i = 0; i < MAX_GROWTH_ATTEMPTS; i++) {
    const grownWidth = Math.min(MAX_DIMENSION_CM, Math.round(widthCm * GROWTH_FACTOR));
    const grownHeight = Math.min(MAX_DIMENSION_CM, Math.round(heightCm * GROWTH_FACTOR));
    if (grownWidth === widthCm && grownHeight === heightCm) break; // déjà au plafond

    widthCm = grownWidth;
    heightCm = grownHeight;
    attempts++;
    ({ pxToCmX, collision } = evaluate(outcome, widthCm, heightCm));

    if (!collision.hasCollision) {
      return {
        resolved: true,
        paths: outcome.paths,
        workspaceWidthPx: outcome.workspaceWidthPx,
        workspaceHeightPx: outcome.workspaceHeightPx,
        pxToCm: pxToCmX,
        widthCm,
        heightCm,
        traceSettingsUsed: settings,
        attempts,
      };
    }

    if (collision.zones.length < best.zoneCount) {
      best = { outcome, settings: { ...settings }, widthCm, heightCm, zoneCount: collision.zones.length };
    }
  }

  const bestEval = evaluate(best.outcome, best.widthCm, best.heightCm);
  return {
    resolved: false,
    paths: best.outcome.paths,
    workspaceWidthPx: best.outcome.workspaceWidthPx,
    workspaceHeightPx: best.outcome.workspaceHeightPx,
    pxToCm: bestEval.pxToCmX,
    widthCm: best.widthCm,
    heightCm: best.heightCm,
    traceSettingsUsed: best.settings,
    attempts,
    failureReasonKey: params.sourceType === "image" ? "traceTooDenseImage" : "traceTooDenseText",
  };
}
