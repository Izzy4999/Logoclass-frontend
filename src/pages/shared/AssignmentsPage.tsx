import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { assignmentsApi } from "@/api/assignments";
import { formatDate } from "@/lib/utils";
import type { Assignment } from "@/types/assignment";

export default function AssignmentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => assignmentsApi.list(),
  });

  const assignments: Assignment[] = data?.data?.data ?? [];

  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-500",
    PUBLISHED: "bg-blue-100 text-blue-700",
    CLOSED: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Assignments"
        description="Manage and track class assignments"
        action={
          <Link
            to="new"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90"
          >
            + Create Assignment
          </Link>
        }
      />

      {isLoading && <LoadingSpinner />}

      {!isLoading && assignments.length === 0 && (
        <EmptyState title="No assignments found" description="Create your first assignment to give students work." />
      )}

      {!isLoading && assignments.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Due Date</th>
                <th className="px-4 py-3 text-left font-medium">Total Marks</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Submissions</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{assignment.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {assignment.dueDate ? formatDate(assignment.dueDate) : "—"}
                  </td>
                  <td className="px-4 py-3">{assignment.totalMarks ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[assignment.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {assignment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{assignment.submissionCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <Link
                      to={`${assignment.id}`}
                      className="text-primary hover:underline text-xs"
                    >
                      View
                    </Link>
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
