import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import {
  Users, School, UserCheck, ClipboardList,
  Wallet, Video, TrendingUp, TrendingDown,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import {
  overviewStats, attendanceTrend, enrollmentTrend, paymentTrend,
  assignmentCompletion, roleDistribution, quizPerformance,
} from "@/lib/analyticsData";

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000
    ? `₦${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `₦${(n / 1_000).toFixed(0)}K`
    : String(n);

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.35, delay: i * 0.06, ease: "easeOut" },
  }),
};

// ─── reusable chart card ──────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── custom tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-medium">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { user } = useAuth();
  const s = overviewStats;

  const topStats = [
    { title: "Total Users",        value: s.totalUsers,                  sub: "All roles",            icon: Users,       color: "text-primary",    bg: "bg-blue-50",    trend: +8  },
    { title: "Class Sections",     value: s.totalClasses,                sub: "Active classes",       icon: School,      color: "text-purple-600", bg: "bg-purple-50",  trend: +2  },
    { title: "Avg Attendance",     value: `${s.avgAttendanceRate}%`,     sub: "This month",           icon: UserCheck,   color: "text-green-600",  bg: "bg-green-50",   trend: +5  },
    { title: "Assignments",        value: s.totalAssignments,            sub: `${s.pendingAssignments} pending`, icon: ClipboardList, color: "text-orange-600", bg: "bg-orange-50", trend: -3 },
    { title: "Revenue Collected",  value: fmt(s.revenueCollected),       sub: "Academic year",        icon: Wallet,      color: "text-emerald-600",bg: "bg-emerald-50", trend: +12 },
    { title: "Live Classes Held",  value: s.liveClassesHeld,             sub: "This semester",        icon: Video,       color: "text-sky-600",    bg: "bg-sky-50",     trend: +6  },
  ];

  return (
    <div>
      <PageHeader
        title="Analytics"
        description={`${user?.tenant?.name ?? "School"} — performance overview`}
      />

      {/* ── Top stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {topStats.map((s, i) => (
          <motion.div
            key={s.title}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={CARD_VARIANTS}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"
          >
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-3`}>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className="text-xs text-muted-foreground font-medium truncate">{s.title}</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{s.value}</p>
            <div className="flex items-center gap-1 mt-1">
              {s.trend > 0
                ? <TrendingUp className="h-3 w-3 text-green-500" />
                : <TrendingDown className="h-3 w-3 text-red-500" />
              }
              <span className={`text-xs font-medium ${s.trend > 0 ? "text-green-600" : "text-red-600"}`}>
                {Math.abs(s.trend)}% vs last month
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Row 1: Attendance + Role distribution ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2">
          <ChartCard title="Attendance Trend" subtitle="Monthly attendance rate (%)">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={attendanceTrend}>
                <defs>
                  <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1e40af" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#1e40af" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="rate" name="Attendance %" stroke="#1e40af" strokeWidth={2.5} fill="url(#attGrad)" dot={{ r: 3, fill: "#1e40af" }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title="User Distribution" subtitle="By role">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={roleDistribution} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {roleDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v} users`]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Row 2: Payments + Assignment completion ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <ChartCard title="Payment Collection" subtitle="Monthly collected vs outstanding (₦)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={paymentTrend} barSize={14} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="collected"   name="Collected"   fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outstanding" name="Outstanding" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Assignment Submission Rate" subtitle="By class (%)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={assignmentCompletion} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <YAxis dataKey="class" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Submission rate"]} />
              <Bar dataKey="rate" name="Submission %" fill="#6366f1" radius={[0, 4, 4, 0]}
                label={{ position: "right", fontSize: 10, fill: "#64748b", formatter: (v: number) => `${v}%` }}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Row 3: Enrollment growth + Quiz performance ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <ChartCard title="Enrollment Growth" subtitle="Students and teachers over time">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={enrollmentTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="students" name="Students" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="teachers"  name="Teachers"  stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title="Quiz Performance" subtitle="Avg score vs pass rate (%)">
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={quizPerformance}>
              <PolarGrid stroke="#f1f5f9" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 9 }} />
              <Radar name="Avg Score" dataKey="avg"      stroke="#1e40af" fill="#1e40af" fillOpacity={0.2} />
              <Radar name="Pass Rate" dataKey="passRate" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
