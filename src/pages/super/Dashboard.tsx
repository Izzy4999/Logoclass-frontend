import { useQuery } from "@tanstack/react-query";
import { tenantsApi } from "@/api/tenants";
import PageHeader from "@/components/shared/PageHeader";
import StatsCard from "@/components/shared/StatsCard";
import { Building2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Link } from "react-router-dom";

export default function SuperDashboard() {
  const { data: tenants } = useQuery({
    queryKey: ["tenants", {}],
    queryFn: () => tenantsApi.list({ page: 1, limit: 100 }),
  });

  const all = tenants?.data.data ?? [];
  const active = all.filter((t) => t.status === "ACTIVE").length;
  const pending = all.filter((t) => t.status === "PENDING").length;
  const suspended = all.filter((t) => t.status === "SUSPENDED").length;

  return (
    <div>
      <PageHeader title="Super Admin Dashboard" description="Overview of all schools on LogosClass" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Total Schools" value={all.length} icon={Building2} />
        <StatsCard title="Active" value={active} icon={CheckCircle2} iconColor="text-cta" />
        <StatsCard title="Pending Approval" value={pending} icon={Clock} iconColor="text-orange-500" />
        <StatsCard title="Suspended" value={suspended} icon={XCircle} iconColor="text-destructive" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-semibold text-foreground mb-4">Recent Schools</h3>
        {all.slice(0, 10).length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 text-muted-foreground font-medium">School</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Status</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {all.slice(0, 10).map((t) => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                  <td className="py-2.5 font-medium text-foreground">{t.name}</td>
                  <td className="py-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      t.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                      t.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>{t.status}</span>
                  </td>
                  <td className="py-2.5 text-muted-foreground">{t.createdAt ? formatDate(t.createdAt) : "—"}</td>
                  <td className="py-2.5">
                    <Link to={`/super/tenants/${t.id}`} className="text-primary hover:underline text-xs">
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">No schools yet.</p>
        )}
      </div>
    </div>
  );
}
