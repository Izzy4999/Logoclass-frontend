export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
export type AttendanceType = "CLASS" | "DAILY";

export interface AttendanceRecord {
  id: string;
  type: AttendanceType;
  class: { id: string; name: string } | null;
  student?: { id: string; firstName: string; lastName: string };
  status: AttendanceStatus;
  date: string;
  note: string | null;
  markedAt: string;
}

export interface AttendanceSummary {
  studentId: string;
  period: { from: string; to: string };
  totalDays: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendancePercentage: number;
}
