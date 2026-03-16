import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { Search, Plus, UserCheck, UserX, KeyRound, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Modal from "@/components/shared/Modal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { usersApi } from "@/api/users";
import { rolesApi } from "@/api/roles";
import { formatDate } from "@/lib/utils";
import type { User } from "@/types/user";

type ActionType = "delete" | "activate" | "deactivate" | "reset";

const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  roleId: z.string().min(1, "Role is required"),
});
type CreateUserForm = z.infer<typeof createUserSchema>;

export default function Users() {
  const qc = useQueryClient();
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage]             = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [serverError, setServerError] = useState("");
  const [confirm, setConfirm]       = useState<{ type: ActionType; user: User } | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
  });

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["users", page, search, roleFilter, statusFilter],
    queryFn: () => usersApi.list({
      page, limit: 20,
      search: search || undefined,
      roleId: roleFilter || undefined,
      isActive: statusFilter === "" ? undefined : statusFilter === "active",
    }),
  });

  const { data: rolesData } = useQuery({
    queryKey: ["roles", { limit: 100 }],
    queryFn: () => rolesApi.list({ limit: 100 }),
  });

  const users = usersData?.data?.data ?? [];
  const meta  = usersData?.data?.meta;
  const roles = rolesData?.data?.data ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["users"] });

  const createMut = useMutation({
    mutationFn: (dto: CreateUserForm) => usersApi.create(dto),
    onSuccess: () => { setCreateOpen(false); reset(); setServerError(""); invalidate(); },
    onError: (e: unknown) => setServerError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create user"),
  });

  const deleteMut     = useMutation({ mutationFn: (id: string) => usersApi.delete(id),        onSuccess: () => { setConfirm(null); invalidate(); } });
  const activateMut   = useMutation({ mutationFn: (id: string) => usersApi.activate(id),      onSuccess: () => { setConfirm(null); invalidate(); } });
  const deactivateMut = useMutation({ mutationFn: (id: string) => usersApi.deactivate(id),    onSuccess: () => { setConfirm(null); invalidate(); } });
  const resetMut      = useMutation({ mutationFn: (id: string) => usersApi.resetPassword(id), onSuccess: () => { setConfirm(null); invalidate(); } });

  const handleConfirm = () => {
    if (!confirm) return;
    const id = confirm.user.id;
    if (confirm.type === "delete")     deleteMut.mutate(id);
    if (confirm.type === "activate")   activateMut.mutate(id);
    if (confirm.type === "deactivate") deactivateMut.mutate(id);
    if (confirm.type === "reset")      resetMut.mutate(id);
  };

  const isActionPending = deleteMut.isPending || activateMut.isPending || deactivateMut.isPending || resetMut.isPending;

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage all school users"
        action={
          <button
            onClick={() => { setCreateOpen(true); reset(); setServerError(""); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add User
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search name or email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white">
          <option value="">All roles</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white">
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {isLoading ? <LoadingSpinner /> : users.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <p className="text-sm text-muted-foreground">No users found.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-2">{meta?.total ?? 0} total</p>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Name","Email","Role","Status","Joined","Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">
                      <Link to={`/users/${u.id}`} className="hover:text-primary hover:underline">{u.firstName} {u.lastName}</Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-blue-50 text-primary px-2 py-0.5 rounded-full font-medium">{u.role?.name ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {u.isActive
                          ? <button title="Deactivate" onClick={() => setConfirm({ type: "deactivate", user: u })} className="p-1.5 rounded text-orange-500 hover:bg-orange-50"><UserX className="h-3.5 w-3.5" /></button>
                          : <button title="Activate"   onClick={() => setConfirm({ type: "activate",   user: u })} className="p-1.5 rounded text-green-600 hover:bg-green-50"><UserCheck className="h-3.5 w-3.5" /></button>
                        }
                        <button title="Reset password" onClick={() => setConfirm({ type: "reset",  user: u })} className="p-1.5 rounded text-muted-foreground hover:bg-slate-100"><KeyRound className="h-3.5 w-3.5" /></button>
                        <button title="Delete"         onClick={() => setConfirm({ type: "delete", user: u })} className="p-1.5 rounded text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
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

      {/* Create User Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add New User">
        <form onSubmit={handleSubmit((data) => createMut.mutate(data))} className="space-y-3">
          {serverError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">First name *</label>
              <input {...register("firstName")} className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.firstName ? "border-destructive" : "border-slate-200"}`} />
              {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Last name *</label>
              <input {...register("lastName")} className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.lastName ? "border-destructive" : "border-slate-200"}`} />
              {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName.message}</p>}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email *</label>
            <input type="email" {...register("email")} className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.email ? "border-destructive" : "border-slate-200"}`} />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Phone</label>
            <input {...register("phone")} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Role *</label>
            <select {...register("roleId")} className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white ${errors.roleId ? "border-destructive" : "border-slate-200"}`}>
              <option value="">— Select role —</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            {errors.roleId && <p className="text-xs text-destructive mt-1">{errors.roleId.message}</p>}
          </div>
          <p className="text-xs text-muted-foreground bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
            A temporary password will be auto-generated and emailed to the user. They'll be prompted to change it on first login.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50">Cancel</button>
            <button
              type="submit"
              disabled={createMut.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {createMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create User
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm action */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        loading={isActionPending}
        variant={confirm?.type === "delete" ? "danger" : "warning"}
        title={confirm?.type === "delete" ? "Delete User" : confirm?.type === "deactivate" ? "Deactivate User" : confirm?.type === "activate" ? "Activate User" : "Reset Password"}
        confirmLabel={confirm?.type === "delete" ? "Delete" : confirm?.type === "deactivate" ? "Deactivate" : confirm?.type === "activate" ? "Activate" : "Reset"}
        message={
          confirm?.type === "delete"     ? `Permanently delete ${confirm?.user.firstName} ${confirm?.user.lastName}? This cannot be undone.` :
          confirm?.type === "deactivate" ? `Deactivate ${confirm?.user.firstName} ${confirm?.user.lastName}? They won't be able to log in.` :
          confirm?.type === "activate"   ? `Reactivate ${confirm?.user.firstName} ${confirm?.user.lastName}?` :
          `Send a password reset to ${confirm?.user.email}?`
        }
      />
    </div>
  );
}
