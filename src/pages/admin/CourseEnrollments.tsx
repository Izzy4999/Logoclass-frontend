import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { courseEnrollmentsApi } from "@/api/classes";
import type { CourseEnrollment } from "@/types/class";

export default function CourseEnrollments() {
  const { data, isLoading } = useQuery({
    queryKey: ["course-enrollments"],
    queryFn: () => courseEnrollmentsApi.list(),
  });

  const enrollments: CourseEnrollment[] = data?.data?.data ?? [];

  const statusColors: Record<string, string> = {
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    PASSED: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
    CARRYOVER: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Course Enrollments"
        description="View student subject enrollments and grades"
        action={
          <Link
            to="/admin/course-enrollments/new"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90"
          >
            + Enroll in Subject
          </Link>
        }
      />

      {isLoading && <LoadingSpinner />}

      {!isLoading && enrollments.length === 0 && (
        <EmptyState title="No course enrollments found" description="Enroll students in subjects to track their academic progress." />
      )}

      {!isLoading && enrollments.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Student</th>
                <th className="px-4 py-3 text-left font-medium">Subject</th>
                <th className="px-4 py-3 text-left font-medium">Academic Year</th>
                <th className="px-4 py-3 text-left font-medium">Score</th>
                <th className="px-4 py-3 text-left font-medium">Grade</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {enrollments.map((enrollment) => (
                <tr key={enrollment.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">
                    {enrollment.student.firstName} {enrollment.student.lastName}
                  </td>
                  <td className="px-4 py-3">{enrollment.subject.name}</td>
                  <td className="px-4 py-3">{enrollment.academicYear.name}</td>
                  <td className="px-4 py-3">{enrollment.score ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">{enrollment.grade ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[enrollment.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {enrollment.status.replace("_", " ")}
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
