import { create } from "zustand";

export type ToastVariant = "default" | "success" | "error" | "info";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (toast: Omit<ToastItem, "id">) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (toast) =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        { ...toast, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` },
      ],
    })),
  remove: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// ── Imperative helpers (use outside React) ────────────────────────────────────
export const toast = {
  show:    (title: string, description?: string) => useToastStore.getState().add({ title, description, variant: "default" }),
  success: (title: string, description?: string) => useToastStore.getState().add({ title, description, variant: "success" }),
  error:   (title: string, description?: string) => useToastStore.getState().add({ title, description, variant: "error" }),
  info:    (title: string, description?: string) => useToastStore.getState().add({ title, description, variant: "info" }),
};
