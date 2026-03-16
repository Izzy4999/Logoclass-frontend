export type AssignmentStatus = "DRAFT" | "PUBLISHED" | "CLOSED";
export type SubmissionStatus = "SUBMITTED" | "GRADED";

export interface Assignment {
  id: string;
  title: string;
  description: string | null;
  classId: string;
  lessonId: string | null;
  termId: string | null;
  dueDate: string | null;
  totalMarks: number | null;
  status: AssignmentStatus;
  submissionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  student: { id: string; firstName: string; lastName: string };
  fileUrls: string[];
  grade: number | null;
  feedback: string | null;
  status: SubmissionStatus;
  submittedAt: string;
  gradedAt: string | null;
}
