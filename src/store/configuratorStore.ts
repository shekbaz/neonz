import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { NeonPath } from "@/types/neon";
import type { DesignPriceBreakdown } from "@/lib/neon/pricing";
import { translateSvgPathD, rotateSvgPathD, scaleSvgPathD } from "@/lib/neon/pathTransform";

export type ConfiguratorStep = 1 | 2;
export type SupportType = "acrylic-transparent" | "acrylic-black" | "silhouette-cut";
export type ResolutionStatus = "idle" | "resolving" | "resolved" | "unresolved";

/** Surface de travail fixe du canvas unifié — les éléments ajoutés (image, texte, dessin)
 *  sont mis à l'échelle pour y tenir, elle ne change plus jamais elle-même. */
export const DEFAULT_WORKSPACE_WIDTH_PX = 600;
export const DEFAULT_WORKSPACE_HEIGHT_PX = 400;

interface ConfiguratorState {
  step: ConfiguratorStep;
  /** Étape la plus avancée jamais atteinte — borne la navigation avant du stepper cliquable. */
  furthestStepReached: ConfiguratorStep;

  paths: NeonPath[];
  /** Piles d'annulation/rétablissement des éditions manuelles (couleur, suppression, déplacement, ajout...). */
  pathsHistory: NeonPath[][];
  pathsFuture: NeonPath[][];
  workspaceWidthPx: number;
  workspaceHeightPx: number;

  widthCm: number;
  heightCm: number;
  pxToCm: number;

  /** Statut de la vérification de collision — jamais montré comme tel à
   *  l'utilisateur, seulement utilisé pour piloter le blocage de l'étape suivante. */
  resolutionStatus: ResolutionStatus;
  resolutionFailureReason: string | null;

  support: SupportType;
  hasRemote: boolean;

  priceBreakdown: DesignPriceBreakdown | null;

  setStep: (step: ConfiguratorStep) => void;
  goNext: () => void;
  goBack: () => void;

  setPaths: (paths: NeonPath[], workspaceWidthPx: number, workspaceHeightPx: number) => void;
  setPathColor: (pathId: string, color: string) => void;
  setAllPathColors: (color: string) => void;

  /** Fusionne un lot de tracés déjà positionnés/mis à l'échelle (ajout image/texte). */
  addPathsGroup: (newPaths: NeonPath[]) => void;
  /** Ajoute un tracé dessiné à la main (mode dessin). */
  addDrawnPath: (points: { x: number; y: number }[], color: string, groupId: string) => void;

  /** Supprime les tracés donnés. Ne fait rien (retourne false) si ça viderait tout le design. */
  removePaths: (ids: string[]) => boolean;
  /** Clone les tracés donnés (décalés visuellement) et retourne les nouveaux ids. */
  duplicatePaths: (ids: string[]) => string[];
  /** Repositionne finement les tracés donnés (boutons flèches ou commit de glisser-déposer). */
  nudgePaths: (ids: string[], dxPx: number, dyPx: number) => void;
  rotatePaths: (ids: string[], angleDeg: number, cx: number, cy: number) => void;
  scalePaths: (ids: string[], factor: number, cx: number, cy: number) => void;
  /** Écrase directement le "d" de tracés donnés (ex: revectorisation d'un groupe image). */
  setPathsD: (updates: { id: string; d: string }[]) => void;
  /** Remplace entièrement les tracés d'un groupe (ex: revectorisation avec de nouveaux réglages). */
  replaceGroup: (groupId: string, newPaths: NeonPath[]) => void;
  setPathsGlow: (ids: string[], glowIntensity: number) => void;
  setPathsBlink: (ids: string[], blink: boolean) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  setDimensions: (widthCm: number, heightCm: number) => void;
  setResolutionStatus: (status: ResolutionStatus, failureReason?: string | null) => void;

  setSupport: (support: SupportType) => void;
  setHasRemote: (value: boolean) => void;
  setPriceBreakdown: (breakdown: DesignPriceBreakdown | null) => void;

  canProceedFromCurrentStep: () => boolean;
  reset: () => void;
}

const MAX_HISTORY_ENTRIES = 50;

const volatileInitialState = {
  paths: [] as NeonPath[],
  pathsHistory: [] as NeonPath[][],
  pathsFuture: [] as NeonPath[][],
  resolutionStatus: "idle" as ResolutionStatus,
  resolutionFailureReason: null as string | null,
  priceBreakdown: null as DesignPriceBreakdown | null,
};

const initialState = {
  step: 1 as ConfiguratorStep,
  furthestStepReached: 1 as ConfiguratorStep,
  workspaceWidthPx: DEFAULT_WORKSPACE_WIDTH_PX,
  workspaceHeightPx: DEFAULT_WORKSPACE_HEIGHT_PX,
  widthCm: 60,
  heightCm: 30,
  pxToCm: 60 / DEFAULT_WORKSPACE_WIDTH_PX,
  support: "acrylic-transparent" as SupportType,
  hasRemote: false,
  ...volatileInitialState,
};

/**
 * Applique une édition manuelle en poussant l'état courant sur la pile
 * d'annulation (bornée) et en vidant le rétablissement — utilisé par toutes
 * les actions qui modifient `paths` (couleur, suppression, ajout,
 * déplacement, rotation, échelle, glow, clignotement).
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
          const next = (s.step < 2 ? s.step + 1 : s.step) as ConfiguratorStep;
          return { step: next, furthestStepReached: (Math.max(s.furthestStepReached, next) as ConfiguratorStep) };
        }),
      goBack: () => set((s) => ({ step: (s.step > 1 ? ((s.step - 1) as ConfiguratorStep) : s.step) })),

      // Remplacement complet (ex: "Nouveau design") : pas une édition manuelle,
      // donc pas d'entrée d'historique.
      setPaths: (paths, workspaceWidthPx, workspaceHeightPx) =>
        set({ paths, workspaceWidthPx, workspaceHeightPx, pathsHistory: [], pathsFuture: [] }),

      setPathColor: (pathId, color) =>
        mutatePaths(get, set, (paths) => paths.map((p) => (p.id === pathId ? { ...p, color } : p))),
      setAllPathColors: (color) => mutatePaths(get, set, (paths) => paths.map((p) => ({ ...p, color }))),

      addPathsGroup: (newPaths) => {
        mutatePaths(get, set, (paths) => [
          ...paths,
          ...newPaths.map((p, i) => ({ ...p, order: paths.length + i })),
        ]);
      },

      addDrawnPath: (points, color, groupId) => {
        if (points.length < 2) return;
        const d = "M " + points.map((p) => `${p.x} ${p.y}`).join(" L ");
        mutatePaths(get, set, (paths) => [
          ...paths,
          { id: crypto.randomUUID(), d, color, order: paths.length, groupId },
        ]);
      },

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

      replaceGroup: (groupId, newPaths) => {
        mutatePaths(get, set, (paths) => {
          const others = paths.filter((p) => p.groupId !== groupId);
          return [...others, ...newPaths.map((p, i) => ({ ...p, groupId, order: others.length + i }))];
        });
      },

      setPathsGlow: (ids, glowIntensity) =>
        mutatePaths(get, set, (paths) => paths.map((p) => (ids.includes(p.id) ? { ...p, glowIntensity } : p))),

      setPathsBlink: (ids, blink) =>
        mutatePaths(get, set, (paths) => paths.map((p) => (ids.includes(p.id) ? { ...p, blink } : p))),

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

      setDimensions: (widthCm, heightCm) =>
        set((s) => ({
          widthCm,
          heightCm,
          pxToCm: Math.min(widthCm / s.workspaceWidthPx, heightCm / s.workspaceHeightPx),
        })),
      setResolutionStatus: (resolutionStatus, failureReason = null) =>
        set({ resolutionStatus, resolutionFailureReason: failureReason }),

      setSupport: (support) => set({ support }),
      setHasRemote: (hasRemote) => set({ hasRemote }),
      setPriceBreakdown: (priceBreakdown) => set({ priceBreakdown }),

      canProceedFromCurrentStep: () => {
        const s = get();
        switch (s.step) {
          case 1:
            return s.paths.length > 0 && s.resolutionStatus !== "unresolved";
          case 2:
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
      version: 2,
      // Le canvas est désormais composé librement par l'utilisateur (ajout
      // d'image/texte/dessin, édition de zone) sans mécanisme de
      // régénération automatique au chargement — `paths` doit donc être
      // persisté, sous peine de perdre tout le design à un rafraîchissement.
      partialize: (s) => ({
        step: s.step,
        furthestStepReached: s.furthestStepReached,
        paths: s.paths,
        widthCm: s.widthCm,
        heightCm: s.heightCm,
        pxToCm: s.pxToCm,
        support: s.support,
        hasRemote: s.hasRemote,
      }),
    }
  )
);
