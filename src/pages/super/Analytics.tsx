import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import { Building2, CheckCircle2, Clock, Ban, Users, TrendingUp } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import {
  platformStats, schoolRegistrationTrend, platformSchoolStatus,
} from "@/lib/analyticsData";

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

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.35, delay: i * 0.07, ease: "easeOut" as const },
  }),
};

export default function SuperAnalytics() {
  const p = platformStats;

  const topStats = [
    { title: "Total Schools",    value: p.totalSchools,    icon: Building2,   bg: "bg-blue-50",    color: "text-primary",    sub: `${p.newThisMonth} new this month` },
    { title: "Active Schools",   value: p.activeSchools,   icon: CheckCircle2,bg: "bg-green-50",   color: "text-green-600",  sub: "Currently active" },
    { title: "Pending Approval", value: p.pendingSchools,  icon: Clock,       bg: "bg-yellow-50",  color: "text-yellow-600", sub: "Awaiting review" },
    { title: "Suspended",        value: p.suspendedSchools,icon: Ban,         bg: "bg-orange-50",  color: "text-orange-600", sub: "Needs action" },
    { title: "Platform Users",   value: p.totalUsers.toLocaleString(), icon: Users, bg: "bg-purple-50", color: "text-purple-600", sub: "Across all schools" },
    { title: "Growth Rate",      value: "+14%",            icon: TrendingUp,  bg: "bg-emerald-50", color: "text-emerald-600", sub: "Month over month" },
  ];

  return (
    <div>
      <PageHeader
        title="Platform Analytics"
        description="Overview of all schools on LogosClass"
      />

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
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
            <p className="text-[11px] text-muted-foreground mt-1">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Row 1: School registrations + Status distribution ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2">
          <ChartCard title="School Growth" subtitle="New registrations and total active schools">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={schoolRegistrationTrend}>
                <defs>
                  <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1e40af" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1e40af" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="active"        name="Active Schools"      stroke="#1e40af" strokeWidth={2.5} fill="url(#activeGrad)" dot={{ r: 3 }} />
                <Bar  dataKey="registrations" name="New Registrations" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title="School Status" subtitle="Distribution by current status">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={platformSchoolStatus}
                cx="50%" cy="42%"
                innerRadius={60} outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {platformSchoolStatus.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v} schools`]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Row 2: Monthly new registrations bar ─────────────────────────── */}
      <ChartCard title="Monthly School Registrations" subtitle="New schools joining the platform each month">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={schoolRegistrationTrend} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="registrations" name="New Schools" fill="#1e40af" radius={[6, 6, 0, 0]}
              label={{ position: "top", fontSize: 11, fill: "#64748b" }}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
