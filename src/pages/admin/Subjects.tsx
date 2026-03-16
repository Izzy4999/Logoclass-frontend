import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit2, Trash2, Loader2, BookOpen } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Modal from "@/components/shared/Modal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { subjectsApi, gradeLevelsApi } from "@/api/classes";
import type { Subject } from "@/types/class";

const subjectSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
  code: z.string().optional(),
  description: z.string().optional(),
  gradeLevelId: z.string().optional(),
});
type SubjectFormData = z.infer<typeof subjectSchema>;

export default function Subjects() {
  const qc = useQueryClient();
  const [gradeFilter, setGradeFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["subjects", gradeFilter],
    queryFn: () => subjectsApi.list({ limit: 100, gradeLevelId: gradeFilter || undefined }),
  });

  const { data: gradesData } = useQuery({
    queryKey: ["grade-levels-all"],
    queryFn: () => gradeLevelsApi.list({ limit: 100 }),
  });

  const subjects: Subject[] = data?.data?.data ?? [];
  const grades = gradesData?.data?.data ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ["subjects"] });

  const createMut = useMutation({
    mutationFn: (data: SubjectFormData) => subjectsApi.create({
      name: data.name, code: data.code || undefined,
      description: data.description || undefined,
      gradeLevelId: data.gradeLevelId || undefined,
    }),
    onSuccess: () => { setCreateOpen(false); reset(); setServerError(""); invalidate(); },
    onError: (e: unknown) => setServerError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create"),
  });

  const editMut = useMutation({
    mutationFn: (data: SubjectFormData) => subjectsApi.update(editTarget!.id, {
      name: data.name, code: data.code || undefined,
      description: data.description || undefined,
    }),
    onSuccess: () => { setEditTarget(null); reset(); setServerError(""); invalidate(); },
    onError: (e: unknown) => setServerError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update"),
  });

  const deleteMut = useMutation({
    mutationFn: () => subjectsApi.delete(deleteTarget!.id),
    onSuccess: () => { setDeleteTarget(null); invalidate(); },
  });

  const openEdit = (s: Subject) => {
    setEditTarget(s);
    reset({ name: s.name, code: s.code ?? "", description: s.description ?? "", gradeLevelId: s.gradeLevel?.id ?? "" });
    setServerError("");
  };

  const SubjectForm = ({ isEdit }: { isEdit?: boolean }) => (
    <form onSubmit={handleSubmit((data) => isEdit ? editMut.mutate(data) : createMut.mutate(data))} className="space-y-3">
      {serverError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Name *</label>
          <input {...register("name")}
            placeholder="e.g. Mathematics"
            className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.name ? "border-destructive" : "border-slate-200"}`} />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Code (optional)</label>
          <input {...register("code")}
            placeholder="e.g. MTH101"
            className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Grade Level (optional)</label>
        <select {...register("gradeLevelId")}
          className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white">
          <option value="">— All grades —</option>
          {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
        <textarea {...register("description")} rows={2}
          className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={() => isEdit ? setEditTarget(null) : setCreateOpen(false)}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50">Cancel</button>
        <button
          type="submit"
          disabled={createMut.isPending || editMut.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
          {(createMut.isPending || editMut.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isEdit ? "Save changes" : "Create"}
        </button>
      </div>
    </form>
  );

  return (
    <div>
      <PageHeader
        title="Subjects"
        description="Manage all subjects offered in the school"
        action={
          <button onClick={() => { setCreateOpen(true); reset({ name: "", code: "", description: "", gradeLevelId: "" }); setServerError(""); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Subject
          </button>
        }
      />

      <div className="mb-5">
        <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white">
          <option value="">All grade levels</option>
          {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {isLoading ? <LoadingSpinner /> : subjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center">
            <BookOpen className="h-7 w-7 text-primary" />
          </div>
          <p className="font-semibold text-foreground">No subjects found</p>
          <p className="text-sm text-muted-foreground">Add subjects to assign to classes and teachers.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Name", "Code", "Grade Level", "Description", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjects.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">
                    {s.code ? (
                      <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{s.code}</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.gradeLevel?.name ?? "All grades"}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{s.description ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded text-muted-foreground hover:bg-slate-100">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded text-red-500 hover:bg-red-50">
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

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Subject">
        <SubjectForm />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Subject">
        <SubjectForm isEdit />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate()}
        loading={deleteMut.isPending}
        title="Delete Subject"
        message={`Delete subject "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
