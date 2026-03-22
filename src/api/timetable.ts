import apiClient from "./client";
import type { ApiResponse } from "@/types/api";

export type DayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";

export interface TimetableEntry {
  id: string;
  tenantId: string;
  academicYearId: string;
  termId: string;
  gradeLevelId: string | null;
  classId: string | null;
  subjectId: string;
  teacherId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  periodLabel: string | null;
  subject: { id: string; name: string; code?: string };
  teacher: { id: string; firstName: string; lastName: string };
  gradeLevel: { id: string; name: string } | null;
  class: { id: string; name: string } | null;
}

export interface CreateTimetableDto {
  termId: string;
  academicYearId: string;
  gradeLevelId?: string;
  classId?: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  periodLabel?: string;
}

export interface CloneTimetableDto {
  sourceTermId: string;
  targetTermId: string;
  targetAcademicYearId: string;
  gradeLevelId?: string;
  classId?: string;
}

export const timetableApi = {
  forClass: (classId: string, termId: string) =>
    apiClient.get<ApiResponse<TimetableEntry[]>>(`/timetable/class/${classId}`, {
      params: { termId },
    }),

  forGrade: (gradeLevelId: string, termId: string) =>
    apiClient.get<ApiResponse<TimetableEntry[]>>(`/timetable/grade/${gradeLevelId}`, {
      params: { termId },
    }),

  forTeacher: (teacherId: string, termId: string) =>
    apiClient.get<ApiResponse<TimetableEntry[]>>(`/timetable/teacher/${teacherId}`, {
      params: { termId },
    }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<TimetableEntry>>(`/timetable/${id}`),

  create: (dto: CreateTimetableDto) =>
    apiClient.post<ApiResponse<TimetableEntry>>("/timetable", dto),

  update: (id: string, dto: Partial<CreateTimetableDto>) =>
    apiClient.patch<ApiResponse<TimetableEntry>>(`/timetable/${id}`, dto),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/timetable/${id}`),

  clone: (dto: CloneTimetableDto) =>
    apiClient.post<ApiResponse<{ cloned: number; message: string }>>("/timetable/clone", dto),
};
