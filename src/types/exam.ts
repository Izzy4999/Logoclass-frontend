export type ExamStatus = "DRAFT" | "SCHEDULED" | "WAITING" | "LIVE" | "GRADING" | "PUBLISHED" | "CANCELLED";

export interface ExamQuestion {
  id: string;
  examId: string;
  type: "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER";
  question: string;
  options: string[] | null;
  answer: string;
  marks: number;
  order: number;
}

export interface ExamParticipant {
  id: string;
  student: { id: string; firstName: string; lastName: string };
  status: "PRESENT" | "ABSENT" | "SUBMITTED";
  joinedRoomAt: string | null;
}

export interface Exam {
  id: string;
  classId: string | null;
  termId: string | null;
  title: string;
  description: string | null;
  instructions: string | null;
  totalMarks: number;
  passMark: number | null;
  duration: number;
  scheduledAt: string;
  roomOpenMinutesBefore: number;
  isMakeup: boolean;
  randomiseQuestions: boolean;
  randomiseOptions: boolean;
  publishResults: boolean;
  status: ExamStatus;
  startedAt: string | null;
  endedAt: string | null;
  participantCount?: number;
  questionCount?: number;
  questions?: ExamQuestion[];
  participants?: ExamParticipant[];
}

export interface ExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  answers: Record<string, string>;
  autoScore: number;
  manualScore: number | null;
  totalScore: number;
  status: "SUBMITTED" | "GRADED";
  submittedAt: string;
  gradedAt: string | null;
  teacherNotes: string | null;
}
