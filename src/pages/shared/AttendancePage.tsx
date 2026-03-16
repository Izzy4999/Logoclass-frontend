import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { attendanceApi } from "@/api/attendance";
import { formatDate } from "@/lib/utils";
import type { AttendanceRecord } from "@/types/attendance";

export default function AttendancePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["attendance"],
    queryFn: () => attendanceApi.list(),
  });

  const records: AttendanceRecord[] = data?.data?.data ?? [];

  const statusColors: Record<string, string> = {
    PRESENT: "bg-green-100 text-green-700",
    ABSENT: "bg-red-100 text-red-700",
    LATE: "bg-yellow-100 text-yellow-700",
    EXCUSED: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Attendance"
        description="View and manage student attendance records"
      />

      {isLoading && <LoadingSpinner />}

      {!isLoading && records.length === 0 && (
        <EmptyState title="No attendance records" description="Attendance records will appear here once marked." />
      )}

      {!isLoading && records.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Student</th>
                <th className="px-4 py-3 text-left font-medium">Class</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(record.date)}</td>
                  <td className="px-4 py-3 font-medium">
                    {record.student
                      ? `${record.student.firstName} ${record.student.lastName}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">{record.class?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{record.type}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[record.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{record.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
