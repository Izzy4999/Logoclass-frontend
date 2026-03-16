import apiClient from "./client";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types/api";
import type { AttendanceRecord, AttendanceSummary } from "@/types/attendance";

export const attendanceApi = {
  markBulk: (dto: { classId: string; date: string; termId?: string; records: { studentId: string; status: string; note?: string }[] }) =>
    apiClient.post<ApiResponse<{ recordCount: number; presentCount: number; absentCount: number }>>("/attendance/bulk", dto),

  markDaily: (dto: { date: string; termId?: string; records: { studentId: string; status: string }[] }) =>
    apiClient.post<ApiResponse<{ recordCount: number; presentCount: number }>>("/attendance/daily", dto),

  getMy: (params?: PaginationParams & { fromDate?: string; toDate?: string; classId?: string; status?: string }) =>
    apiClient.get<PaginatedResponse<AttendanceRecord>>("/attendance/my", { params }),

  getSummary: (studentId: string, params?: { fromDate?: string; toDate?: string }) =>
    apiClient.get<ApiResponse<AttendanceSummary>>(`/attendance/summary/${studentId}`, { params }),

  list: (params?: PaginationParams & { classId?: string; studentId?: string; fromDate?: string; status?: string }) =>
    apiClient.get<PaginatedResponse<AttendanceRecord>>("/attendance", { params }),

  listForClass: (classId: string, params?: PaginationParams & { date?: string }) =>
    apiClient.get<PaginatedResponse<AttendanceRecord>>(`/attendance/class/${classId}`, { params }),

  update: (id: string, dto: { status: string; note?: string }) =>
    apiClient.patch<ApiResponse<AttendanceRecord>>(`/attendance/${id}`, dto),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/attendance/${id}`),
};
