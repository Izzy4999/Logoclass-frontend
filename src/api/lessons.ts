import apiClient from "./client";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types/api";
import type { Lesson, LessonAttachment, LessonProgress } from "@/types/lesson";

export const lessonsApi = {
  list: (params?: PaginationParams & { gradeLevelId?: string; subjectId?: string; termId?: string }) =>
    apiClient.get<PaginatedResponse<Lesson>>("/lessons", { params }),

  create: (dto: {
    gradeLevelId: string;
    subjectId?: string;
    termId?: string;
    title: string;
    description?: string;
    isPublished?: boolean;
    materialIds?: string[];
  }) =>
    apiClient.post<ApiResponse<Lesson>>("/lessons", dto),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Lesson>>(`/lessons/${id}`),

  update: (id: string, dto: Partial<{
    title: string;
    description: string;
    subjectId: string;
    termId: string;
    isPublished: boolean;
    materialIds: string[];
  }>) =>
    apiClient.patch<ApiResponse<Lesson>>(`/lessons/${id}`, dto),

  togglePublish: (id: string) =>
    apiClient.patch<ApiResponse<Lesson>>(`/lessons/${id}/publish`),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/lessons/${id}`),

  // Attachments
  addAttachment: (lessonId: string, dto: Partial<LessonAttachment>) =>
    apiClient.post<ApiResponse<LessonAttachment>>(`/lessons/${lessonId}/attachments`, dto),

  updateAttachment: (lessonId: string, attachmentId: string, dto: Partial<LessonAttachment>) =>
    apiClient.patch<ApiResponse<LessonAttachment>>(`/lessons/${lessonId}/attachments/${attachmentId}`, dto),

  deleteAttachment: (lessonId: string, attachmentId: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/lessons/${lessonId}/attachments/${attachmentId}`),

  // Progress
  updateProgress: (lessonId: string, dto: Partial<LessonProgress>) =>
    apiClient.patch<ApiResponse<LessonProgress>>(`/lessons/${lessonId}/progress`, dto),

  getProgress: (lessonId: string) =>
    apiClient.get<ApiResponse<LessonProgress[]>>(`/lessons/${lessonId}/progress`),
};
