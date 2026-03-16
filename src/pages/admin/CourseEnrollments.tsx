import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2, Loader2, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Modal from "@/components/shared/Modal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { courseEnrollmentsApi, subjectsApi, academicYearsApi } from "@/api/classes";
import { usersApi } from "@/api/users";
import type { CourseEnrollment } from "@/types/class";

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  PASSED:      "bg-green-100 text-green-700",
  FAILED:      "bg-red-100 text-red-700",
  CARRYOVER:   "bg-yellow-100 text-yellow-700",
};
const STATUSES = ["IN_PROGRESS", "PASSED", "FAILED", "CARRYOVER"];
const GRADES   = ["A", "B", "C", "D", "E", "F"];

const INIT_CREATE = { studentId: "", subjectId: "", academicYearId: "", termId: "" };
const INIT_EDIT   = { score: "", grade: "", status: "IN_PROGRESS", isCarryover: false };

// ── Error helper ──────────────────────────────────────────────────────────────
function apiErr(e: unknown) {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Something went wrong";
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CourseEnrollments() {
  const qc = useQueryClient();

  // filters
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  // modals
  const [createOpen, setCreateOpen]   = useState(false);
  const [editTarget,  setEditTarget]  = useState<CourseEnrollment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CourseEnrollment | null>(null);

  // forms
  const [createForm, setCreateForm]   = useState(INIT_CREATE);
  const [editForm,   setEditForm]     = useState(INIT_EDIT);
  const [formErr,    setFormErr]      = useState("");

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["course-enrollments", page, statusFilter],
    queryFn: () => courseEnrollmentsApi.list({ page, limit: 20, status: statusFilter || undefined }),
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-students"],
    queryFn: () => usersApi.list({ limit: 200 }),
    enabled: createOpen,
  });

  const { data: subjectsData } = useQuery({
    queryKey: ["subjects-all"],
    queryFn: () => subjectsApi.list({ limit: 200 }),
    enabled: createOpen,
  });

  const { data: yearsData } = useQuery({
    queryKey: ["academic-years-all"],
    queryFn: () => academicYearsApi.list({ limit: 50 }),
    enabled: createOpen,
  });

  const { data: termsData } = useQuery({
    queryKey: ["terms-for-year", createForm.academicYearId],
    queryFn: () => academicYearsApi.listTerms(createForm.academicYearId),
    enabled: !!createForm.academicYearId,
  });

  const enrollments: CourseEnrollment[] = data?.data?.data ?? [];
  const meta = data?.data?.meta;
  const users    = usersData?.data?.data ?? [];
  const subjects = subjectsData?.data?.data ?? [];
  const years    = yearsData?.data?.data ?? [];
  const terms    = (termsData?.data as any)?.data ?? termsData?.data ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["course-enrollments"] });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: () => courseEnrollmentsApi.create({
      studentId:      createForm.studentId,
      subjectId:      createForm.subjectId,
      academicYearId: createForm.academicYearId,
      termId:         createForm.termId || undefined,
    }),
    onSuccess: () => { setCreateOpen(false); setCreateForm(INIT_CREATE); setFormErr(""); invalidate(); },
    onError: (e) => setFormErr(apiErr(e)),
  });

  const editMut = useMutation({
    mutationFn: () => courseEnrollmentsApi.update(editTarget!.id, {
      score:       editForm.score ? parseFloat(editForm.score) : undefined,
      grade:       editForm.grade || undefined,
      status:      editForm.status,
      isCarryover: editForm.isCarryover,
    }),
    onSuccess: () => { setEditTarget(null); setFormErr(""); invalidate(); },
    onError: (e) => setFormErr(apiErr(e)),
  });

  const deleteMut = useMutation({
    mutationFn: () => courseEnrollmentsApi.delete(deleteTarget!.id),
    onSuccess: () => { setDeleteTarget(null); invalidate(); },
  });

  // ── Open edit ─────────────────────────────────────────────────────────────────
  const openEdit = (e: CourseEnrollment) => {
    setEditTarget(e);
    setEditForm({
      score:       e.score !== null ? String(e.score) : "",
      grade:       e.grade ?? "",
      status:      e.status,
      isCarryover: e.isCarryover,
    });
    setFormErr("");
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="Course Enrollments"
        description="Manage student subject enrollments and academic progress"
        action={
          <button
            onClick={() => { setCreateOpen(true); setCreateForm(INIT_CREATE); setFormErr(""); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Enroll in Subject
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white"
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </div>

      {/* Table */}
      {isLoading ? <LoadingSpinner /> : enrollments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center">
            <BookOpen className="h-7 w-7 text-primary" />
          </div>
          <p className="font-semibold text-foreground">No course enrollments yet</p>
          <p className="text-sm text-muted-foreground">Enroll students in subjects to track their academic progress.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-2">{meta?.total ?? enrollments.length} enrollment{(meta?.total ?? enrollments.length) !== 1 ? "s" : ""}</p>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Student", "Subject", "Academic Year", "Term", "Score", "Grade", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrollments.map((e, i) => (
                  <motion.tr
                    key={e.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium">{e.student.firstName} {e.student.lastName}</td>
                    <td className="px-4 py-3">{e.subject.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.academicYear.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.term?.name ?? "—"}</td>
                    <td className="px-4 py-3 font-medium">{e.score !== null ? e.score : "—"}</td>
                    <td className="px-4 py-3 font-bold text-foreground">{e.grade ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[e.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {e.status.replace("_", " ")}
                      </span>
                      {e.isCarryover && (
                        <span className="ml-1 text-[10px] text-orange-600 font-semibold">CARRYOVER</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(e)}
                          className="p-1.5 rounded text-muted-foreground hover:bg-slate-100"
                          title="Edit score/grade/status"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(e)}
                          className="p-1.5 rounded text-red-500 hover:bg-red-50"
                          title="Remove enrollment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
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

      {/* ── Create Modal ─────────────────────────────────────────────────────── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Enroll Student in Subject" size="lg">
        <div className="space-y-3">
          {formErr && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formErr}</p>}

          <div>
            <label className="text-xs font-medium text-muted-foreground">Student *</label>
            <select
              value={createForm.studentId}
              onChange={e => setCreateForm(f => ({ ...f, studentId: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            >
              <option value="">— Select student —</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Subject *</label>
            <select
              value={createForm.subjectId}
              onChange={e => setCreateForm(f => ({ ...f, subjectId: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            >
              <option value="">— Select subject —</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Academic Year *</label>
              <select
                value={createForm.academicYearId}
                onChange={e => setCreateForm(f => ({ ...f, academicYearId: e.target.value, termId: "" }))}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              >
                <option value="">— Select year —</option>
                {years.map(y => (
                  <option key={y.id} value={y.id}>{y.name}{y.isCurrent ? " (Current)" : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Term (optional)</label>
              <select
                value={createForm.termId}
                onChange={e => setCreateForm(f => ({ ...f, termId: e.target.value }))}
                disabled={!createForm.academicYearId}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white disabled:opacity-50"
              >
                <option value="">— Select term —</option>
                {(Array.isArray(terms) ? terms : []).map((t: { id: string; name: string; isCurrent: boolean }) => (
                  <option key={t.id} value={t.id}>{t.name}{t.isCurrent ? " (Current)" : ""}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setCreateOpen(false)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50">
              Cancel
            </button>
            <button
              onClick={() => {
                if (!createForm.studentId || !createForm.subjectId || !createForm.academicYearId)
                  return setFormErr("Student, subject, and academic year are required");
                createMut.mutate();
              }}
              disabled={createMut.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {createMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Enroll Student
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Edit Modal ───────────────────────────────────────────────────────── */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Update Enrollment" size="lg">
        {editTarget && (
          <div className="space-y-3">
            {formErr && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formErr}</p>}

            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <p className="font-medium">{editTarget.student.firstName} {editTarget.student.lastName}</p>
              <p className="text-muted-foreground text-xs">{editTarget.subject.name} — {editTarget.academicYear.name}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Score (0–100)</label>
                <input
                  type="number" min="0" max="100"
                  value={editForm.score}
                  onChange={e => setEditForm(f => ({ ...f, score: e.target.value }))}
                  placeholder="e.g. 75"
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Grade</label>
                <select
                  value={editForm.grade}
                  onChange={e => setEditForm(f => ({ ...f, grade: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                >
                  <option value="">— Grade —</option>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.isCarryover}
                onChange={e => setEditForm(f => ({ ...f, isCarryover: e.target.checked }))}
                className="rounded border-slate-300 text-primary"
              />
              <span className="text-sm text-muted-foreground">Mark as carryover</span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditTarget(null)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={() => editMut.mutate()}
                disabled={editMut.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {editMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save Changes
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Confirm ───────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate()}
        loading={deleteMut.isPending}
        title="Remove Enrollment"
        message={`Remove ${deleteTarget?.student.firstName} ${deleteTarget?.student.lastName} from ${deleteTarget?.subject.name}? This cannot be undone.`}
        confirmLabel="Remove"
      />
    </div>
  );
}
