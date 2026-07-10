import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { NeonPath } from "@/types/neon";
import type { DesignPriceBreakdown } from "@/lib/neon/pricing";
import type { NeonFontId } from "@/types/neon";
import { DEFAULT_TRACE_SETTINGS, type TraceSettings } from "@/lib/neon/traceSettings";
import { translateSvgPathD } from "@/lib/neon/pathTransform";

export type { TraceSettings };
export { DEFAULT_TRACE_SETTINGS };

export type ConfiguratorStep = 1 | 2 | 3;
export type SupportType = "acrylic-transparent" | "acrylic-black" | "silhouette-cut";
export type ResolutionStatus = "idle" | "resolving" | "resolved" | "unresolved";

interface ConfiguratorState {
  step: ConfiguratorStep;
  /** Étape la plus avancée jamais atteinte — borne la navigation avant du stepper cliquable. */
  furthestStepReached: ConfiguratorStep;

  sourceType: "image" | "text" | null;
  sourceImageUrl: string | null;
  sourceText: string;
  fontId: NeonFontId;

  traceSettings: TraceSettings;

  paths: NeonPath[];
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

  setSourceType: (type: "image" | "text") => void;
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
  /** Repositionne finement les tracés donnés (boutons flèches). */
  nudgePaths: (ids: string[], dxPx: number, dyPx: number) => void;
  setPathsGlow: (ids: string[], glowIntensity: number) => void;
  setPathsBlink: (ids: string[], blink: boolean) => void;

  setDimensions: (widthCm: number, heightCm: number, pxToCm: number) => void;
  setResolutionStatus: (status: ResolutionStatus, failureReason?: string | null) => void;
  setIsProcessing: (value: boolean) => void;

  setSupport: (support: SupportType) => void;
  setHasRemote: (value: boolean) => void;
  setPriceBreakdown: (breakdown: DesignPriceBreakdown | null) => void;

  canProceedFromCurrentStep: () => boolean;
  reset: () => void;
}

const volatileInitialState = {
  traceSettings: DEFAULT_TRACE_SETTINGS,
  paths: [] as NeonPath[],
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
  sourceType: "image" as "image" | "text" | null,
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
        set({ sourceType, paths: [], resolutionStatus: "idle", resolutionFailureReason: null }),
      setSourceImageUrl: (sourceImageUrl) =>
        set({ sourceImageUrl, resolutionStatus: "idle", resolutionFailureReason: null }),
      setSourceText: (sourceText) => set({ sourceText, resolutionStatus: "idle", resolutionFailureReason: null }),
      setFontId: (fontId) => set({ fontId, resolutionStatus: "idle", resolutionFailureReason: null }),
      setTraceSettings: (partial) =>
        set((s) => ({ traceSettings: { ...s.traceSettings, ...partial } })),
      resetTraceSettings: () => set({ traceSettings: DEFAULT_TRACE_SETTINGS }),

      setPaths: (paths, workspaceWidthPx, workspaceHeightPx) =>
        set({ paths, workspaceWidthPx, workspaceHeightPx }),

      setPathColor: (pathId, color) =>
        set((s) => ({
          paths: s.paths.map((p) => (p.id === pathId ? { ...p, color } : p)),
        })),
      setAllPathColors: (color) =>
        set((s) => ({ paths: s.paths.map((p) => ({ ...p, color })) })),

      removePaths: (ids) => {
        const s = get();
        const remaining = s.paths.filter((p) => !ids.includes(p.id));
        if (remaining.length === 0) return false;
        set({ paths: remaining });
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
        set({ paths: [...s.paths, ...toAdd] });
        return newIds;
      },

      nudgePaths: (ids, dxPx, dyPx) =>
        set((s) => ({
          paths: s.paths.map((p) => (ids.includes(p.id) ? { ...p, d: translateSvgPathD(p.d, dxPx, dyPx) } : p)),
        })),

      setPathsGlow: (ids, glowIntensity) =>
        set((s) => ({
          paths: s.paths.map((p) => (ids.includes(p.id) ? { ...p, glowIntensity } : p)),
        })),

      setPathsBlink: (ids, blink) =>
        set((s) => ({
          paths: s.paths.map((p) => (ids.includes(p.id) ? { ...p, blink } : p)),
        })),

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
