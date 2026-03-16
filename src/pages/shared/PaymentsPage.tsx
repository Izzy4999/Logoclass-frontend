import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { paymentsApi } from "@/api/payments";
import { formatDate } from "@/lib/utils";
import type { Payment } from "@/types/payment";

function formatNGN(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function PaymentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: () => paymentsApi.list(),
  });

  const payments: Payment[] = data?.data?.data ?? [];

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    PAID: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
    REFUNDED: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Payments"
        description="View all payment transactions"
      />

      {isLoading && <LoadingSpinner />}

      {!isLoading && payments.length === 0 && (
        <EmptyState title="No payments found" description="Payment records will appear here." />
      )}

      {!isLoading && payments.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Reference</th>
                <th className="px-4 py-3 text-left font-medium">Student</th>
                <th className="px-4 py-3 text-left font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium">Method</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Paid At</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-mono text-xs">{payment.reference}</td>
                  <td className="px-4 py-3">
                    {payment.user
                      ? `${payment.user.firstName} ${payment.user.lastName}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">{formatNGN(payment.amount)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{payment.method}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[payment.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {payment.paidAt ? formatDate(payment.paidAt) : "—"}
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
