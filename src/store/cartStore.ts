import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string; // productId ou customDesignId
  type: "catalog" | "custom";
  name: string;
  image?: string;
  unitPrice: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  subtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((s) => {
          const existing = s.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
              ),
            };
          }
          return { items: [...s.items, item] };
        }),

      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      updateQuantity: (id, quantity) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i)),
        })),

      clear: () => set({ items: [] }),

      subtotal: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    }),
    { name: "neonz-cart" }
  )
);
