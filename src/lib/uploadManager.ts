/**
 * uploadManager — module-level singleton for background file uploads.
 *
 * Files are queued before the user navigates away from LessonForm.
 * The manager processes each job independently of React's lifecycle:
 * - uploads files one-by-one with real-time progress toasts
 * - saves the lesson after all files are uploaded
 * - fires an optional onSaved() callback for TanStack Query invalidation
 *
 * Toast lifecycle:
 * - Upload phase : blue "info" progress bar (never reaches 100 until lesson saved)
 * - Saving phase : blue "info", no progress bar, description "X files uploaded"
 * - SUCCESS      : green "success" — ONLY fires after the lesson is created/updated
 * - Upload error : red "error" + Retry (re-enqueues original job with all files)
 * - Save error   : red "error" + Retry (re-enqueues with already-uploaded IDs,
 *                  skips re-uploading files that already landed in storage)
 */

import { uploadsApi } from "@/api/uploads";
import { lessonsApi } from "@/api/lessons";
import { toast } from "@/lib/toast";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LessonPayload {
  /** null → create, string → update */
  lessonId: string | null;
  gradeLevelId: string;
  subjectId?: string;
  termId?: string;
  title: string;
  description?: string;
  isPublished?: boolean;
  /** Material IDs for attachments that are already uploaded (edit pre-fill) */
  existingMaterialIds: string[];
}

interface PendingFile {
  /** The actual browser File object */
  file: File;
  /** Display name */
  name: string;
}

export interface UploadJob {
  lessonPayload: LessonPayload;
  pendingFiles: PendingFile[];
  /** Called after the lesson is saved — use to invalidate TanStack Query cache */
  onSaved?: () => void;
}

// ── Internal job record (adds runtime state) ─────────────────────────────────

interface QueuedJob extends UploadJob {
  toastId: string;
}

// ── Manager class ─────────────────────────────────────────────────────────────

class UploadManager {
  private queue: QueuedJob[] = [];
  private processing = false;

  /**
   * Enqueue a new upload job. Returns immediately — caller should navigate away.
   * A progress toast is shown straight away so the user has immediate feedback.
   */
  enqueue(job: UploadJob): void {
    const fileCount = job.pendingFiles.length;
    const title =
      fileCount > 0
        ? `Uploading ${fileCount} file${fileCount > 1 ? "s" : ""}…`
        : `Saving "${job.lessonPayload.title}"…`;

    const toastId = toast.progress(title, job.lessonPayload.title);
    this.queue.push({ ...job, toastId });
    this.processNext();
  }

  private processNext(): void {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const job = this.queue[0];
    this.processJob(job)
      .catch(() => {
        // errors are handled inside processJob — nothing more to do here
      })
      .finally(() => {
        this.queue.shift();
        this.processing = false;
        this.processNext();
      });
  }

  private async processJob(job: QueuedJob): Promise<void> {
    const { lessonPayload, pendingFiles, toastId, onSaved } = job;
    const newMaterialIds: string[] = [];

    // ── 1. Upload files ─────────────────────────────────────────────────────
    //
    // The progress bar intentionally never hits 100% during this phase.
    // For intermediate files (1 of N) we show partial overall progress.
    // For the last file, we skip the "N of N done" update entirely and let
    // the "Saving…" state below take over — this ensures the user never sees
    // a full progress bar before the lesson is actually created.

    if (pendingFiles.length > 0) {
      const fileProgress: number[] = pendingFiles.map(() => 0);
      const computeOverall = () =>
        Math.round(fileProgress.reduce((a, b) => a + b, 0) / pendingFiles.length);

      const failed: string[] = [];

      for (let i = 0; i < pendingFiles.length; i++) {
        const item = pendingFiles[i];
        try {
          const res = await uploadsApi.upload(item.file, (pct) => {
            fileProgress[i] = pct;
            toast.update(toastId, {
              description: `${item.name} (${i + 1}/${pendingFiles.length})`,
              progress: computeOverall(),
            });
          });

          // The global response interceptor wraps everything in
          // { success, message, data: <service-return> }.
          // The uploads service returns the material object directly,
          // so res.data.data is the material.
          const material = res.data.data!;
          newMaterialIds.push(material.id);

          fileProgress[i] = 100; // internal bookkeeping

          // For intermediate files only — show "X of N uploaded" with partial progress.
          // Skip the update for the last file so we never show a full progress bar
          // before the lesson is saved; the "Saving…" update below handles that.
          const done = newMaterialIds.length;
          if (done < pendingFiles.length) {
            toast.update(toastId, {
              description: `${done} of ${pendingFiles.length} uploaded`,
              progress: computeOverall(),
            });
          }
        } catch (err: unknown) {
          const msg =
            (err as { response?: { data?: { message?: string } } })
              ?.response?.data?.message ?? "Upload failed";
          failed.push(`${item.name}: ${msg}`);
          fileProgress[i] = 0;
        }
      }

      if (failed.length > 0) {
        // Show error toast with a Retry button — re-enqueues the original job
        const originalJob: UploadJob = {
          lessonPayload: job.lessonPayload,
          pendingFiles: job.pendingFiles,
          onSaved: job.onSaved,
        };
        toast.update(toastId, {
          title: `${failed.length} file${failed.length > 1 ? "s" : ""} failed to upload`,
          description: failed[0],
          variant: "error",
          progress: undefined,
          persistent: true,
          action: {
            label: "Retry",
            onClick: () => {
              toast.dismiss(toastId);
              this.enqueue(originalJob);
            },
          },
        });
        return; // Don't save the lesson if any upload failed
      }
    }

    // ── 2. Save the lesson ──────────────────────────────────────────────────
    //
    // Only after this succeeds do we show the green success toast.

    toast.update(toastId, {
      title: `Saving "${lessonPayload.title}"…`,
      description:
        newMaterialIds.length > 0
          ? `${newMaterialIds.length} file${newMaterialIds.length !== 1 ? "s" : ""} uploaded`
          : undefined,
      progress: undefined, // no progress bar during save — avoids false "done" signal
    });

    const allMaterialIds = [
      ...lessonPayload.existingMaterialIds,
      ...newMaterialIds,
    ];

    try {
      if (lessonPayload.lessonId) {
        // Edit
        await lessonsApi.update(lessonPayload.lessonId, {
          title: lessonPayload.title,
          description: lessonPayload.description,
          subjectId: lessonPayload.subjectId,
          termId: lessonPayload.termId,
          isPublished: lessonPayload.isPublished,
          materialIds: allMaterialIds.length ? allMaterialIds : undefined,
        });
      } else {
        // Create
        await lessonsApi.create({
          gradeLevelId: lessonPayload.gradeLevelId,
          subjectId: lessonPayload.subjectId,
          termId: lessonPayload.termId,
          title: lessonPayload.title,
          description: lessonPayload.description,
          isPublished: lessonPayload.isPublished,
          materialIds: allMaterialIds.length ? allMaterialIds : undefined,
        });
      }

      // Notify caller to invalidate queries
      onSaved?.();

      // ✅ SUCCESS — only reached when the lesson is actually created/updated.
      // The green toast is the signal that the lesson (not just the files) was saved.
      const fileDesc =
        newMaterialIds.length > 0
          ? `${newMaterialIds.length} file${newMaterialIds.length !== 1 ? "s" : ""} attached`
          : undefined;

      toast.update(toastId, {
        title: lessonPayload.lessonId ? "Lesson updated!" : "Lesson created!",
        description: fileDesc,
        variant: "success",
        progress: undefined,
        persistent: false,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ?? "Failed to save lesson";

      // For a save failure, re-enqueue with only the files that haven't been
      // uploaded yet (the ones that did upload are now tracked as existing IDs).
      const retryJob: UploadJob = {
        lessonPayload: {
          ...job.lessonPayload,
          // Merge any newly uploaded material IDs into existing so we don't
          // re-upload files that already landed in storage.
          existingMaterialIds: [
            ...job.lessonPayload.existingMaterialIds,
            ...newMaterialIds,
          ],
        },
        // No pending files to re-upload — only the lesson save failed.
        pendingFiles: [],
        onSaved: job.onSaved,
      };

      toast.update(toastId, {
        title: "Failed to save lesson",
        description: msg,
        variant: "error",
        progress: undefined,
        persistent: true,
        action: {
          label: "Retry",
          onClick: () => {
            toast.dismiss(toastId);
            this.enqueue(retryJob);
          },
        },
      });
    }
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const uploadManager = new UploadManager();
