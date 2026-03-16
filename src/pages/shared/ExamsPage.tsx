import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { examsApi } from "@/api/exams";
import { formatDateTime } from "@/lib/utils";
import type { Exam } from "@/types/exam";

export default function ExamsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["exams"],
    queryFn: () => examsApi.list(),
  });

  const exams: Exam[] = data?.data?.data ?? [];

  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-500",
    SCHEDULED: "bg-blue-100 text-blue-700",
    WAITING: "bg-yellow-100 text-yellow-700",
    LIVE: "bg-green-100 text-green-700",
    GRADING: "bg-purple-100 text-purple-700",
    PUBLISHED: "bg-teal-100 text-teal-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Exams"
        description="Manage and schedule examinations"
        action={
          <Link
            to="new"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90"
          >
            + Create Exam
          </Link>
        }
      />

      {isLoading && <LoadingSpinner />}

      {!isLoading && exams.length === 0 && (
        <EmptyState title="No exams found" description="Create your first exam." />
      )}

      {!isLoading && exams.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Scheduled At</th>
                <th className="px-4 py-3 text-left font-medium">Duration (min)</th>
                <th className="px-4 py-3 text-left font-medium">Total Marks</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {exams.map((exam) => (
                <tr key={exam.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{exam.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(exam.scheduledAt)}</td>
                  <td className="px-4 py-3">{exam.duration}</td>
                  <td className="px-4 py-3">{exam.totalMarks}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[exam.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {exam.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(exam.status === "WAITING" || exam.status === "LIVE") && (
                      <Link
                        to={`${exam.id}/room`}
                        className="inline-flex items-center px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Enter Room
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
