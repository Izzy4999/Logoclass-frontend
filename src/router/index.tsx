import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ProtectedRoute, GuestRoute, ForcePasswordChangeRoute, SuperAdminRoute, PermissionRoute } from "./guards";
import AppShell from "@/components/layout/AppShell";
import AuthLayout from "@/components/layout/AuthLayout";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

const L = (factory: () => Promise<{ default: React.ComponentType }>) => {
  const Comp = lazy(factory);
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Comp />
    </Suspense>
  );
};

export const router = createBrowserRouter([
  // ─── Guest routes ────────────────────────────────────────────────────────────
  {
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: "/login", element: L(() => import("@/pages/auth/Login")) },
          { path: "/register", element: L(() => import("@/pages/auth/Register")) },
          { path: "/forgot-password", element: L(() => import("@/pages/auth/ForgotPassword")) },
          { path: "/reset-password", element: L(() => import("@/pages/auth/ResetPassword")) },
        ],
      },
    ],
  },

  // ─── Force password change ──────────────────────────────────────────────────
  {
    element: <ForcePasswordChangeRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: "/change-password", element: L(() => import("@/pages/auth/ForceChangePassword")) },
        ],
      },
    ],
  },

  // ─── Protected routes ────────────────────────────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/dashboard", element: L(() => import("@/pages/shared/Dashboard")) },
          { path: "/profile", element: L(() => import("@/pages/shared/Profile")) },
          { path: "/messages", element: L(() => import("@/pages/shared/Messages")) },
          { path: "/messages/:id", element: L(() => import("@/pages/shared/Conversation")) },
          { path: "/notifications", element: L(() => import("@/pages/shared/Notifications")) },

          // Super Admin
          {
            element: <SuperAdminRoute />,
            children: [
              { path: "/super/dashboard", element: L(() => import("@/pages/super/Dashboard")) },
              { path: "/super/tenants", element: L(() => import("@/pages/super/Tenants")) },
              { path: "/super/tenants/:id", element: L(() => import("@/pages/super/TenantDetail")) },
              { path: "/super/users", element: L(() => import("@/pages/super/Users")) },
              { path: "/super/analytics", element: L(() => import("@/pages/super/Analytics")) },
            ],
          },

          // Users
          {
            element: <PermissionRoute permissions={["MANAGE_USERS"]} />,
            children: [
              { path: "/users", element: L(() => import("@/pages/admin/Users")) },
              { path: "/users/:id", element: L(() => import("@/pages/admin/UserDetail")) },
            ],
          },

          // Roles
          {
            element: <PermissionRoute permissions={["MANAGE_ROLES"]} />,
            children: [
              { path: "/roles", element: L(() => import("@/pages/admin/Roles")) },
            ],
          },

          // Classes
          {
            element: <PermissionRoute permissions={["MANAGE_CLASSES"]} />,
            children: [
              { path: "/classes", element: L(() => import("@/pages/admin/Classes")) },
              { path: "/grade-levels", element: L(() => import("@/pages/admin/GradeLevels")) },
              { path: "/subjects", element: L(() => import("@/pages/admin/Subjects")) },
              { path: "/academic-years", element: L(() => import("@/pages/admin/AcademicYears")) },
              { path: "/enrollments", element: L(() => import("@/pages/admin/Enrollments")) },
              { path: "/course-enrollments", element: L(() => import("@/pages/admin/CourseEnrollments")) },
            ],
          },

          // Analytics (admin)
          { path: "/analytics", element: L(() => import("@/pages/shared/AnalyticsPage")) },

          // Lessons
          { path: "/lessons", element: L(() => import("@/pages/shared/LessonsPage")) },
          { path: "/lessons/:id", element: L(() => import("@/pages/shared/LessonDetail")) },

          // Live Classes
          { path: "/live-classes", element: L(() => import("@/pages/shared/LiveClassesPage")) },
          { path: "/live-classes/:id/room", element: L(() => import("@/pages/shared/LiveClassRoom")) },

          // Assignments
          { path: "/assignments", element: L(() => import("@/pages/shared/AssignmentsPage")) },
          { path: "/assignments/:id", element: L(() => import("@/pages/shared/AssignmentDetail")) },

          // Quizzes
          { path: "/quizzes", element: L(() => import("@/pages/shared/QuizzesPage")) },
          { path: "/quizzes/:id/attempt", element: L(() => import("@/pages/student/QuizAttempt")) },

          // Exams
          { path: "/exams", element: L(() => import("@/pages/shared/ExamsPage")) },
          { path: "/exams/:id/room", element: L(() => import("@/pages/student/ExamRoom")) },

          // Attendance
          { path: "/attendance", element: L(() => import("@/pages/shared/AttendancePage")) },

          // Announcements
          { path: "/announcements", element: L(() => import("@/pages/shared/AnnouncementsPage")) },

          // Payments
          { path: "/fees", element: L(() => import("@/pages/shared/FeesPage")) },
          { path: "/payments", element: L(() => import("@/pages/shared/PaymentsPage")) },

          // Admin-only
          {
            element: <PermissionRoute permissions={["VIEW_ACTION_LOGS"]} />,
            children: [
              { path: "/action-logs", element: L(() => import("@/pages/admin/ActionLogs")) },
            ],
          },
          {
            element: <PermissionRoute permissions={["MANAGE_TENANT_SETTINGS"]} />,
            children: [
              { path: "/settings", element: L(() => import("@/pages/admin/Settings")) },
            ],
          },
        ],
      },
    ],
  },

  // ─── Fallback ────────────────────────────────────────────────────────────────
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
