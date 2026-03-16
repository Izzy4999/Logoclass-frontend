import { useQuery } from "@tanstack/react-query";
import { lessonsApi } from "@/api/lessons";
import { assignmentsApi } from "@/api/assignments";
import { liveClassesApi } from "@/api/live-classes";
import PageHeader from "@/components/shared/PageHeader";
import StatsCard from "@/components/shared/StatsCard";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, ClipboardList, Video, Users } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { Link } from "react-router-dom";

export default function TeacherDashboard() {
  const { user } = useAuth();

  const { data: lessons } = useQuery({
    queryKey: ["lessons", { limit: 1 }],
    queryFn: () => lessonsApi.list({ page: 1, limit: 1 }),
  });

  const { data: assignments } = useQuery({
    queryKey: ["assignments", { limit: 1 }],
    queryFn: () => assignmentsApi.list({ page: 1, limit: 1 }),
  });

  const { data: liveClasses } = useQuery({
    queryKey: ["live-classes", { limit: 5, status: "SCHEDULED" }],
    queryFn: () => liveClassesApi.list({ page: 1, limit: 5, status: "SCHEDULED" }),
  });

  return (
    <div>
      <PageHeader
        title={`Hello, ${user?.firstName ?? "Teacher"}`}
        description="Manage your lessons, assignments, and live classes"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatsCard title="My Lessons" value={lessons?.data.meta?.total ?? "—"} icon={BookOpen} />
        <StatsCard title="Assignments" value={assignments?.data.meta?.total ?? "—"} icon={ClipboardList} iconColor="text-cta" />
        <StatsCard title="Upcoming Live Classes" value={liveClasses?.data.meta?.total ?? "—"} icon={Video} iconColor="text-secondary" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Video className="h-4 w-4 text-primary" />
          Upcoming Live Classes
        </h3>
        {liveClasses?.data.data.length ? (
          <ul className="space-y-3">
            {liveClasses.data.data.map((lc) => (
              <li key={lc.id} className="flex items-center justify-between p-3 bg-brand-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">{lc.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(lc.scheduledAt)}</p>
                </div>
                <Link
                  to={`/live-classes/${lc.id}/room`}
                  className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition"
                >
                  Start
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No upcoming live classes.</p>
        )}
      </div>
    </div>
  );
}
