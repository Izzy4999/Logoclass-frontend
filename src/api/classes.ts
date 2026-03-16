import apiClient from "./client";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types/api";
import type { ClassSection, GradeLevel, Subject, AcademicYear, Term, StudentEnrollment, CourseEnrollment } from "@/types/class";

export const classesApi = {
  list: (params?: PaginationParams & { gradeLevelId?: string; teacherId?: string }) =>
    apiClient.get<PaginatedResponse<ClassSection>>("/classes", { params }),

  create: (dto: { name: string; section?: string; gradeLevelId: string; teacherId?: string }) =>
    apiClient.post<ApiResponse<ClassSection>>("/classes", dto),

  getById: (id: string) =>
    apiClient.get<ApiResponse<ClassSection>>(`/classes/${id}`),

  update: (id: string, dto: { name?: string; section?: string; gradeLevelId?: string; teacherId?: string }) =>
    apiClient.patch<ApiResponse<ClassSection>>(`/classes/${id}`, dto),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/classes/${id}`),
};

export const gradeLevelsApi = {
  list: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<GradeLevel>>("/grade-levels", { params }),

  create: (dto: { name: string; order: number; description?: string }) =>
    apiClient.post<ApiResponse<GradeLevel>>("/grade-levels", dto),

  getById: (id: string) =>
    apiClient.get<ApiResponse<GradeLevel>>(`/grade-levels/${id}`),

  update: (id: string, dto: { name?: string; order?: number; description?: string }) =>
    apiClient.patch<ApiResponse<GradeLevel>>(`/grade-levels/${id}`, dto),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/grade-levels/${id}`),
};

export const subjectsApi = {
  list: (params?: PaginationParams & { gradeLevelId?: string }) =>
    apiClient.get<PaginatedResponse<Subject>>("/subjects", { params }),

  create: (dto: { name: string; code?: string; description?: string; gradeLevelId?: string }) =>
    apiClient.post<ApiResponse<Subject>>("/subjects", dto),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Subject>>(`/subjects/${id}`),

  update: (id: string, dto: { name?: string; code?: string; description?: string }) =>
    apiClient.patch<ApiResponse<Subject>>(`/subjects/${id}`, dto),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/subjects/${id}`),
};

export const academicYearsApi = {
  list: (params?: PaginationParams & { isCurrent?: boolean }) =>
    apiClient.get<PaginatedResponse<AcademicYear>>("/academic-years", { params }),

  create: (dto: { name: string; startDate: string; endDate: string; isCurrent?: boolean }) =>
    apiClient.post<ApiResponse<AcademicYear>>("/academic-years", dto),

  getById: (id: string) =>
    apiClient.get<ApiResponse<AcademicYear>>(`/academic-years/${id}`),

  update: (id: string, dto: Partial<{ name: string; startDate: string; endDate: string; isCurrent: boolean }>) =>
    apiClient.patch<ApiResponse<AcademicYear>>(`/academic-years/${id}`, dto),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/academic-years/${id}`),

  setCurrent: (id: string) =>
    apiClient.patch<ApiResponse<AcademicYear>>(`/academic-years/${id}/set-current`),

  // Terms
  listTerms: (yearId: string) =>
    apiClient.get<ApiResponse<Term[]>>(`/academic-years/${yearId}/terms`),

  createTerm: (yearId: string, dto: { name: string; order: number; startDate: string; endDate: string; isCurrent?: boolean }) =>
    apiClient.post<ApiResponse<Term>>(`/academic-years/${yearId}/terms`, dto),

  updateTerm: (yearId: string, termId: string, dto: Partial<{ name: string; startDate: string; endDate: string; isCurrent: boolean }>) =>
    apiClient.patch<ApiResponse<Term>>(`/academic-years/${yearId}/terms/${termId}`, dto),

  deleteTerm: (yearId: string, termId: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/academic-years/${yearId}/terms/${termId}`),

  setCurrentTerm: (yearId: string, termId: string) =>
    apiClient.patch<ApiResponse<Term>>(`/academic-years/${yearId}/terms/${termId}/set-current`),
};

export const enrollmentsApi = {
  list: (params?: PaginationParams & { academicYearId?: string; gradeLevelId?: string; classId?: string; studentId?: string; status?: string }) =>
    apiClient.get<PaginatedResponse<StudentEnrollment>>("/enrollments", { params }),

  create: (dto: { studentId: string; gradeLevelId: string; classSectionId?: string; academicYearId: string }) =>
    apiClient.post<ApiResponse<StudentEnrollment>>("/enrollments", dto),

  getById: (id: string) =>
    apiClient.get<ApiResponse<StudentEnrollment>>(`/enrollments/${id}`),

  update: (id: string, dto: { status?: string; classSectionId?: string; note?: string }) =>
    apiClient.patch<ApiResponse<StudentEnrollment>>(`/enrollments/${id}`, dto),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/enrollments/${id}`),
};

export const courseEnrollmentsApi = {
  list: (params?: PaginationParams & { academicYearId?: string; studentId?: string; subjectId?: string; status?: string }) =>
    apiClient.get<PaginatedResponse<CourseEnrollment>>("/course-enrollments", { params }),

  create: (dto: { studentId: string; subjectId: string; academicYearId: string; termId?: string }) =>
    apiClient.post<ApiResponse<CourseEnrollment>>("/course-enrollments", dto),

  getById: (id: string) =>
    apiClient.get<ApiResponse<CourseEnrollment>>(`/course-enrollments/${id}`),

  update: (id: string, dto: { score?: number; grade?: string; status?: string; isCarryover?: boolean }) =>
    apiClient.patch<ApiResponse<CourseEnrollment>>(`/course-enrollments/${id}`, dto),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/course-enrollments/${id}`),
};
