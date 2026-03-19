import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2, ArrowLeft, Trash2, UploadCloud, X, FileText,
  Film, FileSpreadsheet, File, Clock,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { lessonsApi } from "@/api/lessons";
import { uploadsApi } from "@/api/uploads";
import type { Material } from "@/api/uploads";
import { classesApi, academicYearsApi, subjectsApi } from "@/api/classes";
import type { ClassSection, Term, AcademicYear } from "@/types/class";
import { toast } from "@/lib/toast";

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
  const [serverError, setServerError] = useState("");
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  // ── Upload all queued files then save the lesson ──────────────────────────

  const createMut = useMutation({
    mutationFn: (args: { data: FormData; materialIds: string[] }) =>
      lessonsApi.create({
        classId: args.data.classId,
        subjectId: args.data.subjectId || undefined,
        termId: args.data.termId || undefined,
        title: args.data.title,
        description: args.data.description || undefined,
        order: args.data.order,
        isPublished: args.data.isPublished,
        materialIds: args.materialIds.length ? args.materialIds : undefined,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lessons"] }); navigate("/lessons"); },
  });

  const updateMut = useMutation({
    mutationFn: (args: { data: FormData; materialIds: string[] }) =>
      lessonsApi.update(id!, {
        title: args.data.title,
        description: args.data.description || undefined,
        subjectId: args.data.subjectId || undefined,
        termId: args.data.termId || undefined,
        order: args.data.order,
        materialIds: args.materialIds.length ? args.materialIds : undefined,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lessons"] }); navigate("/lessons"); },
  });

  const deleteMut = useMutation({
    mutationFn: () => lessonsApi.delete(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lessons"] }); navigate("/lessons"); },
  });

  const onSubmit = async (data: FormData) => {
    setServerError("");
    setIsSaving(true);

    // Already-done material IDs (from edit pre-fill)
    const doneMaterialIds = staged
      .filter((s) => s.status === "done" && s.material?.id)
      .map((s) => s.material!.id);

    // Files that need to be uploaded now
    const queued = staged.filter((s) => s.status === "queued" && s.file);

    // ── Upload queued files with progress toast ──────────────────────────
    const newMaterialIds: string[] = [];

    if (queued.length > 0) {
      const toastId = toast.progress(
        `Uploading ${queued.length} file${queued.length > 1 ? "s" : ""}…`,
      );

      let completed = 0;
      // Per-file progress accumulator for overall %
      const fileProgress: number[] = queued.map(() => 0);

      const computeOverall = () =>
        Math.round(fileProgress.reduce((a, b) => a + b, 0) / queued.length);

      const failed: string[] = [];

      // Upload files one-at-a-time to avoid overwhelming the connection
      for (let i = 0; i < queued.length; i++) {
        const item = queued[i];
        try {
          const res = await uploadsApi.upload(item.file!, (pct) => {
            fileProgress[i] = pct;
            toast.update(toastId, {
              description: `${item.name}`,
              progress: computeOverall(),
            });
          });
          const material = res.data.data!;
          newMaterialIds.push(material.id);
          // Mark done in staged list
          setStaged((prev) =>
            prev.map((s) => s.key === item.key ? { ...s, status: "done", material } : s),
          );
          fileProgress[i] = 100;
          completed++;
          toast.update(toastId, {
            description: `${completed} of ${queued.length} done`,
            progress: computeOverall(),
          });
        } catch (err: unknown) {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            "Upload failed";
          failed.push(`${item.name}: ${msg}`);
          fileProgress[i] = 0;
        }
      }

      if (failed.length > 0) {
        // Some files failed — show error toast (persistent so user sees it)
        toast.update(toastId, {
          title: `${failed.length} file${failed.length > 1 ? "s" : ""} failed to upload`,
          description: failed[0],
          variant: "error",
          progress: undefined,
          persistent: true,
        });
        setIsSaving(false);
        return; // Don't save the lesson if any upload failed
      }

      // All uploaded — transition to success and auto-dismiss
      toast.update(toastId, {
        title: `${queued.length} file${queued.length > 1 ? "s" : ""} uploaded`,
        description: undefined,
        variant: "success",
        progress: undefined,
        persistent: false,
      });
    }

    // ── Save the lesson ──────────────────────────────────────────────────
    const allMaterialIds = [...doneMaterialIds, ...newMaterialIds];
    try {
      if (isEdit) await updateMut.mutateAsync({ data, materialIds: allMaterialIds });
      else await createMut.mutateAsync({ data, materialIds: allMaterialIds });
    } catch (err: unknown) {
      setServerError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to save lesson",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const isPending = isSaving || createMut.isPending || updateMut.isPending;

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

      {/* ── Materials ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1">Materials</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Add files below. They will upload when you click Save — you'll see progress in the top-right corner.
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
                    disabled={isPending}
                    onClick={() => removeStaged(s.key)}
                    className="p-0.5 rounded text-slate-400 hover:text-red-500 disabled:pointer-events-none"
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
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
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
