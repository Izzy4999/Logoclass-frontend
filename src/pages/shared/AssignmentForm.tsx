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
import { assignmentsApi } from "@/api/assignments";
import { classesApi, academicYearsApi } from "@/api/classes";
import { lessonsApi } from "@/api/lessons";
import type { ClassSection, Term, AcademicYear } from "@/types/class";

const schema = z.object({
  classId: z.string().min(1, "Class is required"),
  lessonId: z.string().optional(),
  termId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  totalMarks: z.number().min(0).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]),
});
type FormData = z.infer<typeof schema>;

export default function AssignmentForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "DRAFT" },
  });

  const selectedClassId = watch("classId");

  const { data: assignmentData, isLoading: assignmentLoading } = useQuery({
    queryKey: ["assignments", id],
    queryFn: () => assignmentsApi.getById(id!),
    enabled: isEdit,
  });
  const assignment = assignmentData?.data?.data;

  const { data: classesData } = useQuery({
    queryKey: ["classes", { limit: 100 }],
    queryFn: () => classesApi.list({ limit: 100 }),
  });
  const classes: ClassSection[] = classesData?.data?.data ?? [];
  // Grade level of selected class — used to filter relevant lessons
  const selectedGradeLevelId = classes.find((c) => c.id === selectedClassId)?.gradeLevel?.id;

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

  // Fetch lessons filtered by the grade level of the selected class
  const { data: lessonsData } = useQuery({
    queryKey: ["lessons", { gradeLevelId: selectedGradeLevelId, limit: 100 }],
    queryFn: () => lessonsApi.list({ gradeLevelId: selectedGradeLevelId, limit: 100 }),
    enabled: !!selectedGradeLevelId,
  });
  const lessons = lessonsData?.data?.data ?? [];

  useEffect(() => {
    if (assignment) {
      reset({
        classId: assignment.classId,
        lessonId: assignment.lessonId ?? "",
        termId: assignment.termId ?? "",
        title: assignment.title,
        description: assignment.description ?? "",
        dueDate: assignment.dueDate ? assignment.dueDate.slice(0, 16) : "",
        totalMarks: assignment.totalMarks ?? undefined,
        status: assignment.status,
      });
    }
  }, [assignment, reset]);

  const createMut = useMutation({
    mutationFn: (data: FormData) =>
      assignmentsApi.create({
        classId: data.classId,
        lessonId: data.lessonId || undefined,
        termId: data.termId || undefined,
        title: data.title,
        description: data.description || undefined,
        dueDate: data.dueDate || undefined,
        totalMarks: data.totalMarks,
        status: data.status,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      navigate("/assignments");
    },
    onError: (e: unknown) =>
      setServerError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create assignment"),
  });

  const updateMut = useMutation({
    mutationFn: (data: FormData) =>
      assignmentsApi.update(id!, {
        title: data.title,
        description: data.description || undefined,
        dueDate: data.dueDate || undefined,
        totalMarks: data.totalMarks,
        status: data.status,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      navigate("/assignments");
    },
    onError: (e: unknown) =>
      setServerError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update assignment"),
  });

  const deleteMut = useMutation({
    mutationFn: () => assignmentsApi.delete(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      navigate("/assignments");
    },
  });

  const onSubmit = (data: FormData) => {
    setServerError("");
    if (isEdit) updateMut.mutate(data);
    else createMut.mutate(data);
  };

  const isPending = createMut.isPending || updateMut.isPending;

  if (isEdit && assignmentLoading) return <LoadingSpinner />;

  const inputCls = (hasError: boolean) =>
    `mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${hasError ? "border-destructive" : "border-slate-200"}`;

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title={isEdit ? "Edit Assignment" : "Create Assignment"}
        action={
          <button
            onClick={() => navigate("/assignments")}
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

          {!isEdit && selectedClassId && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Link to Lesson (optional)</label>
              <select {...register("lessonId")} className={`${inputCls(false)} bg-white`}>
                <option value="">No linked lesson</option>
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">Title *</label>
            <input
              {...register("title")}
              placeholder="e.g. Chapter 3 Exercise"
              className={inputCls(!!errors.title)}
            />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="Instructions for students..."
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Due Date (optional)</label>
              <input type="datetime-local" {...register("dueDate")} className={inputCls(false)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Total Marks (optional)</label>
              <input
                type="number"
                {...register("totalMarks", { valueAsNumber: true })}
                min={0}
                placeholder="e.g. 100"
                className={inputCls(false)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select {...register("status")} className={`${inputCls(false)} bg-white`}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
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
              {isEdit ? "Save Changes" : "Create Assignment"}
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
          title="Delete Assignment"
          message={`Delete "${assignment?.title}"? All submissions will be lost.`}
          confirmLabel="Delete"
        />
      )}
    </div>
  );
}
