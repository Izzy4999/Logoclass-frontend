import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2, ArrowLeft, Trash2, UploadCloud, X, FileText,
  Film, FileSpreadsheet, File,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { lessonsApi } from "@/api/lessons";
import { uploadsApi } from "@/api/uploads";
import type { Material } from "@/api/uploads";
import { classesApi, academicYearsApi, subjectsApi } from "@/api/classes";
import type { ClassSection, Term, AcademicYear } from "@/types/class";

// ── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  classId: z.string().min(1, "Class is required"),
  subjectId: z.string().optional(),
  termId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  order: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function FileIcon({ contentType, className }: { contentType: string; className?: string }) {
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

// ── Upload item state ─────────────────────────────────────────────────────────

interface UploadItem {
  file: File;
  progress: number;
  status: "uploading" | "done" | "error";
  material?: Material;
  error?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function LessonForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [serverError, setServerError] = useState("");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isPublished: false, order: 0 },
  });

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: lessonData, isLoading: lessonLoading } = useQuery({
    queryKey: ["lessons", id],
    queryFn: () => lessonsApi.getById(id!),
    enabled: isEdit,
  });
  const lesson = lessonData?.data?.data;

  const { data: classesData } = useQuery({
    queryKey: ["classes", { limit: 100 }],
    queryFn: () => classesApi.list({ limit: 100 }),
  });
  const classes: ClassSection[] = classesData?.data?.data ?? [];

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
        classId: (lesson as any).class?.id ?? (lesson as any).classId ?? "",
        subjectId: (lesson as any).subject?.id ?? (lesson as any).subjectId ?? "",
        termId: (lesson as any).term?.id ?? (lesson as any).termId ?? "",
        title: lesson.title,
        description: lesson.description ?? "",
        order: lesson.order,
        isPublished: lesson.isPublished,
      });

      if ((lesson as any).attachments?.length) {
        setUploads(
          (lesson as any).attachments.map((a: any) => ({
            file: { name: a.title ?? a.originalName ?? "attachment" } as File,
            progress: 100,
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

  // ── Upload logic ───────────────────────────────────────────────────────────

  const uploadFile = useCallback(async (file: File) => {
    setUploads((prev) => [...prev, { file, progress: 0, status: "uploading" }]);

    try {
      const res = await uploadsApi.upload(file, (pct) => {
        setUploads((prev) =>
          prev.map((u) =>
            u.file === file && u.status === "uploading" ? { ...u, progress: pct } : u,
          ),
        );
      });
      const material = res.data.data!;
      setUploads((prev) =>
        prev.map((u) =>
          u.file === file && u.status === "uploading"
            ? { ...u, progress: 100, status: "done", material }
            : u,
        ),
      );
    } catch {
      setUploads((prev) =>
        prev.map((u) =>
          u.file === file && u.status === "uploading"
            ? { ...u, status: "error", error: "Upload failed" }
            : u,
        ),
      );
    }
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      Array.from(files).forEach(uploadFile);
    },
    [uploadFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  // ── Mutations ──────────────────────────────────────────────────────────────

  const doneMaterialIds = uploads
    .filter((u) => u.status === "done" && u.material?.id)
    .map((u) => u.material!.id);

  const createMut = useMutation({
    mutationFn: (data: FormData) =>
      lessonsApi.create({
        classId: data.classId,
        subjectId: data.subjectId || undefined,
        termId: data.termId || undefined,
        title: data.title,
        description: data.description || undefined,
        order: data.order,
        isPublished: data.isPublished,
        materialIds: doneMaterialIds.length ? doneMaterialIds : undefined,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lessons"] }); navigate("/lessons"); },
    onError: (e: unknown) =>
      setServerError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create lesson",
      ),
  });

  const updateMut = useMutation({
    mutationFn: (data: FormData) =>
      lessonsApi.update(id!, {
        title: data.title,
        description: data.description || undefined,
        subjectId: data.subjectId || undefined,
        termId: data.termId || undefined,
        order: data.order,
        materialIds: doneMaterialIds.length ? doneMaterialIds : undefined,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lessons"] }); navigate("/lessons"); },
    onError: (e: unknown) =>
      setServerError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update lesson",
      ),
  });

  const deleteMut = useMutation({
    mutationFn: () => lessonsApi.delete(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lessons"] }); navigate("/lessons"); },
  });

  const onSubmit = (data: FormData) => {
    if (uploads.some((u) => u.status === "uploading")) {
      setServerError("Please wait for all uploads to finish before saving.");
      return;
    }
    setServerError("");
    if (isEdit) updateMut.mutate(data);
    else createMut.mutate(data);
  };

  const isPending = createMut.isPending || updateMut.isPending;
  const hasUploading = uploads.some((u) => u.status === "uploading");

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

        {serverError && (
          <p className="mb-4 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>
        )}

        <form id="lesson-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Class *</label>
              <select
                {...register("classId")}
                disabled={isEdit}
                className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white ${
                  errors.classId ? "border-destructive" : "border-slate-200"
                } ${isEdit ? "opacity-60 cursor-not-allowed" : ""}`}
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

          <div className="grid grid-cols-2 gap-4">
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
              <label className="text-xs font-medium text-muted-foreground">Order</label>
              <input
                type="number"
                {...register("order", { valueAsNumber: true })}
                min={0}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
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

          {!isEdit && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" {...register("isPublished")} className="h-4 w-4 rounded border-slate-300" />
              <span className="font-medium text-foreground">Publish immediately</span>
            </label>
          )}
        </form>
      </div>

      {/* ── Materials upload ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1">Materials</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Upload PDFs, videos, Word docs, PowerPoints, spreadsheets (up to 500 MB each).
          Files upload immediately to Supabase S3 — IDs are attached to the lesson when you save.
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
            {isDragging ? "Drop files here" : "Drag & drop or click to upload"}
          </p>
          <p className="text-xs text-muted-foreground">
            PDF · Word · PowerPoint · Excel · Video
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4,.webm,.mov,.avi"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Upload list */}
        {uploads.length > 0 && (
          <ul className="mt-4 space-y-2">
            {uploads.map((u, i) => (
              <li
                key={i}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                  u.status === "error"
                    ? "bg-red-50 border-red-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <FileIcon
                  contentType={u.material?.contentType ?? "OTHER"}
                  className={`h-4 w-4 shrink-0 ${u.status === "done" ? "text-primary" : "text-slate-400"}`}
                />

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {u.material?.originalName ?? u.file.name}
                  </p>

                  {u.status === "uploading" && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${u.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{u.progress}%</span>
                    </div>
                  )}

                  {u.status === "done" && u.material && (
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(u.material.fileSize)} · {u.material.contentType}
                    </p>
                  )}

                  {u.status === "error" && (
                    <p className="text-xs text-red-500">{u.error}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {u.status === "uploading" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                  {u.status === "done" && <span className="text-xs text-green-600 font-medium">✓</span>}
                  {u.status === "error" && <span className="text-xs text-red-500 font-medium">✗</span>}
                  <button
                    type="button"
                    onClick={() => setUploads((prev) => prev.filter((_, idx) => idx !== i))}
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
          disabled={isPending || hasUploading}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {hasUploading ? "Uploading files…" : isEdit ? "Save Changes" : "Add Lesson"}
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
