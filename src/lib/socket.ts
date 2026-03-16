import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/lib/toast";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3000";

let socket: Socket | null = null;

export function connectSocket() {
  const { accessToken } = useAuthStore.getState();
  if (!accessToken || socket?.connected) return;

  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    transports: ["websocket"],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on("connect", () => {
    console.info("[Socket] Connected:", socket?.id);
  });

  socket.on("connect_error", (err) => {
    console.warn("[Socket] Connection error:", err.message);
  });

  // ── Notification ──────────────────────────────────────────────────────────
  socket.on("notification", (data: { title?: string; message?: string } = {}) => {
    const { unreadNotifications, setUnreadNotifications } = useUiStore.getState();
    setUnreadNotifications(unreadNotifications + 1);
    toast.info(data.title ?? "New Notification", data.message);
  });

  // ── New message ───────────────────────────────────────────────────────────
  socket.on("message_received", (data: { senderName?: string; preview?: string } = {}) => {
    const { unreadMessages, setUnreadMessages } = useUiStore.getState();
    setUnreadMessages(unreadMessages + 1);
    toast.info(
      data.senderName ? `Message from ${data.senderName}` : "New Message",
      data.preview,
    );
  });

  // ── Live class started ────────────────────────────────────────────────────
  socket.on("live_class_started", (data: { title?: string; classId?: string; liveClassId?: string } = {}) => {
    toast.success(
      "Live Class Started 🎥",
      data.title ? `"${data.title}" is now live` : "A live class just started",
    );
  });

  socket.on("disconnect", (reason) => {
    console.info("[Socket] Disconnected:", reason);
  });
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket() {
  return socket;
}
