import { create } from "zustand";

export type ToastVariant = "default" | "success" | "error" | "info";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** 0–100. When set, a progress bar is rendered inside the toast. */
  progress?: number;
  /** When true, the toast never auto-dismisses (used for in-progress uploads). */
  persistent?: boolean;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (toast: Omit<ToastItem, "id">) => string;
  update: (id: string, partial: Partial<Omit<ToastItem, "id">>) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  add: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    return id;
  },

  update: (id, partial) =>
    set((s) => ({
      toasts: s.toasts.map((t) => (t.id === id ? { ...t, ...partial } : t)),
    })),

  remove: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// ── Imperative helpers (usable outside React components) ──────────────────────
export const toast = {
  show: (title: string, description?: string) =>
    useToastStore.getState().add({ title, description, variant: "default" }),

  success: (title: string, description?: string) =>
    useToastStore.getState().add({ title, description, variant: "success" }),

  error: (title: string, description?: string) =>
    useToastStore.getState().add({ title, description, variant: "error" }),

  info: (title: string, description?: string) =>
    useToastStore.getState().add({ title, description, variant: "info" }),

  /** Creates a persistent progress toast. Returns the id so you can update/dismiss it. */
  progress: (title: string, description?: string): string =>
    useToastStore.getState().add({
      title,
      description,
      variant: "info",
      progress: 0,
      persistent: true,
    }),

  update: (id: string, partial: Partial<Omit<ToastItem, "id">>) =>
    useToastStore.getState().update(id, partial),

  dismiss: (id: string) =>
    useToastStore.getState().remove(id),
};
