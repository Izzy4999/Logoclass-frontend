export type ContentType = "VIDEO" | "PDF" | "DOCUMENT" | "SPREADSHEET" | "PRESENTATION" | "LINK" | "OTHER";
export type VideoProvider = "MUX" | "S3" | "R2";

export interface LessonAttachment {
  id: string;
  lessonId: string;
  title: string | null;
  contentType: ContentType;
  contentUrl: string;
  mimeType: string | null;
  fileSize: number | null;
  duration: number | null;
  totalPages: number | null;
  videoProvider: VideoProvider | null;
  muxAssetId: string | null;
  order: number;
}

export interface LessonProgress {
  lessonId: string;
  studentId?: string;
  student?: { id: string; firstName: string; lastName: string };
  watchedSeconds: number;
  currentPage: number;
  progressPct: number;
  completed: boolean;
  lastAccessedAt: string;
}

export interface Lesson {
  id: string;
  classId: string;
  termId: string | null;
  title: string;
  description: string | null;
  isPublished: boolean;
  order: number;
  attachments?: LessonAttachment[];
  attachmentCount?: number;
  quiz?: { id: string; title: string; timeLimit: number | null; questionCount: number } | null;
  createdAt: string;
}
