import apiClient from "./client";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types/api";
import type { Assignment, AssignmentSubmission } from "@/types/assignment";

export const assignmentsApi = {
  list: (params?: PaginationParams & { classId?: string; status?: string }) =>
    apiClient.get<PaginatedResponse<Assignment>>("/assignments", { params }),

  create: (dto: { classId: string; lessonId?: string; termId?: string; title: string; description?: string; dueDate?: string; totalMarks?: number; status?: string }) =>
    apiClient.post<ApiResponse<Assignment>>("/assignments", dto),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Assignment>>(`/assignments/${id}`),

  update: (id: string, dto: Partial<{ title: string; description: string; dueDate: string; totalMarks: number; status: string }>) =>
    apiClient.patch<ApiResponse<Assignment>>(`/assignments/${id}`, dto),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/assignments/${id}`),

  // Submissions
  submit: (assignmentId: string, dto: { studentId: string; fileUrls: string[] }) =>
    apiClient.post<ApiResponse<AssignmentSubmission>>(`/assignments/${assignmentId}/submissions`, dto),

  listSubmissions: (assignmentId: string) =>
    apiClient.get<ApiResponse<AssignmentSubmission[]>>(`/assignments/${assignmentId}/submissions`),

  getSubmission: (assignmentId: string, submissionId: string) =>
    apiClient.get<ApiResponse<AssignmentSubmission>>(`/assignments/${assignmentId}/submissions/${submissionId}`),

  grade: (assignmentId: string, submissionId: string, dto: { grade: number; feedback?: string }) =>
    apiClient.patch<ApiResponse<AssignmentSubmission>>(`/assignments/${assignmentId}/submissions/${submissionId}/grade`, dto),

  deleteSubmission: (assignmentId: string, submissionId: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/assignments/${assignmentId}/submissions/${submissionId}`),
};
