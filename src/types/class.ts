export interface GradeLevel {
  id: string;
  name: string;
  order: number;
  description?: string | null;
  classCount?: number;
}

export interface ClassSection {
  id: string;
  name: string;
  section: string | null;
  gradeLevel: GradeLevel;
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export interface Subject {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  gradeLevel: GradeLevel | null;
  enrollmentCount?: number;
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  termCount?: number;
}

export interface Term {
  id: string;
  academicYearId: string;
  name: string;
  order: number;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface StudentEnrollment {
  id: string;
  student: { id: string; firstName: string; lastName: string };
  gradeLevel: GradeLevel;
  classSection: ClassSection | null;
  academicYear: AcademicYear;
  status: "ENROLLED" | "PROMOTED" | "REPEATED" | "GRADUATED" | "TRANSFERRED" | "WITHDRAWN";
  promotedAt: string | null;
  note: string | null;
}

export interface CourseEnrollment {
  id: string;
  student: { id: string; firstName: string; lastName: string };
  subject: Subject;
  academicYear: AcademicYear;
  term: Term | null;
  score: number | null;
  grade: string | null;
  isCarryover: boolean;
  status: "IN_PROGRESS" | "PASSED" | "FAILED" | "CARRYOVER";
}
