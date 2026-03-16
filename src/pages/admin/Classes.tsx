import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { classesApi } from "@/api/classes";
import type { ClassSection } from "@/types/class";

export default function Classes() {
  const { data, isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: () => classesApi.list(),
  });

  const classes: ClassSection[] = data?.data?.data ?? [];

  return (
    <div className="p-6">
      <PageHeader
        title="Classes"
        description="Manage class sections across all grade levels"
        action={
          <Link
            to="/admin/classes/new"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90"
          >
            + Add Class
          </Link>
        }
      />

      {isLoading && <LoadingSpinner />}

      {!isLoading && classes.length === 0 && (
        <EmptyState title="No classes found" description="Create your first class section to get started." />
      )}

      {!isLoading && classes.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Section</th>
                <th className="px-4 py-3 text-left font-medium">Grade Level</th>
                <th className="px-4 py-3 text-left font-medium">Teacher</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {classes.map((cls) => (
                <tr key={cls.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{cls.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{cls.section ?? "—"}</td>
                  <td className="px-4 py-3">{cls.gradeLevel.name}</td>
                  <td className="px-4 py-3">
                    {cls.teacher
                      ? `${cls.teacher.firstName} ${cls.teacher.lastName}`
                      : <span className="text-muted-foreground">Unassigned</span>}
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
