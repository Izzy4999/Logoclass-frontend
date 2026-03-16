import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

/**
 * Called once on app startup.
 * If a refreshToken exists in the store, silently exchange it for a new
 * accessToken so the user stays logged in after a page reload.
 * If the refresh fails (expired / revoked), log the user out cleanly.
 */
export async function bootstrapAuth(): Promise<void> {
  const { refreshToken, setAccessToken, logout } = useAuthStore.getState();

  if (!refreshToken) return;

  try {
    const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
    const newToken: string = res.data.data.accessToken;
    setAccessToken(newToken);
  } catch {
    // Refresh token is expired or invalid — clear everything
    logout();
  }
}
