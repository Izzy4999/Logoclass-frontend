import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { assignmentsApi } from "@/api/assignments";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { AssignmentSubmission } from "@/types/assignment";

export default function AssignmentDetail() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["assignments", id],
    queryFn: () => assignmentsApi.getById(id!),
    enabled: !!id,
  });

  const { data: submissionsData, isLoading: subsLoading } = useQuery({
    queryKey: ["assignments", id, "submissions"],
    queryFn: () => assignmentsApi.listSubmissions(id!),
    enabled: !!id,
  });

  const assignment = data?.data?.data;
  const submissions: AssignmentSubmission[] = submissionsData?.data?.data ?? [];

  if (isLoading) return <LoadingSpinner />;
  if (!assignment) return <div className="p-6"><p className="text-muted-foreground">Assignment not found.</p></div>;

  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-500",
    PUBLISHED: "bg-blue-100 text-blue-700",
    CLOSED: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader
        title={assignment.title}
        action={<Link to=".." className="text-sm text-muted-foreground hover:text-foreground">Back</Link>}
      />

      <div className="rounded-lg border p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[assignment.status]}`}>
            {assignment.status}
          </span>
          {assignment.dueDate && (
            <span className="text-xs text-muted-foreground">Due: {formatDate(assignment.dueDate)}</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{assignment.description ?? "No description."}</p>
        <p className="text-sm mt-2">Total Marks: <span className="font-medium">{assignment.totalMarks ?? "—"}</span></p>
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Submissions ({submissions.length})</h2>
        {subsLoading && <LoadingSpinner />}
        {!subsLoading && submissions.length === 0 && (
          <EmptyState title="No submissions yet" description="Students haven't submitted yet." />
        )}
        {!subsLoading && submissions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Student</th>
                  <th className="px-4 py-3 text-left font-medium">Submitted At</th>
                  <th className="px-4 py-3 text-left font-medium">Grade</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">
                      {sub.student.firstName} {sub.student.lastName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(sub.submittedAt)}</td>
                    <td className="px-4 py-3 font-medium">{sub.grade ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        sub.status === "GRADED" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
