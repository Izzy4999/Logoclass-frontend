import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/user";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setAccessToken: (token: string) => void;
  setMustChangePassword: (value: boolean) => void;
  updateUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      mustChangePassword: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      setAccessToken: (token) => set({ accessToken: token }),

      setMustChangePassword: (value) => set({ mustChangePassword: value }),

      updateUser: (user) => set({ user }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          mustChangePassword: false,
        }),
    }),
    {
      name: "logosclass-auth",
      // Only persist refreshToken and user — accessToken is short-lived
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        user: state.user,
        mustChangePassword: state.mustChangePassword,
      }),
    }
  )
);
