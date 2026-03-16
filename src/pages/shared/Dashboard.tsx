import { useAuth } from "@/hooks/useAuth";
import { lazy, Suspense } from "react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const TeacherDashboard = lazy(() => import("@/pages/teacher/Dashboard"));
const StudentDashboard = lazy(() => import("@/pages/student/Dashboard"));
const ParentDashboard = lazy(() => import("@/pages/parent/Dashboard"));
const SuperDashboard = lazy(() => import("@/pages/super/Dashboard"));

export default function Dashboard() {
  const { isSuperAdmin, isStudent, isParent, isTeacher } = useAuth();

  let DashComp = AdminDashboard;
  if (isSuperAdmin) DashComp = SuperDashboard;
  else if (isStudent) DashComp = StudentDashboard;
  else if (isParent) DashComp = ParentDashboard;
  else if (isTeacher) DashComp = TeacherDashboard;

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DashComp />
    </Suspense>
  );
}
