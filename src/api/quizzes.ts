import apiClient from "./client";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types/api";
import type { Quiz, QuizQuestion, QuizAttempt } from "@/types/quiz";

export const quizzesApi = {
  list: (params?: PaginationParams & { lessonId?: string }) =>
    apiClient.get<PaginatedResponse<Quiz>>("/quizzes", { params }),

  create: (dto: { lessonId: string; title: string; timeLimit?: number; questions?: Partial<QuizQuestion>[] }) =>
    apiClient.post<ApiResponse<Quiz>>("/quizzes", dto),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Quiz>>(`/quizzes/${id}`),

  update: (id: string, dto: Partial<{ title: string; timeLimit: number }>) =>
    apiClient.patch<ApiResponse<Quiz>>(`/quizzes/${id}`, dto),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/quizzes/${id}`),

  // Questions
  addQuestion: (quizId: string, dto: Partial<QuizQuestion>) =>
    apiClient.post<ApiResponse<QuizQuestion>>(`/quizzes/${quizId}/questions`, dto),

  updateQuestion: (quizId: string, questionId: string, dto: Partial<QuizQuestion>) =>
    apiClient.patch<ApiResponse<QuizQuestion>>(`/quizzes/${quizId}/questions/${questionId}`, dto),

  deleteQuestion: (quizId: string, questionId: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/quizzes/${quizId}/questions/${questionId}`),

  // Attempts
  submitAttempt: (quizId: string, answers: Record<string, string>) =>
    apiClient.post<ApiResponse<QuizAttempt>>(`/quizzes/${quizId}/attempts`, { answers }),

  listAttempts: (quizId: string) =>
    apiClient.get<ApiResponse<QuizAttempt[]>>(`/quizzes/${quizId}/attempts`),

  getAttempt: (quizId: string, attemptId: string) =>
    apiClient.get<ApiResponse<QuizAttempt>>(`/quizzes/${quizId}/attempts/${attemptId}`),
};
