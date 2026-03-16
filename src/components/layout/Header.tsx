import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUiStore } from "@/stores/uiStore";
import { getInitials } from "@/lib/utils";

export default function Header() {
  const { user } = useAuth();
  const { unreadNotifications } = useUiStore();

  return (
    <motion.header
      className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200 h-14 flex items-center px-6 gap-4"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Search placeholder */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-100 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Notifications */}
        <Link
          to="/notifications"
          className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadNotifications > 0 && (
            <motion.span
              key={unreadNotifications}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
            >
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </motion.span>
          )}
        </Link>

        {/* Avatar */}
        <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.firstName}
              className="h-8 w-8 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
              {user ? getInitials(user.firstName, user.lastName) : "?"}
            </div>
          )}
          {user && (
            <span className="text-sm font-medium hidden sm:block">
              {user.firstName}
            </span>
          )}
        </Link>
      </div>
    </motion.header>
  );
}
