import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUiStore } from "@/stores/uiStore";
import {
  LayoutDashboard, Users, Shield, School, BookOpen, Video,
  ClipboardList, PenTool, FileText, Calendar, UserCheck, Megaphone,
  CreditCard, Wallet, ScrollText, Settings, MessageSquare, Bell,
  User, Building2, ChevronLeft, ChevronRight, LogOut, BarChart2,
} from "lucide-react";
import { LogoMark, LogoFull } from "@/components/Logo";
import type { Permission } from "@/types/role";

const navContainerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.045, delayChildren: 0.1 } },
};
const navItemVariants = {
  hidden: { opacity: 0, x: -14 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.22, ease: "easeOut" as const } },
};

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  permission?: Permission;
  superAdminOnly?: boolean;
  alwaysShow?: boolean;
  /** Feature flag key — item is hidden when this feature is disabled for the tenant */
  feature?: string;
}

const ADMIN_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, alwaysShow: true },
  { label: "Users", path: "/users", icon: Users, permission: "MANAGE_USERS" },
  { label: "Roles", path: "/roles", icon: Shield, permission: "MANAGE_ROLES" },
  { label: "Classes", path: "/classes", icon: School, permission: "MANAGE_CLASSES" },
  { label: "Grade Levels", path: "/grade-levels", icon: BookOpen, permission: "MANAGE_CLASSES" },
  { label: "Subjects", path: "/subjects", icon: FileText, permission: "MANAGE_CLASSES" },
  { label: "Academic Years", path: "/academic-years", icon: Calendar, permission: "MANAGE_CLASSES" },
  { label: "Enrollments", path: "/enrollments", icon: UserCheck, permission: "MANAGE_CLASSES" },
  { label: "Lessons", path: "/lessons", icon: BookOpen, permission: "MANAGE_LESSONS" },
  { label: "Live Classes", path: "/live-classes", icon: Video, permission: "MANAGE_LIVE_CLASSES", feature: "LIVE_CLASSES" },
  { label: "Assignments", path: "/assignments", icon: ClipboardList, permission: "MANAGE_ASSIGNMENTS" },
  { label: "Quizzes", path: "/quizzes", icon: PenTool, permission: "MANAGE_QUIZZES", feature: "QUIZZES" },
  { label: "Exams", path: "/exams", icon: FileText, permission: "MANAGE_EXAMS" },
  { label: "Attendance", path: "/attendance", icon: UserCheck, permission: "MARK_ATTENDANCE" },
  { label: "Announcements", path: "/announcements", icon: Megaphone, permission: "CREATE_ANNOUNCEMENT" },
  { label: "Fees", path: "/fees", icon: CreditCard, permission: "MANAGE_PAYMENTS", feature: "PAYMENTS" },
  { label: "Payments", path: "/payments", icon: Wallet, permission: "MANAGE_PAYMENTS", feature: "PAYMENTS" },
  { label: "Analytics", path: "/analytics", icon: BarChart2, alwaysShow: true },
  { label: "Action Logs", path: "/action-logs", icon: ScrollText, permission: "VIEW_ACTION_LOGS" },
  { label: "Settings", path: "/settings", icon: Settings, permission: "MANAGE_TENANT_SETTINGS" },
];

const STUDENT_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, alwaysShow: true },
  { label: "Lessons", path: "/lessons", icon: BookOpen, alwaysShow: true },
  { label: "Live Classes", path: "/live-classes", icon: Video, alwaysShow: true, feature: "LIVE_CLASSES" },
  { label: "Assignments", path: "/assignments", icon: ClipboardList, alwaysShow: true },
  { label: "Quizzes", path: "/quizzes", icon: PenTool, alwaysShow: true, feature: "QUIZZES" },
  { label: "Exams", path: "/exams", icon: FileText, alwaysShow: true },
  { label: "Attendance", path: "/attendance", icon: UserCheck, alwaysShow: true },
  { label: "Fees", path: "/fees", icon: CreditCard, alwaysShow: true, feature: "PAYMENTS" },
];

const PARENT_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, alwaysShow: true },
  { label: "Attendance", path: "/attendance", icon: UserCheck, alwaysShow: true },
  { label: "Grades", path: "/course-enrollments", icon: BookOpen, alwaysShow: true },
  { label: "Fees", path: "/fees", icon: CreditCard, alwaysShow: true, feature: "PAYMENTS" },
];

const SUPER_ADMIN_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/super/dashboard", icon: LayoutDashboard, alwaysShow: true },
  { label: "Schools",   path: "/super/tenants",   icon: Building2,       alwaysShow: true },
  { label: "Users",     path: "/super/users",     icon: Users,           alwaysShow: true },
  { label: "Analytics", path: "/super/analytics", icon: BarChart2,       alwaysShow: true },
];

const SHARED_ITEMS: NavItem[] = [
  { label: "Messages", path: "/messages", icon: MessageSquare, alwaysShow: true, feature: "MESSAGING" },
  { label: "Notifications", path: "/notifications", icon: Bell, alwaysShow: true, feature: "NOTIFICATIONS" },
  { label: "Profile", path: "/profile", icon: User, alwaysShow: true },
];

export default function Sidebar() {
  const { user, isSuperAdmin, isStudent, isParent, can, logout } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    logout();
    navigate("/login");
  };

  /** Returns true if the feature is enabled for this tenant (or if no feature restriction). */
  const isFeatureEnabled = (feature?: string): boolean => {
    if (!feature) return true;
    if (isSuperAdmin) return true; // super admin sees everything
    const features = user?.tenant?.features;
    if (!features) return true; // features not loaded yet — show all
    const found = features.find((f) => f.feature === feature);
    return found?.enabled ?? false;
  };

  const getNavItems = (): NavItem[] => {
    if (isSuperAdmin) return SUPER_ADMIN_ITEMS;
    if (isStudent) return STUDENT_ITEMS;
    if (isParent) return PARENT_ITEMS;
    return ADMIN_ITEMS;
  };

  const navItems = getNavItems().filter(
    (item) =>
      (item.alwaysShow || (item.permission && can(item.permission))) &&
      isFeatureEnabled(item.feature)
  );

  return (
    <aside
      className={cn(
        "flex flex-col bg-brand-900 text-white transition-all duration-300 ease-in-out h-screen sticky top-0",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <motion.div
        className="flex items-center px-4 py-5 border-b border-brand-800"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {sidebarCollapsed
          ? <LogoMark size={32} />
          : <LogoFull size={32} dark />
        }
      </motion.div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        <motion.div
          variants={navContainerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-0.5"
        >
          {navItems.map((item) => (
            <motion.div key={item.path} variants={navItemVariants}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-brand-200 hover:bg-white/8 hover:text-white"
                  )
                }
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="h-4.5 w-4.5 flex-shrink-0 h-[18px] w-[18px]" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            </motion.div>
          ))}
        </motion.div>

        {/* Divider + shared items */}
        <div className="pt-3 mt-3 border-t border-brand-800 space-y-0.5">
          {SHARED_ITEMS.filter((item) => isFeatureEnabled(item.feature)).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-brand-200 hover:bg-white/8 hover:text-white"
                )
              }
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User + logout */}
      <div className="border-t border-brand-800 p-3 space-y-2">
        {!sidebarCollapsed && user && (
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="h-8 w-8 rounded-full bg-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate text-white">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-brand-300 truncate">{user.role?.name ?? "Super Admin"}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-brand-200 hover:bg-white/10 hover:text-white transition-colors"
          title={sidebarCollapsed ? "Logout" : undefined}
        >
          <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 bg-brand-900 border border-brand-700 rounded-full p-1 text-white hover:bg-brand-800 transition-colors"
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>
    </aside>
  );
}
