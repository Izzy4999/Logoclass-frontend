import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit2, Trash2, Shield, Loader2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Modal from "@/components/shared/Modal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { rolesApi } from "@/api/roles";
import type { Role, Permission } from "@/types/role";

const ALL_PERMISSIONS = [
  "MANAGE_USERS", "MANAGE_ROLES", "MANAGE_CLASSES", "MANAGE_LESSONS",
  "MANAGE_LIVE_CLASSES", "MANAGE_ASSIGNMENTS", "MANAGE_QUIZZES",
  "MANAGE_EXAMS", "MARK_ATTENDANCE", "MANAGE_PAYMENTS", "CREATE_ANNOUNCEMENT",
  "VIEW_ACTION_LOGS", "MANAGE_TENANT_SETTINGS", "MANAGE_ENROLLMENTS",
];

const PERM_COLORS: Record<string, string> = {
  MANAGE_USERS: "bg-blue-50 text-blue-700",
  MANAGE_ROLES: "bg-purple-50 text-purple-700",
  MANAGE_CLASSES: "bg-green-50 text-green-700",
  MANAGE_LESSONS: "bg-teal-50 text-teal-700",
  MANAGE_LIVE_CLASSES: "bg-cyan-50 text-cyan-700",
  MANAGE_ASSIGNMENTS: "bg-orange-50 text-orange-700",
  MANAGE_QUIZZES: "bg-yellow-50 text-yellow-700",
  MANAGE_EXAMS: "bg-red-50 text-red-700",
  MARK_ATTENDANCE: "bg-emerald-50 text-emerald-700",
  MANAGE_PAYMENTS: "bg-indigo-50 text-indigo-700",
  CREATE_ANNOUNCEMENT: "bg-pink-50 text-pink-700",
  VIEW_ACTION_LOGS: "bg-slate-100 text-slate-700",
  MANAGE_TENANT_SETTINGS: "bg-violet-50 text-violet-700",
  MANAGE_ENROLLMENTS: "bg-lime-50 text-lime-700",
};

const roleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  permissions: z.array(z.string()),
  isDefault: z.boolean(),
});
type RoleFormData = z.infer<typeof roleSchema>;

export default function Roles() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, reset, watch, setValue, getValues, formState: { errors } } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: "", permissions: [], isDefault: false },
  });

  const permissions = watch("permissions");

  const { data, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesApi.list({ limit: 100 }),
  });

  const roles: Role[] = data?.data?.data ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ["roles"] });

  const createMut = useMutation({
    mutationFn: (data: RoleFormData) => rolesApi.create({ name: data.name, permissions: data.permissions as Permission[], isDefault: data.isDefault }),
    onSuccess: () => { setCreateOpen(false); reset(); setServerError(""); invalidate(); },
    onError: (e: unknown) => setServerError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create"),
  });

  const editMut = useMutation({
    mutationFn: (data: RoleFormData) => rolesApi.update(editTarget!.id, { name: data.name, permissions: data.permissions as Permission[], isDefault: data.isDefault }),
    onSuccess: () => { setEditTarget(null); reset(); setServerError(""); invalidate(); },
    onError: (e: unknown) => setServerError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update"),
  });

  const deleteMut = useMutation({
    mutationFn: () => rolesApi.delete(deleteTarget!.id),
    onSuccess: () => { setDeleteTarget(null); invalidate(); },
  });

  const openEdit = (r: Role) => {
    setEditTarget(r);
    reset({ name: r.name, permissions: r.permissions ?? [], isDefault: r.isDefault ?? false });
    setServerError("");
  };

  const togglePerm = (p: string) => {
    const current = getValues("permissions");
    setValue("permissions", current.includes(p) ? current.filter(x => x !== p) : [...current, p]);
  };

  const RoleForm = ({ isEdit }: { isEdit?: boolean }) => (
    <form onSubmit={handleSubmit((data: RoleFormData) => isEdit ? editMut.mutate(data) : createMut.mutate(data))} className="space-y-3">
      {serverError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Role Name *</label>
        <input {...register("name")}
          placeholder="e.g. Class Teacher"
          className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.name ? "border-destructive" : "border-slate-200"}`} />
        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-muted-foreground">Permissions</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setValue("permissions", [...ALL_PERMISSIONS])}
              className="text-xs text-primary hover:underline">Select all</button>
            <span className="text-muted-foreground text-xs">·</span>
            <button type="button" onClick={() => setValue("permissions", [])}
              className="text-xs text-muted-foreground hover:underline">Clear</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_PERMISSIONS.map(p => (
            <button key={p} type="button" onClick={() => togglePerm(p)}
              className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-all ${
                permissions.includes(p)
                  ? "border-primary bg-primary text-white"
                  : "border-slate-200 text-muted-foreground hover:border-slate-300"
              }`}>
              {p.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" {...register("isDefault")}
          className="rounded border-slate-300 text-primary" />
        <span className="text-sm text-muted-foreground">Set as default role for new users</span>
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={() => isEdit ? setEditTarget(null) : setCreateOpen(false)}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50">Cancel</button>
        <button
          type="submit"
          disabled={createMut.isPending || editMut.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
          {(createMut.isPending || editMut.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isEdit ? "Save changes" : "Create Role"}
        </button>
      </div>
    </form>
  );

  return (
    <div>
      <PageHeader
        title="Roles"
        description="Manage user roles and permissions"
        action={
          <button onClick={() => { setCreateOpen(true); reset({ name: "", permissions: [], isDefault: false }); setServerError(""); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Role
          </button>
        }
      />

      {isLoading ? <LoadingSpinner /> : roles.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <p className="font-semibold text-foreground">No roles yet</p>
          <p className="text-sm text-muted-foreground">Create roles to assign to users.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-foreground">{r.name}</h3>
                    {r.isDefault && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">Default</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(r.permissions ?? []).length === 0 ? (
                      <span className="text-xs text-muted-foreground">No permissions assigned</span>
                    ) : (r.permissions ?? []).slice(0, 8).map(p => (
                      <span key={p} className={`text-xs px-2 py-0.5 rounded-full font-medium ${PERM_COLORS[p] ?? "bg-slate-100 text-slate-600"}`}>
                        {p.replace(/_/g, " ")}
                      </span>
                    ))}
                    {(r.permissions ?? []).length > 8 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                        +{(r.permissions ?? []).length - 8} more
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(r)} className="p-1.5 rounded text-muted-foreground hover:bg-slate-100">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded text-red-500 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Role" size="lg">
        <RoleForm />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Role" size="lg">
        <RoleForm isEdit />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate()}
        loading={deleteMut.isPending}
        title="Delete Role"
        message={`Delete role "${deleteTarget?.name}"? Users with this role may lose access.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
