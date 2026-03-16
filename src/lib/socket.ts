import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3000";

let socket: Socket | null = null;

export function connectSocket() {
  const { accessToken } = useAuthStore.getState();
  if (!accessToken || socket?.connected) return;

  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    console.info("[Socket] Connected");
  });

  socket.on("notification", () => {
    const { unreadNotifications, setUnreadNotifications } = useUiStore.getState();
    setUnreadNotifications(unreadNotifications + 1);
  });

  socket.on("message_received", () => {
    const { unreadMessages, setUnreadMessages } = useUiStore.getState();
    setUnreadMessages(unreadMessages + 1);
  });

  socket.on("disconnect", () => {
    console.info("[Socket] Disconnected");
  });
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket() {
  return socket;
}
