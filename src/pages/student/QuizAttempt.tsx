import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { quizzesApi } from "@/api/quizzes";
import type { QuizQuestion } from "@/types/quiz";

export default function QuizAttempt() {
  const { id } = useParams<{ id: string }>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["quizzes", id],
    queryFn: () => quizzesApi.getById(id!),
    enabled: !!id,
  });

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => quizzesApi.submitAttempt(id!, answers),
    onSuccess: () => setSubmitted(true),
  });

  const quiz = data?.data?.data;
  const questions: QuizQuestion[] = quiz?.questions ?? [];
  const current: QuizQuestion | undefined = questions[currentIndex];

  if (isLoading) return <LoadingSpinner />;
  if (!quiz) return <div className="p-6"><p className="text-muted-foreground">Quiz not found.</p></div>;

  if (submitted) {
    return (
      <div className="p-6 max-w-lg text-center">
        <div className="rounded-lg border p-10">
          <div className="text-5xl mb-4">&#10003;</div>
          <h2 className="text-xl font-semibold mb-2">Quiz Submitted!</h2>
          <p className="text-muted-foreground text-sm mb-4">Your answers have been submitted successfully.</p>
          <Link to=".." className="text-primary hover:underline text-sm">Back to Quizzes</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title={quiz.title}
        description={`Question ${currentIndex + 1} of ${questions.length}`}
        action={<Link to=".." className="text-sm text-muted-foreground hover:text-foreground">Exit</Link>}
      />

      {questions.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          This quiz has no questions yet.
        </div>
      ) : current ? (
        <div className="rounded-lg border p-6 space-y-4">
          <p className="font-medium text-base">{current.question}</p>
          <p className="text-xs text-muted-foreground">{current.marks} mark(s)</p>

          <div className="space-y-2">
            {current.options?.map((option, i) => (
              <label
                key={i}
                className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                  answers[current.id] === option
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/40"
                }`}
              >
                <input
                  type="radio"
                  name={current.id}
                  value={option}
                  checked={answers[current.id] === option}
                  onChange={() => setAnswers((prev) => ({ ...prev, [current.id]: option }))}
                  className="accent-primary"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}

            {!current.options && (
              <input
                type="text"
                placeholder="Your answer..."
                value={answers[current.id] ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [current.id]: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setCurrentIndex((i) => i - 1)}
              disabled={currentIndex === 0}
              className="px-4 py-2 text-sm border rounded-md hover:bg-muted disabled:opacity-40"
            >
              Previous
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((i) => i + 1)}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => submit()}
                disabled={isPending}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60"
              >
                {isPending ? "Submitting…" : "Submit Quiz"}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
