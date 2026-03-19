import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft, Trash2, UploadCloud, X, FileText,
  Film, FileSpreadsheet, File, Clock,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { lessonsApi } from "@/api/lessons";
import type { Material } from "@/api/uploads";
import { gradeLevelsApi, academicYearsApi, subjectsApi } from "@/api/classes";
import type { GradeLevel, Term, AcademicYear } from "@/types/class";
import { uploadManager } from "@/lib/uploadManager";

// ── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  gradeLevelId: z.string().min(1, "Grade level is required"),
  subjectId: z.string().optional(),
  termId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  isPublished: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function FileIcon({ contentType, className }: { contentType?: string; className?: string }) {
  if (contentType === "VIDEO") return <Film className={className} />;
  if (contentType === "PDF") return <FileText className={className} />;
  if (contentType === "SPREADSHEET") return <FileSpreadsheet className={className} />;
  return <File className={className} />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Staged file state ─────────────────────────────────────────────────────────
// Files are staged (queued) on selection and only uploaded when the form is submitted.

interface StagedFile {
  /** Unique key per item in the list */
  key: string;
  /** Actual File object (undefined for already-uploaded attachments in edit mode) */
  file?: File;
  /** Display name */
  name: string;
  /** "queued" — waiting for submit; "done" — already uploaded (edit pre-fill) */
  status: "queued" | "done";
  /** Populated after successful upload */
  material?: Material;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function LessonForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  /** Blocks the Submit button only until we hand off to uploadManager */
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isPublished: false },
  });

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: lessonData, isLoading: lessonLoading } = useQuery({
    queryKey: ["lessons", id],
    queryFn: () => lessonsApi.getById(id!),
    enabled: isEdit,
  });
  const lesson = lessonData?.data?.data;

  const { data: gradeLevelsData } = useQuery({
    queryKey: ["grade-levels", { limit: 100 }],
    queryFn: () => gradeLevelsApi.list({ limit: 100 }),
  });
  const gradeLevels: GradeLevel[] = gradeLevelsData?.data?.data ?? [];

  const { data: subjectsData } = useQuery({
    queryKey: ["subjects", { limit: 100 }],
    queryFn: () => subjectsApi.list({ limit: 100 }),
  });
  const subjects = (subjectsData?.data?.data ?? []) as Array<{ id: string; name: string; code?: string }>;

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

  // ── Pre-fill for edit ──────────────────────────────────────────────────────

  useEffect(() => {
    if (lesson) {
      reset({
        gradeLevelId: (lesson as any).gradeLevel?.id ?? (lesson as any).gradeLevelId ?? "",
        subjectId: (lesson as any).subject?.id ?? (lesson as any).subjectId ?? "",
        termId: (lesson as any).term?.id ?? (lesson as any).termId ?? "",
        title: lesson.title,
        description: lesson.description ?? "",
        isPublished: lesson.isPublished,
      });

      // Pre-populate staged list with existing attachments (already "done")
      if ((lesson as any).attachments?.length) {
        setStaged(
          (lesson as any).attachments.map((a: any) => ({
            key: a.id,
            name: a.title ?? a.originalName ?? "attachment",
            status: "done" as const,
            material: {
              id: a.materialId ?? a.id,
              url: a.contentUrl,
              originalName: a.title ?? "attachment",
              mimeType: a.mimeType ?? "",
              fileSize: a.fileSize ?? 0,
              contentType: a.contentType,
            } as Material,
          })),
        );
      }
    }
  }, [lesson, reset]);

  // ── Stage files on selection (no upload yet) ──────────────────────────────

  const stageFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const incoming: StagedFile[] = Array.from(files).map((file) => ({
      key: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      status: "queued" as const,
    }));
    setStaged((prev) => [...prev, ...incoming]);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      stageFiles(e.dataTransfer.files);
    },
    [stageFiles],
  );

  const removeStaged = (key: string) =>
    setStaged((prev) => prev.filter((s) => s.key !== key));

  // ── Delete mutation ────────────────────────────────────────────────────────

  const deleteMut = useMutation({
    mutationFn: () => lessonsApi.delete(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lessons"] }); navigate("/lessons"); },
  });

  // ── Submit: hand off to uploadManager and navigate immediately ───────────

  const onSubmit = (data: FormData) => {
    setSubmitting(true);

    const existingMaterialIds = staged
      .filter((s) => s.status === "done" && s.material?.id)
      .map((s) => s.material!.id);

    const pendingFiles = staged
      .filter((s) => s.status === "queued" && s.file)
      .map((s) => ({ file: s.file!, name: s.name }));

    // Capture queryClient reference before navigation unmounts the component
    const client = qc;

    uploadManager.enqueue({
      lessonPayload: {
        lessonId: isEdit ? id! : null,
        gradeLevelId: data.gradeLevelId,
        subjectId: data.subjectId || undefined,
        termId: data.termId || undefined,
        title: data.title,
        description: data.description || undefined,
        isPublished: data.isPublished,
        existingMaterialIds,
      },
      pendingFiles,
      onSaved: () => client.invalidateQueries({ queryKey: ["lessons"] }),
    });

    // Navigate away immediately — upload continues in background
    navigate("/lessons");
  };

  if (isEdit && lessonLoading) return <LoadingSpinner />;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-2xl space-y-4">
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

      {/* ── Lesson details ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Lesson Details</h3>

        <form id="lesson-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Grade Level *</label>
              <select
                {...register("gradeLevelId")}
                disabled={isEdit}
                className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white ${
                  errors.gradeLevelId ? "border-destructive" : "border-slate-200"
                } ${isEdit ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <option value="">Select grade level...</option>
                {gradeLevels.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              {errors.gradeLevelId && <p className="text-xs text-destructive mt-1">{errors.gradeLevelId.message}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Subject (optional)</label>
              <select
                {...register("subjectId")}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
              >
                <option value="">No specific subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code ? `[${s.code}] ` : ""}{s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Term (optional)</label>
            <select
              {...register("termId")}
              disabled={isEdit}
              className={`mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white ${
                isEdit ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              <option value="">No specific term</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Title *</label>
            <input
              {...register("title")}
              placeholder="e.g. Introduction to Algebra"
              className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                errors.title ? "border-destructive" : "border-slate-200"
              }`}
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

          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" {...register("isPublished")} className="h-4 w-4 rounded border-slate-300" />
            <span className="font-medium text-foreground">Published</span>
            <span className="text-xs text-muted-foreground">
              {isEdit ? "(students can see published lessons)" : "(publish immediately after saving)"}
            </span>
          </label>
        </form>
      </div>

      {/* ── Materials ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1">Materials</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Add files below. They upload in the background after you click Save — you can navigate away freely.
        </p>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
            isDragging
              ? "border-primary bg-blue-50"
              : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"
          }`}
        >
          <UploadCloud className={`h-8 w-8 ${isDragging ? "text-primary" : "text-slate-400"}`} />
          <p className="text-sm font-medium text-foreground">
            {isDragging ? "Drop files here" : "Drag & drop or click to select"}
          </p>
          <p className="text-xs text-muted-foreground">
            PDF · Word · PowerPoint · Excel · Video (up to 500 MB each)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4,.webm,.mov,.avi"
            onChange={(e) => { stageFiles(e.target.files); e.target.value = ""; }}
          />
        </div>

        {/* Staged file list */}
        {staged.length > 0 && (
          <ul className="mt-4 space-y-2">
            {staged.map((s) => (
              <li
                key={s.key}
                className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <FileIcon
                  contentType={s.material?.contentType}
                  className={`h-4 w-4 shrink-0 ${s.status === "done" ? "text-primary" : "text-slate-400"}`}
                />

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{s.name}</p>
                  {s.status === "done" && s.material && (
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(s.material.fileSize)} · {s.material.contentType}
                    </p>
                  )}
                  {s.status === "queued" && (
                    <p className="text-xs text-muted-foreground">
                      {s.file ? formatBytes(s.file.size) : ""} · will upload on save
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {s.status === "queued" && (
                    <span title="Pending — will upload on save">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                    </span>
                  )}
                  {s.status === "done" && (
                    <span className="text-xs text-green-600 font-medium">✓</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeStaged(s.key)}
                    className="p-0.5 rounded text-slate-400 hover:text-red-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center justify-between">
        {isEdit ? (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete Lesson
          </button>
        ) : <span />}

        <button
          type="submit"
          form="lesson-form"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {isEdit ? "Save Changes" : "Add Lesson"}
        </button>
      </div>

      {isEdit && (
        <ConfirmDialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => deleteMut.mutate()}
          loading={deleteMut.isPending}
          title="Delete Lesson"
          message={`Delete "${lesson?.title}"? All attachments will also be removed.`}
          confirmLabel="Delete"
        />
      )}
    </div>
  );
}
