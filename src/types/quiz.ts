export type QuestionType = "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER";

export interface QuizQuestion {
  id: string;
  quizId: string;
  type: QuestionType;
  question: string;
  options: string[] | null;
  answer: string;
  marks: number;
  order: number;
}

export interface Quiz {
  id: string;
  lessonId: string;
  title: string;
  timeLimit: number | null;
  questionCount?: number;
  totalMarks?: number;
  attemptCount?: number;
  questions?: QuizQuestion[];
  lesson?: { id: string; title: string };
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  student: { id: string; firstName: string; lastName: string };
  answers: Record<string, string>;
  score: number;
  total: number;
  percentage: number;
  submittedAt: string;
}
