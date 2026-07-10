import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { NeonPath } from "@/types/neon";
import type { DesignPriceBreakdown } from "@/lib/neon/pricing";
import type { NeonFontId } from "@/types/neon";
import { DEFAULT_TRACE_SETTINGS, type TraceSettings } from "@/lib/neon/traceSettings";
import { translateSvgPathD, rotateSvgPathD, scaleSvgPathD } from "@/lib/neon/pathTransform";

export type { TraceSettings };
export { DEFAULT_TRACE_SETTINGS };

export type ConfiguratorStep = 1 | 2 | 3;
export type SupportType = "acrylic-transparent" | "acrylic-black" | "silhouette-cut";
export type ResolutionStatus = "idle" | "resolving" | "resolved" | "unresolved";

interface ConfiguratorState {
  step: ConfiguratorStep;
  /** Étape la plus avancée jamais atteinte — borne la navigation avant du stepper cliquable. */
  furthestStepReached: ConfiguratorStep;

  sourceType: "image" | "text" | "draw" | null;
  sourceImageUrl: string | null;
  sourceText: string;
  fontId: NeonFontId;

  traceSettings: TraceSettings;

  paths: NeonPath[];
  /** Piles d'annulation/rétablissement des éditions manuelles de zone (couleur, suppression, déplacement...). */
  pathsHistory: NeonPath[][];
  pathsFuture: NeonPath[][];
  workspaceWidthPx: number;
  workspaceHeightPx: number;

  widthCm: number;
  heightCm: number;
  pxToCm: number;

  /** Statut de la résolution automatique de collision — jamais montré comme
   *  tel à l'utilisateur, seulement utilisé pour piloter loaders/blocages. */
  resolutionStatus: ResolutionStatus;
  /** Clé de message en langage clair si non-résolu (ex: "traceTooDenseText"). */
  resolutionFailureReason: string | null;
  isProcessing: boolean;

  support: SupportType;
  hasRemote: boolean;

  priceBreakdown: DesignPriceBreakdown | null;

  setStep: (step: ConfiguratorStep) => void;
  goNext: () => void;
  goBack: () => void;

  setSourceType: (type: "image" | "text" | "draw") => void;
  setSourceImageUrl: (url: string | null) => void;
  setSourceText: (text: string) => void;
  setFontId: (fontId: NeonFontId) => void;
  setTraceSettings: (partial: Partial<TraceSettings>) => void;
  resetTraceSettings: () => void;

  setPaths: (paths: NeonPath[], workspaceWidthPx: number, workspaceHeightPx: number) => void;
  setPathColor: (pathId: string, color: string) => void;
  setAllPathColors: (color: string) => void;

  /** Supprime les tracés donnés. Ne fait rien (retourne false) si ça viderait tout le design. */
  removePaths: (ids: string[]) => boolean;
  /** Clone les tracés donnés (décalés visuellement) et retourne les nouveaux ids. */
  duplicatePaths: (ids: string[]) => string[];
  /** Repositionne finement les tracés donnés (boutons flèches ou commit de glisser-déposer). */
  nudgePaths: (ids: string[], dxPx: number, dyPx: number) => void;
  rotatePaths: (ids: string[], angleDeg: number, cx: number, cy: number) => void;
  scalePaths: (ids: string[], factor: number, cx: number, cy: number) => void;
  /** Écrase directement le "d" de tracés donnés (ex: commit de glisser-déposer déjà calculé). */
  setPathsD: (updates: { id: string; d: string }[]) => void;
  setPathsGlow: (ids: string[], glowIntensity: number) => void;
  setPathsBlink: (ids: string[], blink: boolean) => void;
  /** Ajoute un tracé dessiné à la main (mode "draw") ; fixe l'espace de travail au premier trait. */
  addDrawnPath: (
    points: { x: number; y: number }[],
    color: string,
    workspaceWidthPx: number,
    workspaceHeightPx: number
  ) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  setDimensions: (widthCm: number, heightCm: number, pxToCm: number) => void;
  setResolutionStatus: (status: ResolutionStatus, failureReason?: string | null) => void;
  setIsProcessing: (value: boolean) => void;

  setSupport: (support: SupportType) => void;
  setHasRemote: (value: boolean) => void;
  setPriceBreakdown: (breakdown: DesignPriceBreakdown | null) => void;

  canProceedFromCurrentStep: () => boolean;
  reset: () => void;
}

const MAX_HISTORY_ENTRIES = 50;

const volatileInitialState = {
  traceSettings: DEFAULT_TRACE_SETTINGS,
  paths: [] as NeonPath[],
  pathsHistory: [] as NeonPath[][],
  pathsFuture: [] as NeonPath[][],
  workspaceWidthPx: 0,
  workspaceHeightPx: 0,
  pxToCm: 0,
  resolutionStatus: "idle" as ResolutionStatus,
  resolutionFailureReason: null as string | null,
  isProcessing: false,
  priceBreakdown: null as DesignPriceBreakdown | null,
};

const initialState = {
  step: 1 as ConfiguratorStep,
  furthestStepReached: 1 as ConfiguratorStep,
  sourceType: "image" as "image" | "text" | "draw" | null,
  sourceImageUrl: null,
  sourceText: "",
  fontId: "pacifico" as NeonFontId,
  // Départ plus généreux que le minimum (10cm) : une phrase de quelques mots
  // a besoin de cette marge pour que la résolution auto de collision
  // (lib/neon/autoResolve.ts) ait la place de séparer les lettres sans
  // buter immédiatement sur le plafond de 90cm.
  widthCm: 60,
  heightCm: 30,
  support: "acrylic-transparent" as SupportType,
  hasRemote: false,
  ...volatileInitialState,
};

/**
 * Applique une édition manuelle de zone en poussant l'état courant sur la
 * pile d'annulation (bornée) et en vidant le rétablissement — utilisé par
 * toutes les actions de type "édition" (couleur, suppression, déplacement,
 * rotation, échelle, glow, clignotement, dessin) mais PAS par `setPaths`
 * (nouveau tracé de fond, qui repart d'un historique vierge).
 */
function mutatePaths(
  get: () => ConfiguratorState,
  set: (partial: Partial<ConfiguratorState>) => void,
  fn: (paths: NeonPath[]) => NeonPath[]
) {
  const s = get();
  const pathsHistory = [...s.pathsHistory, s.paths].slice(-MAX_HISTORY_ENTRIES);
  set({ paths: fn(s.paths), pathsHistory, pathsFuture: [] });
}

export const useConfiguratorStore = create<ConfiguratorState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStep: (step) => set({ step }),
      goNext: () =>
        set((s) => {
          const next = (s.step < 3 ? s.step + 1 : s.step) as ConfiguratorStep;
          return { step: next, furthestStepReached: (Math.max(s.furthestStepReached, next) as ConfiguratorStep) };
        }),
      goBack: () => set((s) => ({ step: (s.step > 1 ? ((s.step - 1) as ConfiguratorStep) : s.step) })),

      setSourceType: (sourceType) =>
        set({ sourceType, paths: [], pathsHistory: [], pathsFuture: [], resolutionStatus: "idle", resolutionFailureReason: null }),
      setSourceImageUrl: (sourceImageUrl) =>
        set({ sourceImageUrl, resolutionStatus: "idle", resolutionFailureReason: null }),
      setSourceText: (sourceText) => set({ sourceText, resolutionStatus: "idle", resolutionFailureReason: null }),
      setFontId: (fontId) => set({ fontId, resolutionStatus: "idle", resolutionFailureReason: null }),
      setTraceSettings: (partial) =>
        set((s) => ({ traceSettings: { ...s.traceSettings, ...partial } })),
      resetTraceSettings: () => set({ traceSettings: DEFAULT_TRACE_SETTINGS }),

      // Nouveau tracé de fond (auto-trace ou dessin depuis zéro) : ce n'est
      // pas une édition manuelle, donc pas d'entrée d'historique — l'ancien
      // historique n'a plus de sens sur un tout autre contenu.
      setPaths: (paths, workspaceWidthPx, workspaceHeightPx) =>
        set({ paths, workspaceWidthPx, workspaceHeightPx, pathsHistory: [], pathsFuture: [] }),

      setPathColor: (pathId, color) =>
        mutatePaths(get, set, (paths) => paths.map((p) => (p.id === pathId ? { ...p, color } : p))),
      setAllPathColors: (color) => mutatePaths(get, set, (paths) => paths.map((p) => ({ ...p, color }))),

      removePaths: (ids) => {
        const remaining = get().paths.filter((p) => !ids.includes(p.id));
        if (remaining.length === 0) return false;
        mutatePaths(get, set, () => remaining);
        return true;
      },

      duplicatePaths: (ids) => {
        const s = get();
        const dx = s.workspaceWidthPx * 0.08;
        const dy = s.workspaceWidthPx * 0.08;
        const newIds: string[] = [];
        const toAdd = s.paths
          .filter((p) => ids.includes(p.id))
          .map((p, i) => {
            const newId = crypto.randomUUID();
            newIds.push(newId);
            return { ...p, id: newId, d: translateSvgPathD(p.d, dx, dy), order: s.paths.length + i };
          });
        mutatePaths(get, set, (paths) => [...paths, ...toAdd]);
        return newIds;
      },

      nudgePaths: (ids, dxPx, dyPx) =>
        mutatePaths(get, set, (paths) =>
          paths.map((p) => (ids.includes(p.id) ? { ...p, d: translateSvgPathD(p.d, dxPx, dyPx) } : p))
        ),

      rotatePaths: (ids, angleDeg, cx, cy) =>
        mutatePaths(get, set, (paths) =>
          paths.map((p) => (ids.includes(p.id) ? { ...p, d: rotateSvgPathD(p.d, angleDeg, cx, cy) } : p))
        ),

      scalePaths: (ids, factor, cx, cy) =>
        mutatePaths(get, set, (paths) =>
          paths.map((p) => (ids.includes(p.id) ? { ...p, d: scaleSvgPathD(p.d, factor, cx, cy) } : p))
        ),

      setPathsD: (updates) => {
        const byId = new Map(updates.map((u) => [u.id, u.d]));
        mutatePaths(get, set, (paths) => paths.map((p) => (byId.has(p.id) ? { ...p, d: byId.get(p.id)! } : p)));
      },

      setPathsGlow: (ids, glowIntensity) =>
        mutatePaths(get, set, (paths) => paths.map((p) => (ids.includes(p.id) ? { ...p, glowIntensity } : p))),

      setPathsBlink: (ids, blink) =>
        mutatePaths(get, set, (paths) => paths.map((p) => (ids.includes(p.id) ? { ...p, blink } : p))),

      addDrawnPath: (points, color, workspaceWidthPx, workspaceHeightPx) => {
        if (points.length < 2) return;
        if (get().workspaceWidthPx === 0) set({ workspaceWidthPx, workspaceHeightPx });
        const d = "M " + points.map((p) => `${p.x} ${p.y}`).join(" L ");
        mutatePaths(get, set, (paths) => [
          ...paths,
          { id: crypto.randomUUID(), d, color, order: paths.length },
        ]);
      },

      undo: () => {
        const s = get();
        if (s.pathsHistory.length === 0) return;
        const previous = s.pathsHistory[s.pathsHistory.length - 1];
        set({
          paths: previous,
          pathsHistory: s.pathsHistory.slice(0, -1),
          pathsFuture: [s.paths, ...s.pathsFuture].slice(0, MAX_HISTORY_ENTRIES),
        });
      },
      redo: () => {
        const s = get();
        if (s.pathsFuture.length === 0) return;
        const next = s.pathsFuture[0];
        set({
          paths: next,
          pathsHistory: [...s.pathsHistory, s.paths].slice(-MAX_HISTORY_ENTRIES),
          pathsFuture: s.pathsFuture.slice(1),
        });
      },
      canUndo: () => get().pathsHistory.length > 0,
      canRedo: () => get().pathsFuture.length > 0,

      setDimensions: (widthCm, heightCm, pxToCm) => set({ widthCm, heightCm, pxToCm }),
      setResolutionStatus: (resolutionStatus, failureReason = null) =>
        set({ resolutionStatus, resolutionFailureReason: failureReason }),
      setIsProcessing: (isProcessing) => set({ isProcessing }),

      setSupport: (support) => set({ support }),
      setHasRemote: (hasRemote) => set({ hasRemote }),
      setPriceBreakdown: (priceBreakdown) => set({ priceBreakdown }),

      canProceedFromCurrentStep: () => {
        const s = get();
        switch (s.step) {
          case 1: {
            if (s.sourceType === "draw") return s.paths.length > 0 && s.resolutionStatus !== "unresolved";
            const hasContent = s.sourceType === "image" ? !!s.sourceImageUrl : s.sourceText.trim().length > 0;
            return hasContent && s.resolutionStatus === "resolved";
          }
          case 2:
            return s.paths.length > 0 && s.resolutionStatus !== "unresolved";
          case 3:
            return true;
          default:
            return false;
        }
      },

      reset: () => set(initialState),
    }),
    {
      name: "neonz-configurator",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Seules les entrées utilisateur sont persistées ; les tracés/prix/état
      // de résolution sont dérivés et régénérés au montage (voir
      // hooks/useAutoResolveDesign.ts) — jamais fait confiance à un cache
      // potentiellement obsolète pour ces données calculées.
      partialize: (s) => ({
        step: s.step,
        furthestStepReached: s.furthestStepReached,
        sourceType: s.sourceType,
        sourceImageUrl: s.sourceImageUrl,
        sourceText: s.sourceText,
        fontId: s.fontId,
        widthCm: s.widthCm,
        heightCm: s.heightCm,
        support: s.support,
        hasRemote: s.hasRemote,
      }),
    }
  )
);
