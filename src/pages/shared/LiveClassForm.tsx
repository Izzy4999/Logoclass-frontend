import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft, Trash2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { liveClassesApi } from "@/api/live-classes";
import { classesApi, academicYearsApi } from "@/api/classes";
import type { ClassSection, Term, AcademicYear } from "@/types/class";

const schema = z.object({
  classId: z.string().min(1, "Class is required"),
  termId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  scheduledAt: z.string().min(1, "Scheduled date is required"),
  duration: z.number().int().min(1).optional(),
  joinUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  roomName: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function LiveClassForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { data: lcData, isLoading: lcLoading } = useQuery({
    queryKey: ["live-classes", id],
    queryFn: () => liveClassesApi.getById(id!),
    enabled: isEdit,
  });
  const lc = lcData?.data?.data;

  const { data: classesData } = useQuery({
    queryKey: ["classes", { limit: 100 }],
    queryFn: () => classesApi.list({ limit: 100 }),
  });
  const classes: ClassSection[] = classesData?.data?.data ?? [];

  const { data: yearsData } = useQuery({
    queryKey: ["academic-years", { isCurrent: true }],
    queryFn: () => academicYearsApi.list({ isCurrent: true, limit: 5 }),
  });
  const currentYear: AcademicYear | undefined = (yearsData?.data?.data ?? []).find((y) => y.isCurrent);

  const { data: termsData } = useQuery({
    queryKey: ["academic-years", currentYear?.id, "terms"],
    queryFn: () => academicYearsApi.listTerms(currentYear!.id),
    enabled: !!currentYear,
  });
  const terms: Term[] = termsData?.data?.data ?? [];

  useEffect(() => {
    if (lc) {
      reset({
        classId: lc.classId,
        termId: lc.termId ?? "",
        title: lc.title,
        description: lc.description ?? "",
        scheduledAt: lc.scheduledAt ? lc.scheduledAt.slice(0, 16) : "",
        duration: lc.duration ?? undefined,
        joinUrl: lc.joinUrl ?? "",
        roomName: lc.roomName ?? "",
      });
    }
  }, [lc, reset]);

  const createMut = useMutation({
    mutationFn: (data: FormData) =>
      liveClassesApi.create({
        classId: data.classId,
        termId: data.termId || undefined,
        title: data.title,
        description: data.description || undefined,
        scheduledAt: data.scheduledAt,
        duration: data.duration,
        joinUrl: data.joinUrl || undefined,
        roomName: data.roomName || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live-classes"] });
      navigate("/live-classes");
    },
    onError: (e: unknown) =>
      setServerError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to schedule class"),
  });

  const updateMut = useMutation({
    mutationFn: (data: FormData) =>
      liveClassesApi.update(id!, {
        title: data.title,
        description: data.description || undefined,
        duration: data.duration,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live-classes"] });
      navigate("/live-classes");
    },
    onError: (e: unknown) =>
      setServerError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update class"),
  });

  const deleteMut = useMutation({
    mutationFn: () => liveClassesApi.delete(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live-classes"] });
      navigate("/live-classes");
    },
  });

  const onSubmit = (data: FormData) => {
    setServerError("");
    if (isEdit) updateMut.mutate(data);
    else createMut.mutate(data);
  };

  const isPending = createMut.isPending || updateMut.isPending;

  if (isEdit && lcLoading) return <LoadingSpinner />;

  const inputCls = (hasError: boolean) =>
    `mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${hasError ? "border-destructive" : "border-slate-200"}`;

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title={isEdit ? "Edit Live Class" : "Schedule Live Class"}
        action={
          <button
            onClick={() => navigate("/live-classes")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {serverError && (
          <p className="mb-4 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Class *</label>
              <select
                {...register("classId")}
                disabled={isEdit}
                className={`${inputCls(!!errors.classId)} bg-white ${isEdit ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <option value="">Select class...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.section ? ` (${c.section})` : ""}
                  </option>
                ))}
              </select>
              {errors.classId && <p className="text-xs text-destructive mt-1">{errors.classId.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Term (optional)</label>
              <select
                {...register("termId")}
                disabled={isEdit}
                className={`${inputCls(false)} bg-white ${isEdit ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <option value="">No specific term</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Title *</label>
            <input
              {...register("title")}
              placeholder="e.g. Introduction to Calculus — Live Session"
              className={inputCls(!!errors.title)}
            />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
            <textarea
              {...register("description")}
              rows={2}
              placeholder="What will be covered in this session?"
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Scheduled At *</label>
              <input
                type="datetime-local"
                {...register("scheduledAt")}
                disabled={isEdit}
                className={`${inputCls(!!errors.scheduledAt)} ${isEdit ? "opacity-60 cursor-not-allowed" : ""}`}
              />
              {errors.scheduledAt && <p className="text-xs text-destructive mt-1">{errors.scheduledAt.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Duration (minutes, optional)</label>
              <input
                type="number"
                min={1}
                {...register("duration", { valueAsNumber: true })}
                placeholder="e.g. 60"
                className={inputCls(false)}
              />
            </div>
          </div>

          {!isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Join URL (optional)</label>
                <input
                  {...register("joinUrl")}
                  type="url"
                  placeholder="https://..."
                  className={inputCls(!!errors.joinUrl)}
                />
                {errors.joinUrl && <p className="text-xs text-destructive mt-1">{errors.joinUrl.message}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Room Name (optional)</label>
                <input
                  {...register("roomName")}
                  placeholder="e.g. math-class-room-1"
                  className={inputCls(false)}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {isEdit ? (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            ) : <span />}
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit ? "Save Changes" : "Schedule Class"}
            </button>
          </div>
        </form>
      </div>

      {isEdit && (
        <ConfirmDialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => deleteMut.mutate()}
          loading={deleteMut.isPending}
          title="Delete Live Class"
          message={`Delete "${lc?.title}"? This cannot be undone.`}
          confirmLabel="Delete"
        />
      )}
    </div>
  );
}
