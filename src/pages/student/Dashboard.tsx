import { useQuery } from "@tanstack/react-query";
import { lessonsApi } from "@/api/lessons";
import { assignmentsApi } from "@/api/assignments";
import { attendanceApi } from "@/api/attendance";
import { notificationsApi } from "@/api/notifications";
import PageHeader from "@/components/shared/PageHeader";
import StatsCard from "@/components/shared/StatsCard";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, ClipboardList, UserCheck, Bell } from "lucide-react";
import { formatDate, formatRelative } from "@/lib/utils";

export default function StudentDashboard() {
  const { user } = useAuth();

  const { data: lessons } = useQuery({
    queryKey: ["lessons", { limit: 1 }],
    queryFn: () => lessonsApi.list({ page: 1, limit: 1 }),
  });

  const { data: assignments } = useQuery({
    queryKey: ["assignments", { limit: 5 }],
    queryFn: () => assignmentsApi.list({ page: 1, limit: 5, status: "PUBLISHED" }),
  });

  const { data: attendance } = useQuery({
    queryKey: ["attendance-summary", user?.id],
    queryFn: () => user ? attendanceApi.getSummary(user.id) : null,
    enabled: !!user,
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications", { limit: 5, isRead: false }],
    queryFn: () => notificationsApi.list({ page: 1, limit: 5, isRead: false }),
  });

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.firstName ?? "Student"}`}
        description={`Today is ${formatDate(new Date())}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Lessons Available" value={lessons?.data.meta?.total ?? "—"} icon={BookOpen} />
        <StatsCard title="Pending Assignments" value={assignments?.data.meta?.total ?? "—"} icon={ClipboardList} iconColor="text-orange-500" />
        <StatsCard
          title="Attendance %"
          value={attendance?.data.data?.attendancePercentage != null
            ? `${attendance.data.data.attendancePercentage.toFixed(1)}%`
            : "—"}
          icon={UserCheck}
          iconColor="text-cta"
        />
        <StatsCard title="Unread Alerts" value={notifications?.data.meta?.total ?? 0} icon={Bell} iconColor="text-secondary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Assignments */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Pending Assignments
          </h3>
          {assignments?.data.data.length ? (
            <ul className="space-y-3">
              {assignments.data.data.map((a) => (
                <li key={a.id} className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.title}</p>
                    {a.dueDate && (
                      <p className="text-xs text-muted-foreground">Due {formatDate(a.dueDate)}</p>
                    )}
                  </div>
                  <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No pending assignments.</p>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Recent Notifications
          </h3>
          {notifications?.data.data.length ? (
            <ul className="space-y-3">
              {notifications.data.data.map((n) => (
                <li key={n.id} className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-secondary mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{formatRelative(n.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">All caught up!</p>
          )}
        </div>
      </div>
    </div>
  );
}
