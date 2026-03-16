import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { paymentsApi } from "@/api/payments";
import { formatDate } from "@/lib/utils";
import type { Fee } from "@/types/payment";

function formatNGN(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function FeesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["fees"],
    queryFn: () => paymentsApi.listFees(),
  });

  const fees: Fee[] = data?.data?.data ?? [];

  return (
    <div className="p-6">
      <PageHeader
        title="Fees"
        description="Manage school fees and payment categories"
        action={
          <Link
            to="new"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90"
          >
            + Add Fee
          </Link>
        }
      />

      {isLoading && <LoadingSpinner />}

      {!isLoading && fees.length === 0 && (
        <EmptyState title="No fees found" description="Create fee structures for students." />
      )}

      {!isLoading && fees.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Amount (NGN)</th>
                <th className="px-4 py-3 text-left font-medium">Due Date</th>
                <th className="px-4 py-3 text-left font-medium">Active?</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {fees.map((fee) => (
                <tr key={fee.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{fee.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {fee.category.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 font-medium">{formatNGN(fee.amount)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {fee.dueDate ? formatDate(fee.dueDate) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        fee.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {fee.isActive ? "Active" : "Inactive"}
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
