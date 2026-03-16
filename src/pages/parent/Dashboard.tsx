import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  UserCheck, ClipboardList, Wallet, Bell, ArrowRight,
  Megaphone, TrendingUp, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { attendanceApi } from "@/api/attendance";
import { assignmentsApi } from "@/api/assignments";
import { paymentsApi } from "@/api/payments";
import { announcementsApi } from "@/api/announcements";
import { notificationsApi } from "@/api/notifications";
import PageHeader from "@/components/shared/PageHeader";
import StatsCard from "@/components/shared/StatsCard";
import { formatDate } from "@/lib/utils";

const STATUS_DOT: Record<string, string> = {
  PRESENT:  "bg-green-500",
  ABSENT:   "bg-red-500",
  LATE:     "bg-yellow-500",
  EXCUSED:  "bg-blue-400",
};

const ASSIGNMENT_STATUS_COLORS: Record<string, string> = {
  DRAFT:     "bg-slate-100 text-slate-600",
  PUBLISHED: "bg-blue-100 text-blue-700",
  CLOSED:    "bg-green-100 text-green-700",
};

export default function ParentDashboard() {
  const { user } = useAuth();

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: attendanceData } = useQuery({
    queryKey: ["attendance", "my", { limit: 30 }],
    queryFn: () => attendanceApi.getMy({ page: 1, limit: 30 }),
  });

  const { data: assignmentsData } = useQuery({
    queryKey: ["assignments", { limit: 5, status: "PENDING" }],
    queryFn: () => assignmentsApi.list({ page: 1, limit: 5 }),
  });

  const { data: paymentsData } = useQuery({
    queryKey: ["payments", { limit: 5 }],
    queryFn: () => paymentsApi.list({ page: 1, limit: 5 }),
  });

  const { data: announcementsData } = useQuery({
    queryKey: ["announcements", { limit: 4 }],
    queryFn: () => announcementsApi.list({ page: 1, limit: 4 }),
  });

  const { data: notificationsData } = useQuery({
    queryKey: ["notifications", { limit: 1 }],
    queryFn: () => notificationsApi.list({ page: 1, limit: 1 }),
  });

  // ── Derived values ─────────────────────────────────────────────────────────
  const attendanceRecords = attendanceData?.data?.data ?? [];
  const presentCount      = attendanceRecords.filter((r) => r.status === "PRESENT").length;
  const attendanceRate    = attendanceRecords.length
    ? Math.round((presentCount / attendanceRecords.length) * 100)
    : null;

  const assignments     = assignmentsData?.data?.data  ?? [];
  const payments        = paymentsData?.data?.data      ?? [];
  const announcements   = announcementsData?.data?.data ?? [];
  const unreadCount     = notificationsData?.data?.meta?.total ?? 0;

  const pendingPayments = payments.filter((p) => p.status === "PENDING").length;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.firstName ?? "Parent"} 👋`}
        description="Track your child's progress and school updates"
        action={
          <Link
            to="/notifications"
            className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
          >
            View Notifications <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          index={0}
          title="Attendance Rate"
          value={attendanceRate !== null ? `${attendanceRate}%` : "—"}
          description={`${presentCount} of ${attendanceRecords.length} days present`}
          icon={UserCheck}
          iconColor={
            attendanceRate === null ? "text-primary" :
            attendanceRate >= 80 ? "text-green-600" :
            attendanceRate >= 60 ? "text-yellow-500" : "text-red-500"
          }
        />
        <StatsCard
          index={1}
          title="Assignments"
          value={assignmentsData?.data?.meta?.total ?? "—"}
          description="Total this term"
          icon={ClipboardList}
          iconColor="text-secondary"
        />
        <StatsCard
          index={2}
          title="Pending Payments"
          value={pendingPayments || "—"}
          description={pendingPayments ? "Outstanding fees" : "All fees cleared"}
          icon={Wallet}
          iconColor={pendingPayments > 0 ? "text-orange-500" : "text-green-600"}
        />
        <StatsCard
          index={3}
          title="Notifications"
          value={unreadCount || "0"}
          description="Unread alerts"
          icon={Bell}
          iconColor="text-primary"
        />
      </div>

      {/* ── Main grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* Recent Attendance */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              Recent Attendance
            </h3>
            <Link to="/attendance" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {attendanceRecords.length ? (
            <div className="space-y-2">
              {attendanceRecords.slice(0, 8).map((record, i) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${STATUS_DOT[record.status] ?? "bg-slate-400"}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {(record as any).class?.name ?? "Class session"}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(record.date)}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    record.status === "PRESENT" ? "bg-green-100 text-green-700" :
                    record.status === "ABSENT"  ? "bg-red-100 text-red-700" :
                    record.status === "LATE"    ? "bg-yellow-100 text-yellow-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {record.status}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No attendance records yet.
            </div>
          )}

          {/* Attendance rate bar */}
          {attendanceRate !== null && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Overall rate
                </span>
                <span className={`font-semibold ${attendanceRate >= 80 ? "text-green-600" : attendanceRate >= 60 ? "text-yellow-600" : "text-red-500"}`}>
                  {attendanceRate}%
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${attendanceRate}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-2 rounded-full ${attendanceRate >= 80 ? "bg-green-500" : attendanceRate >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Announcements */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" />
              Announcements
            </h3>
            <Link to="/announcements" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {announcements.length ? (
            <ul className="space-y-3">
              {announcements.map((ann, i) => (
                <motion.li
                  key={ann.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-start gap-2.5"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug truncate">{ann.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(ann.createdAt)}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No announcements.</p>
          )}
        </div>
      </div>

      {/* ── Assignments + Payments ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Upcoming Assignments */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-secondary" />
              Assignments
            </h3>
            <Link to="/assignments" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {assignments.length ? (
            <ul className="space-y-2.5">
              {assignments.map((asgn, i) => (
                <motion.li
                  key={asgn.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    {asgn.status === "CLOSED" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (asgn.dueDate && new Date(asgn.dueDate) < new Date()) ? (
                      <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{asgn.title}</p>
                      <p className="text-xs text-muted-foreground">Due {asgn.dueDate ? formatDate(asgn.dueDate) : "—"}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${ASSIGNMENT_STATUS_COLORS[asgn.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {asgn.status}
                  </span>
                </motion.li>
              ))}
            </ul>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <ClipboardList className="h-7 w-7 mx-auto mb-2 opacity-30" />
              No assignments yet.
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4 text-orange-500" />
              Fee Payments
            </h3>
            <Link to="/payments" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {payments.length ? (
            <ul className="space-y-2.5">
              {payments.map((pay, i) => (
                <motion.li
                  key={pay.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{pay.reference ?? "Payment"}</p>
                    <p className="text-xs text-muted-foreground">{pay.paidAt ? formatDate(pay.paidAt) : "Pending"}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {pay.amount && (
                      <span className="text-sm font-semibold text-foreground">
                        ₦{Number(pay.amount).toLocaleString()}
                      </span>
                    )}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      pay.status === "PAID"    ? "bg-green-100 text-green-700" :
                      pay.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {pay.status}
                    </span>
                  </div>
                </motion.li>
              ))}
            </ul>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <Wallet className="h-7 w-7 mx-auto mb-2 opacity-30" />
              No payment records yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
