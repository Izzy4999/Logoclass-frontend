import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Edit2, Trash2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { quizzesApi } from "@/api/quizzes";
import type { Quiz } from "@/types/quiz";

export default function QuizzesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Quiz | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["quizzes"],
    queryFn: () => quizzesApi.list(),
  });

  const quizzes: Quiz[] = data?.data?.data ?? [];

  const deleteMut = useMutation({
    mutationFn: (id: string) => quizzesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quizzes"] }); setDeleteTarget(null); },
  });

  return (
    <div className="p-6">
      <PageHeader
        title="Quizzes"
        description="Manage quizzes attached to lessons"
        action={
          <Link to="new" className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90">
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
                <th className="px-4 py-3 text-left font-medium">Actions</th>
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
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`${quiz.id}/edit`)} className="p-1 rounded text-muted-foreground hover:bg-slate-100" title="Edit">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(quiz)} className="p-1 rounded text-red-500 hover:bg-red-50" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget!.id)}
        loading={deleteMut.isPending}
        title="Delete Quiz"
        message={`Delete "${deleteTarget?.title}"? All attempts will be lost.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
