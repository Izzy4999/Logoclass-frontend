import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { quizzesApi } from "@/api/quizzes";
import type { Quiz } from "@/types/quiz";

export default function QuizzesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["quizzes"],
    queryFn: () => quizzesApi.list(),
  });

  const quizzes: Quiz[] = data?.data?.data ?? [];

  return (
    <div className="p-6">
      <PageHeader
        title="Quizzes"
        description="Manage quizzes attached to lessons"
        action={
          <Link
            to="new"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90"
          >
            + Create Quiz
          </Link>
        }
      />

      {isLoading && <LoadingSpinner />}

      {!isLoading && quizzes.length === 0 && (
        <EmptyState title="No quizzes found" description="Create a quiz and attach it to a lesson." />
      )}

      {!isLoading && quizzes.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Lesson</th>
                <th className="px-4 py-3 text-left font-medium">Time Limit (min)</th>
                <th className="px-4 py-3 text-left font-medium">Questions</th>
                <th className="px-4 py-3 text-left font-medium">Total Marks</th>
                <th className="px-4 py-3 text-left font-medium">Attempts</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {quizzes.map((quiz) => (
                <tr key={quiz.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{quiz.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{quiz.lesson?.title ?? quiz.lessonId}</td>
                  <td className="px-4 py-3">{quiz.timeLimit ?? "Unlimited"}</td>
                  <td className="px-4 py-3">{quiz.questionCount ?? 0}</td>
                  <td className="px-4 py-3">{quiz.totalMarks ?? 0}</td>
                  <td className="px-4 py-3">{quiz.attemptCount ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
