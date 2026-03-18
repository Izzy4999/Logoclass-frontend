import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, useForm as useQForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft, Trash2, Plus, X } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { quizzesApi } from "@/api/quizzes";
import { lessonsApi } from "@/api/lessons";
import type { QuizQuestion } from "@/types/quiz";

const questionSchema = z.object({
  type: z.enum(["MCQ", "TRUE_FALSE", "SHORT_ANSWER"]),
  question: z.string().min(1, "Question text is required"),
  options: z.string().optional(), // comma-separated for MCQ
  answer: z.string().min(1, "Answer is required"),
  marks: z.number().min(1),
  order: z.number().int().min(0),
});
type QuestionForm = z.infer<typeof questionSchema>;

const quizSchema = z.object({
  lessonId: z.string().min(1, "Lesson is required"),
  title: z.string().min(1, "Title is required"),
  timeLimit: z.number().min(1).optional(),
  questions: z.array(questionSchema),
});
type QuizFormData = z.infer<typeof quizSchema>;

// Inline question form schema
const addQSchema = z.object({
  type: z.enum(["MCQ", "TRUE_FALSE", "SHORT_ANSWER"]),
  question: z.string().min(1, "Question is required"),
  options: z.string().optional(),
  answer: z.string().min(1, "Answer is required"),
  marks: z.number().min(1),
  order: z.number().int().min(0),
});

export default function QuizForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteQTarget, setDeleteQTarget] = useState<QuizQuestion | null>(null);
  const [addQOpen, setAddQOpen] = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, reset, watch, control, formState: { errors } } = useForm<QuizFormData>({
    resolver: zodResolver(quizSchema),
    defaultValues: { questions: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "questions" });

  // Separate form for adding question in edit mode
  const addQForm = useQForm<QuestionForm>({
    resolver: zodResolver(addQSchema),
    defaultValues: { type: "MCQ", marks: 1, order: 0 },
  });

  const { data: quizData, isLoading: quizLoading } = useQuery({
    queryKey: ["quizzes", id],
    queryFn: () => quizzesApi.getById(id!),
    enabled: isEdit,
  });
  const quiz = quizData?.data?.data;

  const { data: lessonsData } = useQuery({
    queryKey: ["lessons", { limit: 100 }],
    queryFn: () => lessonsApi.list({ limit: 100 }),
  });
  const lessons = lessonsData?.data?.data ?? [];

  useEffect(() => {
    if (quiz) {
      reset({
        lessonId: quiz.lessonId,
        title: quiz.title,
        timeLimit: quiz.timeLimit ?? undefined,
        questions: [],
      });
    }
  }, [quiz, reset]);

  const createMut = useMutation({
    mutationFn: (data: QuizFormData) =>
      quizzesApi.create({
        lessonId: data.lessonId,
        title: data.title,
        timeLimit: data.timeLimit,
        questions: data.questions.map((q) => ({
          type: q.type,
          question: q.question,
          options: q.type === "MCQ" && q.options ? q.options.split(",").map((o) => o.trim()).filter(Boolean) : null,
          answer: q.answer,
          marks: q.marks,
          order: q.order,
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quizzes"] });
      navigate("/quizzes");
    },
    onError: (e: unknown) =>
      setServerError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create quiz"),
  });

  const updateMut = useMutation({
    mutationFn: (data: QuizFormData) =>
      quizzesApi.update(id!, { title: data.title, timeLimit: data.timeLimit }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quizzes"] });
    },
    onError: (e: unknown) =>
      setServerError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update quiz"),
  });

  const deleteMut = useMutation({
    mutationFn: () => quizzesApi.delete(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quizzes"] });
      navigate("/quizzes");
    },
  });

  const addQMut = useMutation({
    mutationFn: (q: QuestionForm) =>
      quizzesApi.addQuestion(id!, {
        type: q.type,
        question: q.question,
        options: q.type === "MCQ" && q.options ? q.options.split(",").map((o) => o.trim()).filter(Boolean) : null,
        answer: q.answer,
        marks: q.marks,
        order: q.order,
      } as Partial<QuizQuestion>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quizzes", id] });
      setAddQOpen(false);
      addQForm.reset({ type: "MCQ", marks: 1, order: 0 });
    },
  });

  const deleteQMut = useMutation({
    mutationFn: (qId: string) => quizzesApi.deleteQuestion(id!, qId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quizzes", id] });
      setDeleteQTarget(null);
    },
  });

  const onSubmit = (data: QuizFormData) => {
    setServerError("");
    if (isEdit) updateMut.mutate(data);
    else createMut.mutate(data);
  };

  const watchType = addQForm.watch("type");
  const createWatchType = watch("questions");

  const isPending = createMut.isPending || updateMut.isPending;
  const existingQuestions: QuizQuestion[] = quiz?.questions ?? [];

  if (isEdit && quizLoading) return <LoadingSpinner />;

  const inputCls = (hasError: boolean) =>
    `mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${hasError ? "border-destructive" : "border-slate-200"}`;

  const QuestionRow = ({ q, index }: { q: (typeof fields)[0]; index: number }) => {
    const type = (createWatchType[index] as QuizFormData["questions"][number])?.type;
    return (
      <div className="border border-slate-200 rounded-lg p-4 space-y-3 relative">
        <button
          type="button"
          onClick={() => remove(index)}
          className="absolute top-2 right-2 p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Type</label>
            <select
              {...register(`questions.${index}.type`)}
              className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="MCQ">Multiple Choice</option>
              <option value="TRUE_FALSE">True / False</option>
              <option value="SHORT_ANSWER">Short Answer</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Marks</label>
            <input
              type="number"
              min={1}
              {...register(`questions.${index}.marks`, { valueAsNumber: true })}
              className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Order</label>
            <input
              type="number"
              min={0}
              {...register(`questions.${index}.order`, { valueAsNumber: true })}
              className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Question *</label>
          <input
            {...register(`questions.${index}.question`)}
            placeholder="Enter question text..."
            className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {type === "MCQ" && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Options (comma-separated) *</label>
            <input
              {...register(`questions.${index}.options`)}
              placeholder="Option A, Option B, Option C, Option D"
              className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            {type === "TRUE_FALSE" ? 'Answer (true/false)' : type === "MCQ" ? 'Correct Answer' : 'Model Answer'} *
          </label>
          {type === "TRUE_FALSE" ? (
            <select
              {...register(`questions.${index}.answer`)}
              className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select...</option>
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          ) : (
            <input
              {...register(`questions.${index}.answer`)}
              placeholder={type === "MCQ" ? "Exact matching option text" : "Expected answer"}
              className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30"
            />
          )}
        </div>
        {q.id}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title={isEdit ? "Edit Quiz" : "Create Quiz"}
        action={
          <button
            onClick={() => navigate("/quizzes")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        {serverError && (
          <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Lesson *</label>
              <select
                {...register("lessonId")}
                disabled={isEdit}
                className={`${inputCls(!!errors.lessonId)} bg-white ${isEdit ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <option value="">Select lesson...</option>
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
              {errors.lessonId && <p className="text-xs text-destructive mt-1">{errors.lessonId.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Time Limit (minutes, optional)</label>
              <input
                type="number"
                {...register("timeLimit", { valueAsNumber: true })}
                min={1}
                placeholder="No limit"
                className={inputCls(false)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Title *</label>
            <input
              {...register("title")}
              placeholder="e.g. Chapter 1 Quiz"
              className={inputCls(!!errors.title)}
            />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
          </div>

          {/* Questions for new quiz */}
          {!isEdit && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Questions ({fields.length})</label>
                <button
                  type="button"
                  onClick={() => append({ type: "MCQ", question: "", options: "", answer: "", marks: 1, order: fields.length })}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Question
                </button>
              </div>
              <div className="space-y-3">
                {fields.map((q, i) => <QuestionRow key={q.id} q={q} index={i} />)}
                {fields.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                    No questions added. Click "+ Add Question" above.
                  </p>
                )}
              </div>
              {/* Suppress unused var warning */}
              <span className="hidden">{String(createWatchType.length)}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {isEdit ? (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Quiz
              </button>
            ) : <span />}
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Quiz"}
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
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Question form */}
          {addQOpen && (
            <div className="mt-4 border border-primary/20 rounded-lg p-4 bg-blue-50/30 space-y-3">
              <h3 className="text-xs font-semibold text-foreground">New Question</h3>
              <form
                onSubmit={addQForm.handleSubmit((d) => addQMut.mutate(d))}
                className="space-y-3"
              >
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Type</label>
                    <select
                      {...addQForm.register("type")}
                      className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white outline-none"
                    >
                      <option value="MCQ">Multiple Choice</option>
                      <option value="TRUE_FALSE">True / False</option>
                      <option value="SHORT_ANSWER">Short Answer</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Marks</label>
                    <input
                      type="number"
                      min={1}
                      {...addQForm.register("marks", { valueAsNumber: true })}
                      className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Order</label>
                    <input
                      type="number"
                      min={0}
                      {...addQForm.register("order", { valueAsNumber: true })}
                      className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Question *</label>
                  <input
                    {...addQForm.register("question")}
                    placeholder="Enter question text..."
                    className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                {watchType === "MCQ" && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Options (comma-separated)</label>
                    <input
                      {...addQForm.register("options")}
                      placeholder="Option A, Option B, Option C, Option D"
                      className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Answer *</label>
                  {watchType === "TRUE_FALSE" ? (
                    <select
                      {...addQForm.register("answer")}
                      className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white outline-none"
                    >
                      <option value="">Select...</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  ) : (
                    <input
                      {...addQForm.register("answer")}
                      placeholder="Correct answer"
                      className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none"
                    />
                  )}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAddQOpen(false)}
                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addQMut.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    {addQMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Add Question
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Delete quiz */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMut.mutate()}
        loading={deleteMut.isPending}
        title="Delete Quiz"
        message={`Delete "${quiz?.title}"? All attempts will be lost.`}
        confirmLabel="Delete"
      />

      {/* Delete question */}
      <ConfirmDialog
        open={!!deleteQTarget}
        onClose={() => setDeleteQTarget(null)}
        onConfirm={() => deleteQMut.mutate(deleteQTarget!.id)}
        loading={deleteQMut.isPending}
        title="Delete Question"
        message="Delete this question? This cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}
