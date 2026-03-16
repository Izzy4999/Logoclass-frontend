import apiClient from "./client";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types/api";
import type { Exam, ExamQuestion, ExamAttempt } from "@/types/exam";

export const examsApi = {
  list: (params?: PaginationParams & { classId?: string; status?: string }) =>
    apiClient.get<PaginatedResponse<Exam>>("/exams", { params }),

  create: (dto: Partial<Exam>) =>
    apiClient.post<ApiResponse<Exam>>("/exams", dto),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Exam>>(`/exams/${id}`),

  update: (id: string, dto: Partial<Exam>) =>
    apiClient.patch<ApiResponse<Exam>>(`/exams/${id}`, dto),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/exams/${id}`),

  updateStatus: (id: string, status: string) =>
    apiClient.patch<ApiResponse<Exam>>(`/exams/${id}/status`, { status }),

  setQuestions: (id: string, questions: Partial<ExamQuestion>[]) =>
    apiClient.post<ApiResponse<{ questionCount: number; totalMarks: number }>>(`/exams/${id}/questions`, { questions }),

  addParticipants: (id: string, studentIds: string[]) =>
    apiClient.post<ApiResponse<{ participantCount: number }>>(`/exams/${id}/participants`, { studentIds }),

  listParticipants: (id: string) =>
    apiClient.get<ApiResponse<Exam["participants"]>>(`/exams/${id}/participants`),

  join: (id: string) =>
    apiClient.post<ApiResponse<{ token: string; url: string; roomName: string }>>(`/exams/${id}/join`),

  submitAttempt: (id: string, answers: Record<string, string>) =>
    apiClient.post<ApiResponse<ExamAttempt>>(`/exams/${id}/attempt`, { answers }),

  getMyAttempt: (id: string) =>
    apiClient.get<ApiResponse<ExamAttempt>>(`/exams/${id}/my-attempt`),

  listAttempts: (id: string) =>
    apiClient.get<ApiResponse<ExamAttempt[]>>(`/exams/${id}/attempts`),

  gradeAttempt: (examId: string, attemptId: string, dto: { manualScore: number; teacherNotes?: string }) =>
    apiClient.patch<ApiResponse<ExamAttempt>>(`/exams/${examId}/attempts/${attemptId}/grade`, dto),
};
