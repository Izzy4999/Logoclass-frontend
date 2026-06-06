import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

/**
 * Called once on app startup.
 * Silently exchanges the HttpOnly refresh_token cookie for a new accessToken
 * so the user stays logged in after a page reload.
 * If the refresh fails (no cookie / expired / revoked), log the user out cleanly.
 */
export async function bootstrapAuth(): Promise<void> {
  const { isAuthenticated, setAccessToken, logout } = useAuthStore.getState();

  if (!isAuthenticated) return;

  try {
    const res = await axios.post(
      `${BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    const newToken: string = res.data.data.accessToken;
    setAccessToken(newToken);
  } catch {
    logout();
  }
}
