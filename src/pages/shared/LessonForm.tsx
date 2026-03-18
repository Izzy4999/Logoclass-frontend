import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft, Trash2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { lessonsApi } from "@/api/lessons";
import { classesApi, academicYearsApi } from "@/api/classes";
import { useState } from "react";
import type { ClassSection, Term, AcademicYear } from "@/types/class";

const schema = z.object({
  classId: z.string().min(1, "Class is required"),
  termId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  order: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

export default function LessonForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isPublished: false, order: 0 },
  });

  // Fetch existing lesson for edit
  const { data: lessonData, isLoading: lessonLoading } = useQuery({
    queryKey: ["lessons", id],
    queryFn: () => lessonsApi.getById(id!),
    enabled: isEdit,
  });
  const lesson = lessonData?.data?.data;

  // Fetch classes
  const { data: classesData } = useQuery({
    queryKey: ["classes", { limit: 100 }],
    queryFn: () => classesApi.list({ limit: 100 }),
  });
  const classes: ClassSection[] = classesData?.data?.data ?? [];

  // Fetch current academic year + its terms
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

  // Pre-fill form for edit
  useEffect(() => {
    if (lesson) {
      reset({
        classId: lesson.classId,
        termId: lesson.termId ?? "",
        title: lesson.title,
        description: lesson.description ?? "",
        order: lesson.order,
        isPublished: lesson.isPublished,
      });
    }
  }, [lesson, reset]);

  const createMut = useMutation({
    mutationFn: (data: FormData) =>
      lessonsApi.create({
        classId: data.classId,
        termId: data.termId || undefined,
        title: data.title,
        description: data.description || undefined,
        order: data.order,
        isPublished: data.isPublished,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessons"] });
      navigate("/lessons");
    },
    onError: (e: unknown) =>
      setServerError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create lesson"),
  });

  const updateMut = useMutation({
    mutationFn: (data: FormData) =>
      lessonsApi.update(id!, {
        title: data.title,
        description: data.description || undefined,
        order: data.order,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessons"] });
      navigate("/lessons");
    },
    onError: (e: unknown) =>
      setServerError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update lesson"),
  });

  const deleteMut = useMutation({
    mutationFn: () => lessonsApi.delete(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessons"] });
      navigate("/lessons");
    },
  });

  const onSubmit = (data: FormData) => {
    setServerError("");
    if (isEdit) updateMut.mutate(data);
    else createMut.mutate(data);
  };

  const isPending = createMut.isPending || updateMut.isPending;

  if (isEdit && lessonLoading) return <LoadingSpinner />;

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title={isEdit ? "Edit Lesson" : "Add Lesson"}
        action={
          <button
            onClick={() => navigate("/lessons")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Lessons
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
                className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white ${errors.classId ? "border-destructive" : "border-slate-200"} ${isEdit ? "opacity-60 cursor-not-allowed" : ""}`}
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
                className={`mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white ${isEdit ? "opacity-60 cursor-not-allowed" : ""}`}
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
              placeholder="e.g. Introduction to Algebra"
              className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.title ? "border-destructive" : "border-slate-200"}`}
            />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="What will students learn in this lesson?"
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Order</label>
              <input
                type="number"
                {...register("order", { valueAsNumber: true })}
                min={0}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            {!isEdit && (
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" {...register("isPublished")} className="h-4 w-4 rounded border-slate-300" />
                  <span className="font-medium text-foreground">Publish immediately</span>
                </label>
              </div>
            )}
          </div>

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
              {isEdit ? "Save Changes" : "Add Lesson"}
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
          title="Delete Lesson"
          message={`Delete "${lesson?.title}"? This will also remove all attachments and cannot be undone.`}
          confirmLabel="Delete"
        />
      )}
    </div>
  );
}
