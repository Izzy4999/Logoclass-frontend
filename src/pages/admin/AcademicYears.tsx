import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { academicYearsApi } from "@/api/classes";
import { formatDate } from "@/lib/utils";
import type { AcademicYear } from "@/types/class";

export default function AcademicYears() {
  const { data, isLoading } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => academicYearsApi.list(),
  });

  const years: AcademicYear[] = data?.data?.data ?? [];

  return (
    <div className="p-6">
      <PageHeader
        title="Academic Years"
        description="Manage academic years and terms"
        action={
          <Link
            to="/admin/academic-years/new"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90"
          >
            + Add Academic Year
          </Link>
        }
      />

      {isLoading && <LoadingSpinner />}

      {!isLoading && years.length === 0 && (
        <EmptyState title="No academic years found" description="Create an academic year to organise terms and sessions." />
      )}

      {!isLoading && years.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Start Date</th>
                <th className="px-4 py-3 text-left font-medium">End Date</th>
                <th className="px-4 py-3 text-left font-medium">Terms</th>
                <th className="px-4 py-3 text-left font-medium">Current?</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {years.map((year) => (
                <tr key={year.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{year.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(year.startDate)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(year.endDate)}</td>
                  <td className="px-4 py-3">{year.termCount ?? 0}</td>
                  <td className="px-4 py-3">
                    {year.isCurrent ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Current
                      </span>
                    ) : (
                      "—"
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
