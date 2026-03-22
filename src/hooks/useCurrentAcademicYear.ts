import { useQuery } from "@tanstack/react-query";
import { academicYearsApi } from "@/api/classes";
import type { AcademicYear } from "@/types/class";

/**
 * Returns the tenant's current academic year (isCurrent = true).
 * Used to pre-select the active year in dropdowns and filters.
 */
export function useCurrentAcademicYear() {
  const { data, isLoading } = useQuery({
    queryKey: ["academic-years-current"],
    queryFn: () => academicYearsApi.list({ isCurrent: true, limit: 1 }),
    staleTime: 5 * 60 * 1000, // 5 min — changes rarely
  });

  const currentYear: AcademicYear | undefined = data?.data?.data?.[0];

  return { currentYear, isLoading };
}
