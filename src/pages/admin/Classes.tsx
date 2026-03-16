import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit2, Trash2, Loader2, School } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Modal from "@/components/shared/Modal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import InfiniteSelect from "@/components/shared/InfiniteSelect";
import { classesApi, gradeLevelsApi } from "@/api/classes";
import { usersApi } from "@/api/users";
import type { ClassSection } from "@/types/class";
import type { User } from "@/types/user";

const classSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  section: z.string().optional(),
  gradeLevelId: z.string().min(1, "Grade level is required"),
  teacherId: z.string().optional(),
});
type ClassFormData = z.infer<typeof classSchema>;

export default function Classes() {
  const qc = useQueryClient();
  const [gradeFilter, setGradeFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ClassSection | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassSection | null>(null);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
  });

  const teacherId = watch("teacherId");

  const { data, isLoading } = useQuery({
    queryKey: ["classes", gradeFilter],
    queryFn: () => classesApi.list({ limit: 100, gradeLevelId: gradeFilter || undefined }),
  });

  const { data: gradesData } = useQuery({
    queryKey: ["grade-levels-all"],
    queryFn: () => gradeLevelsApi.list({ limit: 100 }),
  });

  const teacherFetcher = ({ page, search }: { page: number; search: string }) =>
    usersApi.list({ page, limit: 100, search: search || undefined })
      .then(r => ({ data: r.data.data, meta: r.data.meta }));

  const classes: ClassSection[] = data?.data?.data ?? [];
  const grades = gradesData?.data?.data ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["classes"] });

  const createMut = useMutation({
    mutationFn: (data: ClassFormData) => classesApi.create({
      name: data.name, section: data.section || undefined,
      gradeLevelId: data.gradeLevelId, teacherId: data.teacherId || undefined,
    }),
    onSuccess: () => { setCreateOpen(false); reset(); setServerError(""); invalidate(); },
    onError: (e: unknown) => setServerError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create"),
  });

  const editMut = useMutation({
    mutationFn: (data: ClassFormData) => classesApi.update(editTarget!.id, {
      name: data.name, section: data.section || undefined,
      gradeLevelId: data.gradeLevelId, teacherId: data.teacherId || undefined,
    }),
    onSuccess: () => { setEditTarget(null); reset(); setServerError(""); invalidate(); },
    onError: (e: unknown) => setServerError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update"),
  });

  const deleteMut = useMutation({
    mutationFn: () => classesApi.delete(deleteTarget!.id),
    onSuccess: () => { setDeleteTarget(null); invalidate(); },
  });

  const openEdit = (c: ClassSection) => {
    setEditTarget(c);
    reset({ name: c.name, section: c.section ?? "", gradeLevelId: c.gradeLevel?.id ?? "", teacherId: c.teacher?.id ?? "" });
    setServerError("");
  };

  const renderForm = (isEdit: boolean) => (
    <form onSubmit={handleSubmit((data) => isEdit ? editMut.mutate(data) : createMut.mutate(data))} className="space-y-3">
      {serverError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Class Name *</label>
          <input {...register("name")}
            placeholder="e.g. JSS 1"
            className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.name ? "border-destructive" : "border-slate-200"}`} />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Section</label>
          <input {...register("section")}
            placeholder="e.g. A"
            className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Grade Level *</label>
        <select {...register("gradeLevelId")}
          className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white ${errors.gradeLevelId ? "border-destructive" : "border-slate-200"}`}>
          <option value="">— Select grade level —</option>
          {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        {errors.gradeLevelId && <p className="text-xs text-destructive mt-1">{errors.gradeLevelId.message}</p>}
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Class Teacher (optional)</label>
        <InfiniteSelect<User>
          value={teacherId ?? ""}
          onChange={(id) => setValue("teacherId", id || undefined)}
          placeholder="Search and select teacher…"
          queryKey={["users", "teacher-select"]}
          fetcher={teacherFetcher}
          getLabel={(u) => `${u.firstName} ${u.lastName}`}
          getValue={(u) => u.id}
          getSublabel={(u) => u.email}
          enabled={createOpen || !!editTarget}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={() => isEdit ? setEditTarget(null) : setCreateOpen(false)}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50">Cancel</button>
        <button
          type="submit"
          disabled={createMut.isPending || editMut.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
          {(createMut.isPending || editMut.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isEdit ? "Save changes" : "Create Class"}
        </button>
      </div>
    </form>
  );

  return (
    <div>
      <PageHeader
        title="Classes"
        description="Manage class sections across all grade levels"
        action={
          <button onClick={() => { setCreateOpen(true); reset({ name: "", section: "", gradeLevelId: "", teacherId: "" }); setServerError(""); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Class
          </button>
        }
      />

      {/* Filter */}
      <div className="mb-5">
        <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white">
          <option value="">All grade levels</option>
          {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {isLoading ? <LoadingSpinner /> : classes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center">
            <School className="h-7 w-7 text-primary" />
          </div>
          <p className="font-semibold text-foreground">No classes found</p>
          <p className="text-sm text-muted-foreground">Create class sections to organize students.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Class", "Section", "Grade Level", "Class Teacher", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classes.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.section ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.gradeLevel?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    {c.teacher
                      ? <span className="font-medium">{c.teacher.firstName} {c.teacher.lastName}</span>
                      : <span className="text-muted-foreground text-xs">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded text-muted-foreground hover:bg-slate-100">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded text-red-500 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Class">
        {renderForm(false)}
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Class">
        {renderForm(true)}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate()}
        loading={deleteMut.isPending}
        title="Delete Class"
        message={`Delete class "${deleteTarget?.name} ${deleteTarget?.section ?? ""}"? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
