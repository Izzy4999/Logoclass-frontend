import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Loader2, CreditCard, ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Modal from "@/components/shared/Modal";
import { paymentsApi } from "@/api/payments";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { Payment } from "@/types/payment";

const STATUS_COLORS: Record<string, string> = {
  PENDING:  "bg-yellow-50 text-yellow-700",
  PAID:     "bg-green-50 text-green-700",
  FAILED:   "bg-red-50 text-red-700",
  REFUNDED: "bg-blue-50 text-blue-700",
};

const PAYMENT_METHODS = ["BANK_TRANSFER", "CASH", "CARD", "PAYSTACK", "FLUTTERWAVE", "STRIPE"];
const INIT_RECORD = { feeAssignmentId: "", method: "BANK_TRANSFER", reference: "", amount: "" };

function formatNGN(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);
}

export default function PaymentsPage() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const canManage = can("MANAGE_PAYMENTS");

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [recordOpen, setRecordOpen] = useState(false);
  const [form, setForm] = useState(INIT_RECORD);
  const [formErr, setFormErr] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["payments", page, statusFilter],
    queryFn: () => paymentsApi.list({ page, limit: 20, status: statusFilter || undefined }),
  });

  const payments: Payment[] = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  const filtered = search.trim()
    ? payments.filter(p =>
        `${p.user?.firstName} ${p.user?.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        p.reference?.toLowerCase().includes(search.toLowerCase())
      )
    : payments;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["payments"] });

  const recordMut = useMutation({
    mutationFn: () => paymentsApi.record({
      feeAssignmentId: form.feeAssignmentId,
      method: form.method,
      reference: form.reference,
      amount: parseFloat(form.amount) || 0,
    }),
    onSuccess: () => { setRecordOpen(false); setForm(INIT_RECORD); setFormErr(""); invalidate(); },
    onError: (e: unknown) => setFormErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to record payment"),
  });

  return (
    <div>
      <PageHeader
        title="Payments"
        description="View and manage all payment transactions"
        action={canManage ? (
          <button onClick={() => { setRecordOpen(true); setForm(INIT_RECORD); setFormErr(""); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">
            <ClipboardList className="h-4 w-4" /> Record Payment
          </button>
        ) : undefined}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input placeholder="Search student or ref…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-52" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white">
          <option value="">All statuses</option>
          {["PENDING", "PAID", "FAILED", "REFUNDED"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center">
            <CreditCard className="h-7 w-7 text-primary" />
          </div>
          <p className="font-semibold text-foreground">No payments found</p>
          <p className="text-sm text-muted-foreground">Payment transactions will appear here.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-2">{meta?.total ?? filtered.length} transactions</p>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Reference", "Student", "Amount", "Method", "Status", "Paid At"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.reference ?? "—"}</td>
                    <td className="px-4 py-3 font-medium">
                      {p.user ? `${p.user.firstName} ${p.user.lastName}` : "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatNGN(p.amount)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{p.method ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.paidAt ? formatDate(p.paidAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>Page {meta.page} of {meta.totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Record Manual Payment Modal */}
      <Modal open={recordOpen} onClose={() => setRecordOpen(false)} title="Record Manual Payment" size="lg">
        <div className="space-y-3">
          {formErr && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formErr}</p>}
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
            Use this to manually record offline payments (bank transfer, cash, etc.)
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Fee Assignment ID *</label>
            <input value={form.feeAssignmentId} onChange={e => setForm(f => ({ ...f, feeAssignmentId: e.target.value }))}
              placeholder="Fee assignment ID from student's profile"
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Amount (NGN) *</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="e.g. 50000"
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Payment Method *</label>
              <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Reference / Receipt No. *</label>
            <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
              placeholder="e.g. TRF/2024/001"
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setRecordOpen(false)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50">Cancel</button>
            <button
              onClick={() => {
                if (!form.feeAssignmentId || !form.amount || !form.reference) return setFormErr("All fields are required");
                recordMut.mutate();
              }}
              disabled={recordMut.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {recordMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Record Payment
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
