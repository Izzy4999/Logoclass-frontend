import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/api/users";
import { classesApi } from "@/api/classes";
import { assignmentsApi } from "@/api/assignments";
import { announcementsApi } from "@/api/announcements";
import { paymentsApi } from "@/api/payments";
import PageHeader from "@/components/shared/PageHeader";
import StatsCard from "@/components/shared/StatsCard";
import { useAuth } from "@/hooks/useAuth";
import { Users, School, ClipboardList, Megaphone, Wallet, UserCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function AdminDashboard() {
  const { user } = useAuth();

  const { data: users } = useQuery({
    queryKey: ["users", { limit: 1 }],
    queryFn: () => usersApi.list({ page: 1, limit: 1 }),
  });

  const { data: classes } = useQuery({
    queryKey: ["classes", { limit: 1 }],
    queryFn: () => classesApi.list({ page: 1, limit: 1 }),
  });

  const { data: assignments } = useQuery({
    queryKey: ["assignments", { limit: 1 }],
    queryFn: () => assignmentsApi.list({ page: 1, limit: 1 }),
  });

  const { data: announcements } = useQuery({
    queryKey: ["announcements", { limit: 5 }],
    queryFn: () => announcementsApi.list({ page: 1, limit: 5 }),
  });

  const { data: payments } = useQuery({
    queryKey: ["payments", { limit: 5 }],
    queryFn: () => paymentsApi.list({ page: 1, limit: 5 }),
  });

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.firstName ?? "Admin"}`}
        description={`${user?.tenant?.name ?? "Your school"} — ${formatDate(new Date())}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Total Users"
          value={users?.data.meta?.total ?? "—"}
          icon={Users}
          description="Across all roles"
        />
        <StatsCard
          title="Class Sections"
          value={classes?.data.meta?.total ?? "—"}
          icon={School}
          iconColor="text-secondary"
        />
        <StatsCard
          title="Assignments"
          value={assignments?.data.meta?.total ?? "—"}
          icon={ClipboardList}
          iconColor="text-cta"
        />
        <StatsCard
          title="Active Announcements"
          value={announcements?.data.meta?.total ?? "—"}
          icon={Megaphone}
          iconColor="text-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Announcements */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            Recent Announcements
          </h3>
          {announcements?.data.data.length ? (
            <ul className="space-y-3">
              {announcements.data.data.map((ann) => (
                <li key={ann.id} className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{ann.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(ann.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            Recent Payments
          </h3>
          {payments?.data.data.length ? (
            <ul className="space-y-3">
              {payments.data.data.map((pay) => (
                <li key={pay.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{pay.reference}</p>
                    <p className="text-xs text-muted-foreground">{pay.method}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    pay.status === "PAID" ? "bg-green-100 text-green-700" :
                    pay.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {pay.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
