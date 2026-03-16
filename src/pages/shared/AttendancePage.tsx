import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Filter, Plus, Edit2, Check, X, Loader2, ClipboardCheck,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Modal from "@/components/shared/Modal";
import { attendanceApi } from "@/api/attendance";
import { classesApi } from "@/api/classes";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { AttendanceRecord, AttendanceStatus } from "@/types/attendance";

const STATUSES: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];
const STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: "bg-green-50 text-green-700",
  ABSENT:  "bg-red-50 text-red-700",
  LATE:    "bg-yellow-50 text-yellow-700",
  EXCUSED: "bg-blue-50 text-blue-700",
};
const STATUS_DOT: Record<AttendanceStatus, string> = {
  PRESENT: "bg-green-500",
  ABSENT:  "bg-red-500",
  LATE:    "bg-yellow-500",
  EXCUSED: "bg-blue-500",
};

interface BulkRow { studentId: string; studentName: string; status: AttendanceStatus; note: string; }

export default function AttendancePage() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const canMark = can("MARK_ATTENDANCE");

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const [markOpen, setMarkOpen] = useState(false);
  const [markDate, setMarkDate] = useState(new Date().toISOString().slice(0, 10));
  const [markClassId, setMarkClassId] = useState("");
  const [markType, setMarkType] = useState<"CLASS" | "DAILY">("CLASS");
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [markErr, setMarkErr] = useState("");
  const [markSuccess, setMarkSuccess] = useState("");

  const [editTarget, setEditTarget] = useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>("PRESENT");
  const [editNote, setEditNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["attendance", page, classFilter, statusFilter, fromDate],
    queryFn: () => attendanceApi.list({
      page, limit: 20,
      classId: classFilter || undefined,
      status: statusFilter || undefined,
      fromDate: fromDate || undefined,
    }),
  });

  const { data: classData } = useQuery({
    queryKey: ["classes-for-attendance"],
    queryFn: () => classesApi.list({ limit: 100 }),
  });

  const records: AttendanceRecord[] = data?.data?.data ?? [];
  const meta = data?.data?.meta;
  const classes = classData?.data?.data ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ["attendance"] });

  const filtered = search.trim()
    ? records.filter(r =>
        `${r.student?.firstName} ${r.student?.lastName}`.toLowerCase().includes(search.toLowerCase())
      )
    : records;

  const { data: classStudentsData } = useQuery({
    queryKey: ["class-for-bulk-mark", markClassId],
    queryFn: () => attendanceApi.listForClass(markClassId, { limit: 100 }),
    enabled: !!markClassId,
  });

  const classStudents = classStudentsData?.data?.data ?? [];
  const uniqueStudents: BulkRow[] = classStudents
    .filter(r => r.student)
    .reduce<BulkRow[]>((acc, r) => {
      if (!acc.find(x => x.studentId === r.student!.id)) {
        acc.push({ studentId: r.student!.id, studentName: `${r.student!.firstName} ${r.student!.lastName}`, status: "PRESENT", note: "" });
      }
      return acc;
    }, []);

  const workingRows = bulkRows.length > 0 ? bulkRows : uniqueStudents;

  const markMut = useMutation({
    mutationFn: () => attendanceApi.markBulk({
      classId: markClassId,
      date: markDate,
      records: workingRows.map(r => ({ studentId: r.studentId, status: r.status, note: r.note || undefined })),
    }),
    onSuccess: (res) => {
      setMarkSuccess(`Marked attendance for ${res.data?.data?.recordCount ?? 0} students.`);
      setBulkRows([]);
      invalidate();
    },
    onError: (e: unknown) => setMarkErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to mark"),
  });

  const editMut = useMutation({
    mutationFn: () => attendanceApi.update(editTarget!.id, { status: editStatus, note: editNote || undefined }),
    onSuccess: () => { setEditTarget(null); invalidate(); },
  });

  const openEdit = (r: AttendanceRecord) => {
    setEditTarget(r);
    setEditStatus(r.status);
    setEditNote(r.note ?? "");
  };

  const openMark = () => {
    setMarkOpen(true); setMarkDate(new Date().toISOString().slice(0, 10));
    setMarkClassId(""); setBulkRows([]); setMarkErr(""); setMarkSuccess("");
  };

  const updateBulkRow = (studentId: string, field: keyof BulkRow, value: string) => {
    const base = bulkRows.length > 0 ? bulkRows : uniqueStudents;
    setBulkRows(base.map(r => r.studentId === studentId ? { ...r, [field]: value } : r));
  };

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="View and manage student attendance records"
        action={canMark ? (
          <button onClick={openMark}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Mark Attendance
          </button>
        ) : undefined}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input placeholder="Search student…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 w-48" />
        </div>
        <select value={classFilter} onChange={e => { setClassFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white">
          <option value="">All classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section ?? ""}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }}
            className="px-2 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30" />
          <span className="text-xs text-muted-foreground">to</span>
          <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }}
            className="px-2 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        {(classFilter || statusFilter || fromDate || toDate) && (
          <button onClick={() => { setClassFilter(""); setStatusFilter(""); setFromDate(""); setToDate(""); setPage(1); }}
            className="flex items-center gap-1 px-2 py-2 text-xs text-muted-foreground border border-slate-200 rounded-lg hover:bg-slate-50">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {isLoading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center">
            <ClipboardCheck className="h-7 w-7 text-green-600" />
          </div>
          <p className="font-semibold text-foreground">No attendance records found</p>
          <p className="text-sm text-muted-foreground">Records will appear here once attendance is marked.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-2">{meta?.total ?? filtered.length} records</p>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Date", "Student", "Class", "Type", "Status", "Note", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-muted-foreground text-sm">{formatDate(r.date)}</td>
                    <td className="px-4 py-3 font-medium">
                      {r.student ? `${r.student.firstName} ${r.student.lastName}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.class?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.type}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status]}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[r.status]}`} />
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate">{r.note ?? "—"}</td>
                    <td className="px-4 py-3">
                      {canMark && (
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded text-muted-foreground hover:bg-slate-100">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>Page {meta.page} of {meta.totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Mark Attendance Modal */}
      <Modal open={markOpen} onClose={() => setMarkOpen(false)} title="Mark Attendance" size="xl">
        {markSuccess ? (
          <div className="text-center py-6">
            <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm font-medium text-green-700">{markSuccess}</p>
            <button onClick={() => { setMarkOpen(false); setMarkSuccess(""); }}
              className="mt-4 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">Done</button>
          </div>
        ) : (
          <div className="space-y-4">
            {markErr && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{markErr}</p>}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Date *</label>
                <input type="date" value={markDate} onChange={e => setMarkDate(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Class *</label>
                <select value={markClassId} onChange={e => { setMarkClassId(e.target.value); setBulkRows([]); }}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                  <option value="">— Select class —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section ?? ""}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <select value={markType} onChange={e => setMarkType(e.target.value as "CLASS" | "DAILY")}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                  <option value="CLASS">Class</option>
                  <option value="DAILY">Daily</option>
                </select>
              </div>
            </div>

            {workingRows.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground font-medium">Mark all:</span>
                {STATUSES.map(s => (
                  <button key={s} type="button"
                    onClick={() => setBulkRows(workingRows.map(r => ({ ...r, status: s })))}
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium hover:opacity-80 ${STATUS_COLORS[s]}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {!markClassId ? (
              <div className="text-center py-6 text-sm text-muted-foreground">Select a class to load students.</div>
            ) : workingRows.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">Loading students…</div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Student</th>
                      {STATUSES.map(s => (
                        <th key={s} className="px-2 py-2 text-xs font-medium text-muted-foreground text-center">{s[0]}</th>
                      ))}
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workingRows.map(row => (
                      <tr key={row.studentId}>
                        <td className="px-3 py-2 font-medium">{row.studentName}</td>
                        {STATUSES.map(s => (
                          <td key={s} className="px-2 py-2 text-center">
                            <button type="button"
                              onClick={() => updateBulkRow(row.studentId, "status", s)}
                              className={`h-6 w-6 rounded-full border-2 mx-auto flex items-center justify-center transition-all ${
                                row.status === s
                                  ? "border-primary bg-primary"
                                  : "border-slate-300 hover:border-slate-400"
                              }`}>
                              {row.status === s && <Check className="h-3 w-3 text-white" />}
                            </button>
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          <input value={row.note}
                            onChange={e => updateBulkRow(row.studentId, "note", e.target.value)}
                            placeholder="Note (optional)"
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:ring-2 focus:ring-primary/30" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setMarkOpen(false)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50">Cancel</button>
              <button
                onClick={() => {
                  if (!markClassId || !markDate) return setMarkErr("Date and class are required");
                  if (workingRows.length === 0) return setMarkErr("No students to mark");
                  markMut.mutate();
                }}
                disabled={markMut.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
                {markMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Submit Attendance ({workingRows.length} students)
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit record modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Attendance Record">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Student: <span className="font-medium text-foreground">{editTarget?.student?.firstName} {editTarget?.student?.lastName}</span>
            {" · "}{editTarget ? formatDate(editTarget.date) : ""}
          </p>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {STATUSES.map(s => (
                <button key={s} type="button" onClick={() => setEditStatus(s)}
                  className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-all ${
                    editStatus === s ? `${STATUS_COLORS[s]} border-current` : "border-slate-200 text-muted-foreground hover:border-slate-300"
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
            <input value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="Add a note…"
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setEditTarget(null)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50">Cancel</button>
            <button onClick={() => editMut.mutate()} disabled={editMut.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {editMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
