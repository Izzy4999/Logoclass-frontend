import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { enrollmentsApi } from "@/api/classes";
import type { StudentEnrollment } from "@/types/class";

export default function Enrollments() {
  const { data, isLoading } = useQuery({
    queryKey: ["enrollments"],
    queryFn: () => enrollmentsApi.list(),
  });

  const enrollments: StudentEnrollment[] = data?.data?.data ?? [];

  const statusColors: Record<string, string> = {
    ENROLLED: "bg-blue-100 text-blue-700",
    PROMOTED: "bg-green-100 text-green-700",
    REPEATED: "bg-yellow-100 text-yellow-700",
    GRADUATED: "bg-purple-100 text-purple-700",
    TRANSFERRED: "bg-orange-100 text-orange-700",
    WITHDRAWN: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Enrollments"
        description="View and manage student enrollments"
        action={
          <Link
            to="/admin/enrollments/new"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90"
          >
            + Enroll Student
          </Link>
        }
      />

      {isLoading && <LoadingSpinner />}

      {!isLoading && enrollments.length === 0 && (
        <EmptyState title="No enrollments found" description="Enroll students into grade levels to get started." />
      )}

      {!isLoading && enrollments.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Student</th>
                <th className="px-4 py-3 text-left font-medium">Grade Level</th>
                <th className="px-4 py-3 text-left font-medium">Class</th>
                <th className="px-4 py-3 text-left font-medium">Academic Year</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {enrollments.map((enrollment) => (
                <tr key={enrollment.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">
                    {enrollment.student.firstName} {enrollment.student.lastName}
                  </td>
                  <td className="px-4 py-3">{enrollment.gradeLevel.name}</td>
                  <td className="px-4 py-3">{enrollment.classSection?.name ?? "—"}</td>
                  <td className="px-4 py-3">{enrollment.academicYear.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[enrollment.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {enrollment.status}
                    </span>
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
