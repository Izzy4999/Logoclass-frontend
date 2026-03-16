import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { gradeLevelsApi } from "@/api/classes";
import type { GradeLevel } from "@/types/class";

export default function GradeLevels() {
  const { data, isLoading } = useQuery({
    queryKey: ["grade-levels"],
    queryFn: () => gradeLevelsApi.list(),
  });

  const gradeLevels: GradeLevel[] = data?.data?.data ?? [];

  return (
    <div className="p-6">
      <PageHeader
        title="Grade Levels"
        description="Manage academic grade levels"
        action={
          <Link
            to="/admin/grade-levels/new"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90"
          >
            + Add Grade Level
          </Link>
        }
      />

      {isLoading && <LoadingSpinner />}

      {!isLoading && gradeLevels.length === 0 && (
        <EmptyState title="No grade levels found" description="Add grade levels to organize your school's classes." />
      )}

      {!isLoading && gradeLevels.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Order</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-left font-medium">Class Count</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {gradeLevels.map((level) => (
                <tr key={level.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{level.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{level.order}</td>
                  <td className="px-4 py-3 text-muted-foreground">{level.description ?? "—"}</td>
                  <td className="px-4 py-3">{level.classCount ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
