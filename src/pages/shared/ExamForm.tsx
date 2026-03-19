import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useForm as useQForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft, Trash2, Plus, X } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { examsApi } from "@/api/exams";
import { classesApi, academicYearsApi } from "@/api/classes";
import type { ExamQuestion } from "@/types/exam";
import type { ClassSection, Term, AcademicYear } from "@/types/class";

const examSchema = z.object({
  classId: z.string().optional(),
  termId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  instructions: z.string().optional(),
  duration: z.number().int().min(1, "Duration is required"),
  scheduledAt: z.string().min(1, "Scheduled date is required"),
  totalMarks: z.number().min(0),
  passMark: z.number().min(0).optional(),
  roomOpenMinutesBefore: z.number().int().min(0),
  randomiseQuestions: z.boolean(),
  randomiseOptions: z.boolean(),
  publishResults: z.boolean(),
});
type ExamFormData = z.infer<typeof examSchema>;

const qSchema = z.object({
  type: z.enum(["MCQ", "TRUE_FALSE", "SHORT_ANSWER"]),
  question: z.string().min(1, "Question is required"),
  options: z.string().optional(),
  answer: z.string().min(1, "Answer is required"),
  marks: z.number().min(1),
});
type QForm = z.infer<typeof qSchema>;

export default function ExamForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteQTarget, setDeleteQTarget] = useState<ExamQuestion | null>(null);
  const [addQOpen, setAddQOpen] = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      duration: 60, totalMarks: 0, roomOpenMinutesBefore: 10,
      randomiseQuestions: false, randomiseOptions: false, publishResults: false,
    },
  });

  const addQForm = useQForm<QForm>({
    resolver: zodResolver(qSchema),
    defaultValues: { type: "MCQ", marks: 1 },
  });
  const watchQType = addQForm.watch("type");

  const { data: examData, isLoading: examLoading } = useQuery({
    queryKey: ["exams", id],
    queryFn: () => examsApi.getById(id!),
    enabled: isEdit,
  });
  const exam = examData?.data?.data;

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
    if (exam) {
      reset({
        classId: exam.classId ?? "",
        termId: exam.termId ?? "",
        title: exam.title,
        description: exam.description ?? "",
        instructions: exam.instructions ?? "",
        duration: exam.duration,
        scheduledAt: exam.scheduledAt ? exam.scheduledAt.slice(0, 16) : "",
        totalMarks: exam.totalMarks,
        passMark: exam.passMark ?? undefined,
        roomOpenMinutesBefore: exam.roomOpenMinutesBefore,
        randomiseQuestions: exam.randomiseQuestions,
        randomiseOptions: exam.randomiseOptions,
        publishResults: exam.publishResults,
      });
    }
  }, [exam, reset]);

  const createMut = useMutation({
    mutationFn: (data: ExamFormData) =>
      examsApi.create({
        classId: data.classId || undefined,
        termId: data.termId || undefined,
        title: data.title,
        description: data.description || undefined,
        instructions: data.instructions || undefined,
        duration: data.duration,
        scheduledAt: data.scheduledAt,
        totalMarks: data.totalMarks,
        passMark: data.passMark,
        roomOpenMinutesBefore: data.roomOpenMinutesBefore,
        randomiseQuestions: data.randomiseQuestions,
        randomiseOptions: data.randomiseOptions,
        publishResults: data.publishResults,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams"] });
      navigate("/exams");
    },
    onError: (e: unknown) =>
      setServerError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create exam"),
  });

  const updateMut = useMutation({
    mutationFn: (data: ExamFormData) =>
      examsApi.update(id!, {
        title: data.title,
        description: data.description || undefined,
        instructions: data.instructions || undefined,
        duration: data.duration,
        scheduledAt: data.scheduledAt,
        totalMarks: data.totalMarks,
        passMark: data.passMark,
        roomOpenMinutesBefore: data.roomOpenMinutesBefore,
        randomiseQuestions: data.randomiseQuestions,
        randomiseOptions: data.randomiseOptions,
        publishResults: data.publishResults,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (e: unknown) =>
      setServerError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update exam"),
  });

  const deleteMut = useMutation({
    mutationFn: () => examsApi.delete(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams"] });
      navigate("/exams");
    },
  });

  const addQMut = useMutation({
    mutationFn: (q: QForm) =>
      examsApi.setQuestions(id!, [{
        type: q.type,
        question: q.question,
        options: q.type === "MCQ" && q.options ? q.options.split(",").map((o) => o.trim()).filter(Boolean) : null,
        answer: q.answer,
        marks: q.marks,
      }]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams", id] });
      setAddQOpen(false);
      addQForm.reset({ type: "MCQ", marks: 1 });
    },
  });

  const deleteQMut = useMutation({
    mutationFn: async (qId: string) => {
      // Remove the question by re-setting questions without it
      const remaining = (exam?.questions ?? []).filter((q) => q.id !== qId);
      return examsApi.setQuestions(id!, remaining.map((q) => ({
        type: q.type, question: q.question, options: q.options,
        answer: q.answer, marks: q.marks,
      })));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams", id] });
      setDeleteQTarget(null);
    },
  });

  const onSubmit = (data: ExamFormData) => {
    setServerError("");
    if (isEdit) updateMut.mutate(data);
    else createMut.mutate(data);
  };

  const isPending = createMut.isPending || updateMut.isPending;
  const existingQuestions: ExamQuestion[] = exam?.questions ?? [];

  if (isEdit && examLoading) return <LoadingSpinner />;

  const inputCls = (hasError: boolean) =>
    `mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${hasError ? "border-destructive" : "border-slate-200"}`;

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader
        title={isEdit ? "Edit Exam" : "Create Exam"}
        action={
          <button
            onClick={() => navigate("/exams")}
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
              <label className="text-xs font-medium text-muted-foreground">Class (optional)</label>
              <select
                {...register("classId")}
                disabled={isEdit}
                className={`${inputCls(false)} bg-white ${isEdit ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.section ? ` (${c.section})` : ""}
                  </option>
                ))}
              </select>
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
            <input {...register("title")} placeholder="e.g. Mid-Term Mathematics Exam" className={inputCls(!!errors.title)} />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
            <textarea {...register("description")} rows={2} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Instructions (optional)</label>
            <textarea {...register("instructions")} rows={3} placeholder="Instructions shown to students before the exam starts..." className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Scheduled At *</label>
              <input type="datetime-local" {...register("scheduledAt")} className={inputCls(!!errors.scheduledAt)} />
              {errors.scheduledAt && <p className="text-xs text-destructive mt-1">{errors.scheduledAt.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Duration (minutes) *</label>
              <input type="number" min={1} {...register("duration", { valueAsNumber: true })} className={inputCls(!!errors.duration)} />
              {errors.duration && <p className="text-xs text-destructive mt-1">{errors.duration.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Total Marks</label>
              <input type="number" min={0} {...register("totalMarks", { valueAsNumber: true })} className={inputCls(false)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Pass Mark (optional)</label>
              <input type="number" min={0} {...register("passMark", { valueAsNumber: true })} className={inputCls(false)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Room Opens Before (min)</label>
              <input type="number" min={0} {...register("roomOpenMinutesBefore", { valueAsNumber: true })} className={inputCls(false)} />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" {...register("randomiseQuestions")} className="h-4 w-4 rounded border-slate-300" />
              Randomise question order
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" {...register("randomiseOptions")} className="h-4 w-4 rounded border-slate-300" />
              Randomise options
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" {...register("publishResults")} className="h-4 w-4 rounded border-slate-300" />
              Auto-publish results
            </label>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {isEdit ? (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Exam
              </button>
            ) : <span />}
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Exam"}
            </button>
          </div>
        </form>
      </div>

      {/* Edit mode: manage questions */}
      {isEdit && (
        <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              Questions ({existingQuestions.length})
            </h2>
            <button
              onClick={() => setAddQOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" /> Add Question
            </button>
          </div>

          {existingQuestions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-lg">
              No questions yet.
            </p>
          ) : (
            <div className="space-y-2">
              {existingQuestions.map((q, i) => (
                <div key={q.id} className="flex items-start justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                  <div>
                    <span className="text-xs text-muted-foreground mr-2">Q{i + 1}</span>
                    <span className="text-sm font-medium">{q.question}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{q.type}</span>
                      <span className="text-xs text-muted-foreground">· {q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteQTarget(q)}
                    className="p-1 rounded text-red-500 hover:bg-red-50 ml-2 flex-shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {addQOpen && (
            <div className="mt-4 border border-primary/20 rounded-lg p-4 bg-blue-50/30 space-y-3">
              <h3 className="text-xs font-semibold text-foreground">New Question</h3>
              <form onSubmit={addQForm.handleSubmit((d) => addQMut.mutate(d))} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Type</label>
                    <select {...addQForm.register("type")} className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white outline-none">
                      <option value="MCQ">Multiple Choice</option>
                      <option value="TRUE_FALSE">True / False</option>
                      <option value="SHORT_ANSWER">Short Answer</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Marks</label>
                    <input type="number" min={1} {...addQForm.register("marks", { valueAsNumber: true })} className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Question *</label>
                  <input {...addQForm.register("question")} placeholder="Enter question text..." className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none" />
                </div>
                {watchQType === "MCQ" && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Options (comma-separated)</label>
                    <input {...addQForm.register("options")} placeholder="Option A, Option B, Option C, Option D" className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none" />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Answer *</label>
                  {watchQType === "TRUE_FALSE" ? (
                    <select {...addQForm.register("answer")} className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white outline-none">
                      <option value="">Select...</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  ) : (
                    <input {...addQForm.register("answer")} placeholder="Correct answer" className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none" />
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setAddQOpen(false)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={addQMut.isPending} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
                    {addQMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Add
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMut.mutate()}
        loading={deleteMut.isPending}
        title="Delete Exam"
        message={`Delete "${exam?.title}"? All attempts and participants will be removed.`}
        confirmLabel="Delete"
      />
      <ConfirmDialog
        open={!!deleteQTarget}
        onClose={() => setDeleteQTarget(null)}
        onConfirm={() => deleteQMut.mutate(deleteQTarget!.id)}
        loading={deleteQMut.isPending}
        title="Remove Question"
        message="Remove this question from the exam?"
        confirmLabel="Remove"
      />
    </div>
  );
}
