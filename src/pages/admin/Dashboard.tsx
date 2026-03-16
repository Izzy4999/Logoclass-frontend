import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Users, School, ClipboardList, Megaphone, Wallet,
  UserCheck, TrendingUp, TrendingDown, ArrowRight,
} from "lucide-react";
import { usersApi } from "@/api/users";
import { classesApi } from "@/api/classes";
import { assignmentsApi } from "@/api/assignments";
import { announcementsApi } from "@/api/announcements";
import { paymentsApi } from "@/api/payments";
import PageHeader from "@/components/shared/PageHeader";
import StatsCard from "@/components/shared/StatsCard";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";
import {
  attendanceTrend, paymentTrend, overviewStats, assignmentCompletion,
} from "@/lib/analyticsData";

export default function AdminDashboard() {
  const { user } = useAuth();

  const { data: users }         = useQuery({ queryKey: ["users", { limit: 1 }],         queryFn: () => usersApi.list({ page: 1, limit: 1 }) });
  const { data: classes }       = useQuery({ queryKey: ["classes", { limit: 1 }],       queryFn: () => classesApi.list({ page: 1, limit: 1 }) });
  const { data: assignments }   = useQuery({ queryKey: ["assignments", { limit: 1 }],   queryFn: () => assignmentsApi.list({ page: 1, limit: 1 }) });
  const { data: announcements } = useQuery({ queryKey: ["announcements", { limit: 5 }], queryFn: () => announcementsApi.list({ page: 1, limit: 5 }) });
  const { data: payments }      = useQuery({ queryKey: ["payments", { limit: 5 }],      queryFn: () => paymentsApi.list({ page: 1, limit: 5 }) });

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.firstName ?? "Admin"} 👋`}
        description={`${user?.tenant?.name ?? "Your school"} — ${formatDate(new Date())}`}
        action={
          <Link to="/analytics" className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
            Full Analytics <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard index={0} title="Total Users"    value={users?.data.meta?.total ?? "—"}       icon={Users}         description="Across all roles" />
        <StatsCard index={1} title="Class Sections" value={classes?.data.meta?.total ?? "—"}     icon={School}        iconColor="text-secondary" />
        <StatsCard index={2} title="Assignments"    value={assignments?.data.meta?.total ?? "—"} icon={ClipboardList} iconColor="text-cta" />
        <StatsCard index={3} title="Avg Attendance" value={`${overviewStats.avgAttendanceRate}%`} icon={UserCheck}    iconColor="text-purple-600" description="This month" />
      </div>

      {/* ── Mini charts ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-foreground">Attendance Trend</h3>
              <p className="text-xs text-muted-foreground">Monthly rate (%)</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
              <TrendingUp className="h-3.5 w-3.5" /> +5% this month
            </span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={attendanceTrend}>
              <defs>
                <linearGradient id="dashAttGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1e40af" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1e40af" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[70, 100]} hide />
              <Tooltip formatter={(v: number) => [`${v}%`, "Attendance"]} contentStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="rate" stroke="#1e40af" strokeWidth={2} fill="url(#dashAttGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-foreground">Payment Collection</h3>
              <p className="text-xs text-muted-foreground">Monthly collected (₦)</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
              <TrendingUp className="h-3.5 w-3.5" /> +12% vs last month
            </span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={paymentTrend} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={(v: number) => [`₦${(v / 1000).toFixed(0)}K`]} contentStyle={{ fontSize: 11 }} />
              <Bar dataKey="collected" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Assignment completion + quick stats ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-foreground">Assignment Submission by Class</h3>
            <Link to="/analytics" className="text-xs text-primary hover:underline">See full analytics</Link>
          </div>
          <div className="space-y-2.5">
            {assignmentCompletion.map((c) => (
              <div key={c.class} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-14 flex-shrink-0">{c.class}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-primary transition-all duration-700" style={{ width: `${c.rate}%` }} />
                </div>
                <span className={`text-xs font-semibold w-8 text-right ${c.rate >= 80 ? "text-green-600" : c.rate >= 60 ? "text-orange-500" : "text-red-500"}`}>
                  {c.rate}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {[
            { label: "Revenue (YTD)", value: "₦3.99M", icon: Wallet,       bg: "bg-orange-50",  color: "text-orange-600", trend: "up"   },
            { label: "Pending Work",  value: String(overviewStats.pendingAssignments), icon: ClipboardList, bg: "bg-red-50", color: "text-red-500", trend: "down" },
            { label: "Announcements", value: String(overviewStats.activeAnnouncements), icon: Megaphone, bg: "bg-blue-50", color: "text-primary", trend: null },
          ].map(({ label, value, icon: Icon, bg, color, trend }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold text-foreground">{value}</p>
              </div>
              {trend === "up" && <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0" />}
              {trend === "down" && <TrendingDown className="h-4 w-4 text-red-500 flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Announcements + Payments ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-sm text-foreground mb-4 flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" /> Recent Announcements
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
          ) : <p className="text-sm text-muted-foreground">No announcements yet.</p>}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-sm text-foreground mb-4 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" /> Recent Payments
          </h3>
          {payments?.data.data.length ? (
            <ul className="space-y-3">
              {payments.data.data.map((pay) => (
                <li key={pay.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{pay.reference}</p>
                    <p className="text-xs text-muted-foreground">{pay.method}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pay.status === "PAID" ? "bg-green-100 text-green-700" : pay.status === "PENDING" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                    {pay.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No payments yet.</p>}
        </div>
      </div>
    </div>
  );
}
