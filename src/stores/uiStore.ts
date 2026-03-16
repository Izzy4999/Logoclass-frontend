import { create } from "zustand";

interface UiState {
  sidebarCollapsed: boolean;
  unreadNotifications: number;
  unreadMessages: number;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setUnreadNotifications: (count: number) => void;
  setUnreadMessages: (count: number) => void;
  decrementNotifications: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  unreadNotifications: 0,
  unreadMessages: 0,

  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  setUnreadNotifications: (count) => set({ unreadNotifications: count }),

  setUnreadMessages: (count) => set({ unreadMessages: count }),

  decrementNotifications: () =>
    set((s) => ({
      unreadNotifications: Math.max(0, s.unreadNotifications - 1),
    })),
}));
