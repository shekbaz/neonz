import { create } from "zustand";
import type { CollisionResult, NeonPath } from "@/types/neon";
import type { DesignPriceBreakdown } from "@/lib/neon/pricing";
import type { NeonFontId } from "@/types/neon";

export type ConfiguratorStep = 1 | 2 | 3 | 4 | 5;
export type SupportType = "acrylic-transparent" | "acrylic-black" | "silhouette-cut";

interface ConfiguratorState {
  step: ConfiguratorStep;
  sourceType: "image" | "text" | null;
  sourceImageUrl: string | null;
  sourceText: string;
  fontId: NeonFontId;

  paths: NeonPath[];
  workspaceWidthPx: number;
  workspaceHeightPx: number;

  widthCm: number;
  heightCm: number;
  pxToCm: number;

  collisionResult: CollisionResult | null;
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

  setPaths: (paths: NeonPath[], workspaceWidthPx: number, workspaceHeightPx: number) => void;
  setPathColor: (pathId: string, color: string) => void;

  setDimensions: (widthCm: number, heightCm: number, pxToCm: number) => void;
  setCollisionResult: (result: CollisionResult | null) => void;
  setIsProcessing: (value: boolean) => void;

  setSupport: (support: SupportType) => void;
  setHasRemote: (value: boolean) => void;
  setPriceBreakdown: (breakdown: DesignPriceBreakdown | null) => void;

  canProceedFromCurrentStep: () => boolean;
  reset: () => void;
}

const initialState = {
  step: 1 as ConfiguratorStep,
  sourceType: null,
  sourceImageUrl: null,
  sourceText: "",
  fontId: "pacifico" as NeonFontId,
  paths: [] as NeonPath[],
  workspaceWidthPx: 0,
  workspaceHeightPx: 0,
  widthCm: 40,
  heightCm: 20,
  pxToCm: 0,
  collisionResult: null as CollisionResult | null,
  isProcessing: false,
  support: "acrylic-transparent" as SupportType,
  hasRemote: false,
  priceBreakdown: null as DesignPriceBreakdown | null,
};

export const useConfiguratorStore = create<ConfiguratorState>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  goNext: () =>
    set((s) => ({ step: (s.step < 5 ? ((s.step + 1) as ConfiguratorStep) : s.step) })),
  goBack: () => set((s) => ({ step: (s.step > 1 ? ((s.step - 1) as ConfiguratorStep) : s.step) })),

  setSourceType: (sourceType) => set({ sourceType }),
  setSourceImageUrl: (sourceImageUrl) => set({ sourceImageUrl }),
  setSourceText: (sourceText) => set({ sourceText }),
  setFontId: (fontId) => set({ fontId }),

  setPaths: (paths, workspaceWidthPx, workspaceHeightPx) =>
    set({ paths, workspaceWidthPx, workspaceHeightPx }),

  setPathColor: (pathId, color) =>
    set((s) => ({
      paths: s.paths.map((p) => (p.id === pathId ? { ...p, color } : p)),
    })),

  setDimensions: (widthCm, heightCm, pxToCm) => set({ widthCm, heightCm, pxToCm }),
  setCollisionResult: (collisionResult) => set({ collisionResult }),
  setIsProcessing: (isProcessing) => set({ isProcessing }),

  setSupport: (support) => set({ support }),
  setHasRemote: (hasRemote) => set({ hasRemote }),
  setPriceBreakdown: (priceBreakdown) => set({ priceBreakdown }),

  canProceedFromCurrentStep: () => {
    const s = get();
    switch (s.step) {
      case 1:
        return s.sourceType === "image" ? !!s.sourceImageUrl : s.sourceText.trim().length > 0;
      case 2:
        return s.paths.length > 0 && !!s.collisionResult && !s.collisionResult.hasCollision;
      case 3:
        return s.paths.every((p) => !!p.color);
      case 4:
        return s.widthCm > 0 && s.heightCm > 0 && !s.collisionResult?.hasCollision;
      case 5:
        return true;
      default:
        return false;
    }
  },

  reset: () => set(initialState),
}));
