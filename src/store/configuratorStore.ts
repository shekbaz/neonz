import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { NeonElement, Point } from "@/types/neon";
import type { DesignPriceBreakdown } from "@/lib/neon/pricing";
import { translateElement, rotateElement, scaleElement, scaleElementsToWorkspace } from "@/lib/neon/elementGeometry";

export type SupportType = "acrylic-transparent" | "acrylic-black" | "silhouette-cut";

/** Surface de travail fixe du canvas unifié — les éléments ajoutés (texte, dessin, formes)
 *  sont positionnés dans ce repère, elle ne change plus jamais elle-même. */
export const DEFAULT_WORKSPACE_WIDTH_PX = 600;
export const DEFAULT_WORKSPACE_HEIGHT_PX = 400;

interface ConfiguratorState {
  elements: NeonElement[];
  /** Piles d'annulation/rétablissement des éditions manuelles (couleur, suppression, déplacement, ajout...). */
  elementsHistory: NeonElement[][];
  elementsFuture: NeonElement[][];
  workspaceWidthPx: number;
  workspaceHeightPx: number;

  widthCm: number;
  heightCm: number;
  pxToCm: number;

  support: SupportType;
  hasRemote: boolean;

  priceBreakdown: DesignPriceBreakdown | null;

  setElements: (elements: NeonElement[], workspaceWidthPx: number, workspaceHeightPx: number) => void;
  addElement: (el: NeonElement) => void;
  setElementColor: (id: string, color: string) => void;
  setAllElementColors: (color: string) => void;

  /** Supprime les éléments donnés. Ne fait rien (retourne false) si ça viderait tout le design. */
  removeElements: (ids: string[]) => boolean;
  /** Clone les éléments donnés (décalés visuellement) et retourne les nouveaux ids. */
  duplicateElements: (ids: string[]) => string[];
  /** Repositionne finement les éléments donnés (boutons flèches ou commit de glisser-déposer). */
  nudgeElements: (ids: string[], dxPx: number, dyPx: number) => void;
  rotateElements: (ids: string[], angleDeg: number, cx: number, cy: number) => void;
  scaleElements: (ids: string[], factor: number, cx: number, cy: number) => void;
  setElementsGlow: (ids: string[], glowIntensity: number) => void;
  setElementsBlink: (ids: string[], blink: boolean) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  setDimensions: (widthCm: number, heightCm: number) => void;

  setSupport: (support: SupportType) => void;
  setHasRemote: (value: boolean) => void;
  setPriceBreakdown: (breakdown: DesignPriceBreakdown | null) => void;

  reset: () => void;
}

const MAX_HISTORY_ENTRIES = 50;

const volatileInitialState = {
  elements: [] as NeonElement[],
  elementsHistory: [] as NeonElement[][],
  elementsFuture: [] as NeonElement[][],
  priceBreakdown: null as DesignPriceBreakdown | null,
};

const initialState = {
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
 * les actions qui modifient `elements` (couleur, suppression, ajout,
 * déplacement, rotation, échelle, glow, clignotement).
 */
function mutateElements(
  get: () => ConfiguratorState,
  set: (partial: Partial<ConfiguratorState>) => void,
  fn: (elements: NeonElement[]) => NeonElement[]
) {
  const s = get();
  const elementsHistory = [...s.elementsHistory, s.elements].slice(-MAX_HISTORY_ENTRIES);
  set({ elements: fn(s.elements), elementsHistory, elementsFuture: [] });
}

function duplicateOffset(el: NeonElement, dx: number, dy: number): NeonElement {
  return translateElement(el, dx, dy);
}

export const useConfiguratorStore = create<ConfiguratorState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Remplacement complet (ex: "Nouveau design") : pas une édition manuelle,
      // donc pas d'entrée d'historique.
      setElements: (elements, workspaceWidthPx, workspaceHeightPx) =>
        set({ elements, workspaceWidthPx, workspaceHeightPx, elementsHistory: [], elementsFuture: [] }),

      addElement: (el) => mutateElements(get, set, (elements) => [...elements, el]),

      setElementColor: (id, color) =>
        mutateElements(get, set, (elements) => elements.map((e) => (e.id === id ? { ...e, color } : e))),
      setAllElementColors: (color) =>
        mutateElements(get, set, (elements) => elements.map((e) => ({ ...e, color }))),

      removeElements: (ids) => {
        const remaining = get().elements.filter((e) => !ids.includes(e.id));
        if (remaining.length === 0) return false;
        mutateElements(get, set, () => remaining);
        return true;
      },

      duplicateElements: (ids) => {
        const s = get();
        const dx = s.workspaceWidthPx * 0.08;
        const dy = s.workspaceWidthPx * 0.08;
        const newIds: string[] = [];
        const toAdd = s.elements
          .filter((e) => ids.includes(e.id))
          .map((e) => {
            const newId = crypto.randomUUID();
            newIds.push(newId);
            return { ...duplicateOffset(e, dx, dy), id: newId };
          });
        mutateElements(get, set, (elements) => [...elements, ...toAdd]);
        return newIds;
      },

      nudgeElements: (ids, dxPx, dyPx) =>
        mutateElements(get, set, (elements) =>
          elements.map((e) => (ids.includes(e.id) ? translateElement(e, dxPx, dyPx) : e))
        ),

      rotateElements: (ids, angleDeg, cx, cy) =>
        mutateElements(get, set, (elements) =>
          elements.map((e) => (ids.includes(e.id) ? rotateElement(e, angleDeg, cx, cy) : e))
        ),

      scaleElements: (ids, factor, cx, cy) =>
        mutateElements(get, set, (elements) =>
          elements.map((e) => (ids.includes(e.id) ? scaleElement(e, factor, cx, cy) : e))
        ),

      setElementsGlow: (ids, glowIntensity) =>
        mutateElements(get, set, (elements) =>
          elements.map((e) => (ids.includes(e.id) ? { ...e, glowIntensity } : e))
        ),
      setElementsBlink: (ids, blink) =>
        mutateElements(get, set, (elements) => elements.map((e) => (ids.includes(e.id) ? { ...e, blink } : e))),

      undo: () => {
        const s = get();
        if (s.elementsHistory.length === 0) return;
        const previous = s.elementsHistory[s.elementsHistory.length - 1];
        set({
          elements: previous,
          elementsHistory: s.elementsHistory.slice(0, -1),
          elementsFuture: [s.elements, ...s.elementsFuture].slice(0, MAX_HISTORY_ENTRIES),
        });
      },
      redo: () => {
        const s = get();
        if (s.elementsFuture.length === 0) return;
        const next = s.elementsFuture[0];
        set({
          elements: next,
          elementsHistory: [...s.elementsHistory, s.elements].slice(-MAX_HISTORY_ENTRIES),
          elementsFuture: s.elementsFuture.slice(1),
        });
      },
      canUndo: () => get().elementsHistory.length > 0,
      canRedo: () => get().elementsFuture.length > 0,

      setDimensions: (widthCm, heightCm) =>
        set((s) => {
          const scaleX = widthCm / s.widthCm;
          const scaleY = heightCm / s.heightCm;
          const elements =
            s.elements.length > 0 && (scaleX !== 1 || scaleY !== 1)
              ? scaleElementsToWorkspace(s.elements, scaleX, scaleY)
              : s.elements;
          return {
            widthCm,
            heightCm,
            pxToCm: Math.min(widthCm / s.workspaceWidthPx, heightCm / s.workspaceHeightPx),
            elements,
          };
        }),

      setSupport: (support) => set({ support }),
      setHasRemote: (hasRemote) => set({ hasRemote }),
      setPriceBreakdown: (priceBreakdown) => set({ priceBreakdown }),

      reset: () => set(initialState),
    }),
    {
      name: "neonz-configurator",
      storage: createJSONStorage(() => localStorage),
      version: 4,
      // Le canvas est composé librement par l'utilisateur (texte/dessin/formes,
      // édition de zone) sans régénération automatique au chargement —
      // `elements` doit donc être persisté, sous peine de perdre le design à
      // un rafraîchissement.
      partialize: (s) => ({
        elements: s.elements,
        widthCm: s.widthCm,
        heightCm: s.heightCm,
        pxToCm: s.pxToCm,
        support: s.support,
        hasRemote: s.hasRemote,
      }),
    }
  )
);

export type { Point };
