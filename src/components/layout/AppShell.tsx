import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import Header from "./Header";
import AnimatedPage from "@/components/ui/AnimatedPage";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { useAuth } from "@/hooks/useAuth";
import { notificationsApi } from "@/api/notifications";
import { useUiStore } from "@/stores/uiStore";

export default function AppShell() {
  const location  = useLocation();
  const mainRef   = useRef<HTMLElement>(null);
  const { user }  = useAuth();
  const { setUnreadNotifications } = useUiStore();

  // Scroll to top on route change
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  // Connect socket when authenticated; disconnect on unmount/logout
  useEffect(() => {
    if (!user) return;
    connectSocket();
    return () => disconnectSocket();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Seed unread notification count from API on mount
  useEffect(() => {
    if (!user) return;
    notificationsApi
      .list({ page: 1, limit: 1 })
      .then((res) => {
        const total = (res.data as any)?.meta?.total ?? 0;
        setUnreadNotifications(total);
      })
      .catch(() => {/* silent */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main ref={mainRef} className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait" initial={false}>
            <AnimatedPage key={location.pathname}>
              <Outlet />
            </AnimatedPage>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
