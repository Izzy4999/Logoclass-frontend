import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Plus, Edit2, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Modal from "@/components/shared/Modal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { enrollmentsApi, gradeLevelsApi, classesApi, academicYearsApi } from "@/api/classes";
import { usersApi } from "@/api/users";
import { formatDate } from "@/lib/utils";
import type { StudentEnrollment } from "@/types/class";

const STATUS_COLORS: Record<string, string> = {
  ENROLLED:    "bg-blue-100 text-blue-700",
  PROMOTED:    "bg-green-100 text-green-700",
  REPEATED:    "bg-orange-100 text-orange-700",
  GRADUATED:   "bg-purple-100 text-purple-700",
  TRANSFERRED: "bg-yellow-100 text-yellow-700",
  WITHDRAWN:   "bg-red-100 text-red-700",
};

const createSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  gradeLevelId: z.string().min(1, "Grade level is required"),
  classSectionId: z.string().optional(),
  academicYearId: z.string().min(1, "Academic year is required"),
});
type CreateEnrollmentForm = z.infer<typeof createSchema>;

const editSchema = z.object({
  status: z.string().optional(),
  classSectionId: z.string().optional(),
  note: z.string().optional(),
});
type EditEnrollmentForm = z.infer<typeof editSchema>;

export default function Enrollments() {
  const qc = useQueryClient();
  const [search, setSearch]     = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [yearFilter, setYearFilter]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage]         = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StudentEnrollment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentEnrollment | null>(null);
  const [serverError, setServerError] = useState("");

  const { register: registerCreate, handleSubmit: handleCreateSubmit, reset: resetCreate, formState: { errors: createErrors } } = useForm<CreateEnrollmentForm>({
    resolver: zodResolver(createSchema),
  });

  const { register: registerEdit, handleSubmit: handleEditSubmit, reset: resetEdit } = useForm<EditEnrollmentForm>({
    resolver: zodResolver(editSchema),
  });

  const { data: enrollData, isLoading } = useQuery({
    queryKey: ["enrollments", page, gradeFilter, classFilter, yearFilter, statusFilter],
    queryFn: () => enrollmentsApi.list({
      page, limit: 20,
      gradeLevelId: gradeFilter || undefined,
      classId: classFilter || undefined,
      academicYearId: yearFilter || undefined,
      status: statusFilter || undefined,
    }),
  });

  const { data: gradesData }  = useQuery({ queryKey: ["grade-levels-all"], queryFn: () => gradeLevelsApi.list({ limit: 100 }) });
  const { data: classesData } = useQuery({ queryKey: ["classes-all"], queryFn: () => classesApi.list({ limit: 100, gradeLevelId: gradeFilter || undefined }) });
  const { data: yearsData }   = useQuery({ queryKey: ["academic-years-all"], queryFn: () => academicYearsApi.list({ limit: 100 }) });
  const { data: studentsData } = useQuery({ queryKey: ["students-list"], queryFn: () => usersApi.list({ limit: 200 }) });

  const enrollments = enrollData?.data?.data ?? [];
  const meta        = enrollData?.data?.meta;
  const grades      = gradesData?.data?.data ?? [];
  const classes     = classesData?.data?.data ?? [];
  const years       = yearsData?.data?.data ?? [];
  const students    = studentsData?.data?.data ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["enrollments"] });

  const createMut = useMutation({
    mutationFn: (data: CreateEnrollmentForm) => enrollmentsApi.create({
      studentId: data.studentId,
      gradeLevelId: data.gradeLevelId,
      classSectionId: data.classSectionId || undefined,
      academicYearId: data.academicYearId,
    }),
    onSuccess: () => { setCreateOpen(false); resetCreate(); setServerError(""); invalidate(); },
    onError: (e: unknown) => setServerError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to enroll"),
  });

  const editMut = useMutation({
    mutationFn: (data: EditEnrollmentForm) => enrollmentsApi.update(editTarget!.id, {
      status: data.status || undefined,
      classSectionId: data.classSectionId || undefined,
      note: data.note || undefined,
    }),
    onSuccess: () => { setEditTarget(null); invalidate(); },
  });

  const deleteMut = useMutation({
    mutationFn: () => enrollmentsApi.delete(deleteTarget!.id),
    onSuccess: () => { setDeleteTarget(null); invalidate(); },
  });

  return (
    <div>
      <PageHeader
        title="Enrollments"
        description="Manage student class enrollments"
        action={
          <button onClick={() => { setCreateOpen(true); resetCreate(); setServerError(""); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Enroll Student
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input placeholder="Search student…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-44" />
        </div>
        {[
          { val: gradeFilter, set: setGradeFilter, opts: grades.map(g => ({ v: g.id, l: g.name })), ph: "All grades" },
          { val: classFilter, set: setClassFilter, opts: classes.map(c => ({ v: c.id, l: `${c.name} ${c.section ?? ""}` })), ph: "All classes" },
          { val: yearFilter,  set: setYearFilter,  opts: years.map(y => ({ v: y.id, l: y.name })), ph: "All years" },
          { val: statusFilter, set: setStatusFilter, opts: ["ENROLLED","PROMOTED","REPEATED","GRADUATED","TRANSFERRED","WITHDRAWN"].map(s => ({ v: s, l: s })), ph: "All status" },
        ].map(({ val, set, opts, ph }) => (
          <select key={ph} value={val} onChange={e => { set(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white">
            <option value="">{ph}</option>
            {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        ))}
      </div>

      {isLoading ? <LoadingSpinner /> : enrollments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <p className="text-sm text-muted-foreground">No enrollments found.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-2">{meta?.total ?? 0} enrollments</p>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Student","Grade Level","Class","Academic Year","Status","Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrollments.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{e.student.firstName} {e.student.lastName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.gradeLevel.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.classSection ? `${e.classSection.name} ${e.classSection.section ?? ""}` : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.academicYear.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[e.status] ?? "bg-slate-100 text-slate-600"}`}>{e.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditTarget(e); resetEdit({ status: e.status, classSectionId: e.classSection?.id ?? "", note: e.note ?? "" }); }}
                          className="p-1.5 rounded text-muted-foreground hover:bg-slate-100"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDeleteTarget(e)} className="p-1.5 rounded text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
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
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
                <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Enrollment Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Enroll Student">
        <form onSubmit={handleCreateSubmit((data) => createMut.mutate(data))} className="space-y-3">
          {serverError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Student *</label>
            <select {...registerCreate("studentId")}
              className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white ${createErrors.studentId ? "border-destructive" : "border-slate-200"}`}>
              <option value="">— Select student —</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
            </select>
            {createErrors.studentId && <p className="text-xs text-destructive mt-1">{createErrors.studentId.message}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Academic year *</label>
            <select {...registerCreate("academicYearId")}
              className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white ${createErrors.academicYearId ? "border-destructive" : "border-slate-200"}`}>
              <option value="">— Select year —</option>
              {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
            {createErrors.academicYearId && <p className="text-xs text-destructive mt-1">{createErrors.academicYearId.message}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Grade level *</label>
            <select {...registerCreate("gradeLevelId")}
              className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white ${createErrors.gradeLevelId ? "border-destructive" : "border-slate-200"}`}>
              <option value="">— Select grade —</option>
              {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            {createErrors.gradeLevelId && <p className="text-xs text-destructive mt-1">{createErrors.gradeLevelId.message}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Class section (optional)</label>
            <select {...registerCreate("classSectionId")}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white">
              <option value="">— Not assigned —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section ?? ""}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={createMut.isPending} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {createMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Enroll
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Enrollment Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Enrollment">
        <form onSubmit={handleEditSubmit((data) => editMut.mutate(data))} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select {...registerEdit("status")}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white">
              {["ENROLLED","PROMOTED","REPEATED","GRADUATED","TRANSFERRED","WITHDRAWN"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Class section</label>
            <select {...registerEdit("classSectionId")}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white">
              <option value="">— Not assigned —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section ?? ""}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Note</label>
            <textarea {...registerEdit("note")} rows={3}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditTarget(null)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={editMut.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {editMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate()}
        loading={deleteMut.isPending}
        title="Remove Enrollment"
        message={`Remove enrollment for ${deleteTarget?.student.firstName} ${deleteTarget?.student.lastName}?`}
        confirmLabel="Remove"
      />
    </div>
  );
}
