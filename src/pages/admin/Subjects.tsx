import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { subjectsApi } from "@/api/classes";
import type { Subject } from "@/types/class";

export default function Subjects() {
  const { data, isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => subjectsApi.list(),
  });

  const subjects: Subject[] = data?.data?.data ?? [];

  return (
    <div className="p-6">
      <PageHeader
        title="Subjects"
        description="Manage all subjects offered in the school"
        action={
          <Link
            to="/admin/subjects/new"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90"
          >
            + Add Subject
          </Link>
        }
      />

      {isLoading && <LoadingSpinner />}

      {!isLoading && subjects.length === 0 && (
        <EmptyState title="No subjects found" description="Add subjects to assign to grade levels and classes." />
      )}

      {!isLoading && subjects.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-left font-medium">Grade Level</th>
                <th className="px-4 py-3 text-left font-medium">Enrollment Count</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {subjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{subject.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{subject.code ?? "—"}</td>
                  <td className="px-4 py-3">{subject.gradeLevel?.name ?? "—"}</td>
                  <td className="px-4 py-3">{subject.enrollmentCount ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
