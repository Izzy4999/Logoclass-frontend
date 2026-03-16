import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit2, Trash2, Megaphone, Loader2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Modal from "@/components/shared/Modal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { announcementsApi } from "@/api/announcements";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";
import type { Announcement } from "@/types/notification";

const ALL_ROLES = ["ADMIN", "TEACHER", "STUDENT", "PARENT"];
const ROLE_COLORS: Record<string, string> = {
  ADMIN:   "bg-blue-50 text-blue-700",
  TEACHER: "bg-green-50 text-green-700",
  STUDENT: "bg-purple-50 text-purple-700",
  PARENT:  "bg-orange-50 text-orange-700",
};

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  targetRoles: z.array(z.string()).min(1, "Select at least one audience"),
  endDate: z.string().optional(),
});
type AnnouncementFormData = z.infer<typeof announcementSchema>;

export default function AnnouncementsPage() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const canManage = can("CREATE_ANNOUNCEMENT");

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [viewTarget, setViewTarget] = useState<Announcement | null>(null);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, reset, watch, getValues, setValue, formState: { errors } } = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: "", content: "", targetRoles: [], endDate: "" },
  });

  const targetRoles = watch("targetRoles");

  const { data, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => announcementsApi.list({ limit: 50 }),
  });

  const announcements = data?.data?.data ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ["announcements"] });

  const createMut = useMutation({
    mutationFn: (data: AnnouncementFormData) => announcementsApi.create({
      title: data.title,
      content: data.content,
      targetRoles: data.targetRoles,
      endDate: data.endDate || undefined,
    }),
    onSuccess: () => { setCreateOpen(false); reset(); setServerError(""); invalidate(); },
    onError: (e: unknown) => setServerError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create"),
  });

  const editMut = useMutation({
    mutationFn: (data: AnnouncementFormData) => announcementsApi.update(editTarget!.id, {
      title: data.title,
      content: data.content,
      targetRoles: data.targetRoles,
      endDate: data.endDate || undefined,
    }),
    onSuccess: () => { setEditTarget(null); reset(); setServerError(""); invalidate(); },
    onError: (e: unknown) => setServerError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update"),
  });

  const deleteMut = useMutation({
    mutationFn: () => announcementsApi.delete(deleteTarget!.id),
    onSuccess: () => { setDeleteTarget(null); invalidate(); },
  });

  const openEdit = (a: Announcement) => {
    setEditTarget(a);
    reset({ title: a.title, content: a.content, targetRoles: a.targetRoles, endDate: a.endDate ?? "" });
    setServerError("");
  };

  const toggleRole = (role: string) => {
    const current = getValues("targetRoles");
    setValue("targetRoles", current.includes(role) ? current.filter(r => r !== role) : [...current, role], { shouldValidate: true });
  };

  const AnnouncementForm = ({ isEdit }: { isEdit?: boolean }) => (
    <form onSubmit={handleSubmit((data) => isEdit ? editMut.mutate(data) : createMut.mutate(data))} className="space-y-3">
      {serverError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Title *</label>
        <input {...register("title")}
          className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.title ? "border-destructive" : "border-slate-200"}`} />
        {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Content *</label>
        <textarea {...register("content")} rows={5}
          className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none ${errors.content ? "border-destructive" : "border-slate-200"}`} />
        {errors.content && <p className="text-xs text-destructive mt-1">{errors.content.message}</p>}
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Visible to *</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {ALL_ROLES.map(role => (
            <button key={role} type="button" onClick={() => toggleRole(role)}
              className={`px-3 py-1 text-xs rounded-full border font-medium transition-all ${targetRoles.includes(role) ? "border-primary bg-primary text-white" : "border-slate-200 text-muted-foreground hover:border-slate-300"}`}>
              {role}
            </button>
          ))}
        </div>
        {errors.targetRoles && <p className="text-xs text-destructive mt-1">{errors.targetRoles.message}</p>}
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Expires on (optional)</label>
        <input type="date" {...register("endDate")}
          className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={() => isEdit ? setEditTarget(null) : setCreateOpen(false)}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50">Cancel</button>
        <button
          type="submit"
          disabled={createMut.isPending || editMut.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
          {(createMut.isPending || editMut.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isEdit ? "Save changes" : "Publish"}
        </button>
      </div>
    </form>
  );

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Broadcast messages to your school community"
        action={canManage ? (
          <button onClick={() => { setCreateOpen(true); reset({ title: "", content: "", targetRoles: [], endDate: "" }); setServerError(""); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Announcement
          </button>
        ) : undefined}
      />

      {isLoading ? <LoadingSpinner /> : announcements.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center">
            <Megaphone className="h-7 w-7 text-primary" />
          </div>
          <p className="font-semibold text-foreground">No announcements yet</p>
          <p className="text-sm text-muted-foreground">Announcements will appear here once published.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-start gap-4">
              <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Megaphone className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{a.title}</h3>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(a.createdAt)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {a.targetRoles.map(r => (
                    <span key={r} className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[r] ?? "bg-slate-100 text-slate-600"}`}>{r}</span>
                  ))}
                  {a.endDate && <span className="text-xs text-muted-foreground ml-2">Expires {formatDate(a.endDate)}</span>}
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setViewTarget(a)} className="p-1.5 rounded text-muted-foreground hover:bg-slate-100 text-xs font-medium">View</button>
                  <button onClick={() => openEdit(a)} className="p-1.5 rounded text-muted-foreground hover:bg-slate-100"><Edit2 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleteTarget(a)} className="p-1.5 rounded text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Announcement" size="lg">
        <AnnouncementForm />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Announcement" size="lg">
        <AnnouncementForm isEdit />
      </Modal>

      <Modal open={!!viewTarget} onClose={() => setViewTarget(null)} title={viewTarget?.title ?? ""} size="lg">
        {viewTarget && (
          <div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {viewTarget.targetRoles.map(r => (
                <span key={r} className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[r] ?? "bg-slate-100 text-slate-600"}`}>{r}</span>
              ))}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{viewTarget.content}</p>
            <p className="text-xs text-muted-foreground mt-4">Posted {formatDate(viewTarget.createdAt)}</p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate()}
        loading={deleteMut.isPending}
        title="Delete Announcement"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
