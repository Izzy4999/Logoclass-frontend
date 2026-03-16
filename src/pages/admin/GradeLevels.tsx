import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit2, Trash2, Loader2, GraduationCap } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Modal from "@/components/shared/Modal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { gradeLevelsApi } from "@/api/classes";
import type { GradeLevel } from "@/types/class";

const gradeLevelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  order: z.number().int().min(0, "Order must be 0 or higher"),
  description: z.string().optional(),
});
type GradeLevelForm = z.infer<typeof gradeLevelSchema>;

export default function GradeLevels() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<GradeLevel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GradeLevel | null>(null);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<GradeLevelForm>({
    resolver: zodResolver(gradeLevelSchema),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["grade-levels"],
    queryFn: () => gradeLevelsApi.list({ limit: 100 }),
  });

  const gradeLevels: GradeLevel[] = data?.data?.data ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ["grade-levels"] });

  const createMut = useMutation({
    mutationFn: (data: GradeLevelForm) => gradeLevelsApi.create({
      name: data.name, order: data.order,
      description: data.description || undefined,
    }),
    onSuccess: () => { setCreateOpen(false); reset(); setServerError(""); invalidate(); },
    onError: (e: unknown) => setServerError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create"),
  });

  const editMut = useMutation({
    mutationFn: (data: GradeLevelForm) => gradeLevelsApi.update(editTarget!.id, {
      name: data.name, order: data.order,
      description: data.description || undefined,
    }),
    onSuccess: () => { setEditTarget(null); reset(); setServerError(""); invalidate(); },
    onError: (e: unknown) => setServerError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update"),
  });

  const deleteMut = useMutation({
    mutationFn: () => gradeLevelsApi.delete(deleteTarget!.id),
    onSuccess: () => { setDeleteTarget(null); invalidate(); },
  });

  const openEdit = (g: GradeLevel) => {
    setEditTarget(g);
    reset({ name: g.name, order: g.order ?? 0, description: g.description ?? "" });
    setServerError("");
  };

  const GradeForm = ({ isEdit }: { isEdit?: boolean }) => (
    <form onSubmit={handleSubmit((data: GradeLevelForm) => isEdit ? editMut.mutate(data) : createMut.mutate(data))} className="space-y-3">
      {serverError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Name *</label>
          <input {...register("name")}
            placeholder="e.g. JSS 1"
            className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.name ? "border-destructive" : "border-slate-200"}`} />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Order *</label>
          <input type="number" {...register("order", { valueAsNumber: true })}
            placeholder="e.g. 1"
            className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.order ? "border-destructive" : "border-slate-200"}`} />
          {errors.order && <p className="text-xs text-destructive mt-1">{errors.order.message}</p>}
        </div>
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
        title="Grade Levels"
        description="Manage academic grade levels"
        action={
          <button onClick={() => { setCreateOpen(true); reset({ name: "", order: 0, description: "" }); setServerError(""); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Grade Level
          </button>
        }
      />

      {isLoading ? <LoadingSpinner /> : gradeLevels.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center">
            <GraduationCap className="h-7 w-7 text-primary" />
          </div>
          <p className="font-semibold text-foreground">No grade levels yet</p>
          <p className="text-sm text-muted-foreground">Add grade levels to organise your school's structure.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Order", "Name", "Description", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...gradeLevels].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(g => (
                <tr key={g.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 w-16">
                    <span className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">{g.order}</span>
                  </td>
                  <td className="px-4 py-3 font-medium">{g.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{g.description ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(g)} className="p-1.5 rounded text-muted-foreground hover:bg-slate-100">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(g)} className="p-1.5 rounded text-red-500 hover:bg-red-50">
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

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Grade Level">
        <GradeForm />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Grade Level">
        <GradeForm isEdit />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate()}
        loading={deleteMut.isPending}
        title="Delete Grade Level"
        message={`Delete "${deleteTarget?.name}"? All associated classes may be affected.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
