import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Loader2, DollarSign, Users } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Modal from "@/components/shared/Modal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { paymentsApi } from "@/api/payments";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { Fee, FeeCategory } from "@/types/payment";

const CATEGORIES = ["SCHOOL_FEES", "EXAM_FEES", "UNIFORM", "BOOK_FEES", "OTHER"];
const INIT_FEE = { name: "", description: "", amount: "", category: "SCHOOL_FEES", dueDate: "", isActive: true };
const INIT_ASSIGN = { studentIds: "", amountOverride: "", dueDate: "" };

function formatNGN(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);
}

export default function FeesPage() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const canManage = can("MANAGE_PAYMENTS");

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Fee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Fee | null>(null);
  const [assignTarget, setAssignTarget] = useState<Fee | null>(null);
  const [form, setForm] = useState(INIT_FEE);
  const [assignForm, setAssignForm] = useState(INIT_ASSIGN);
  const [formErr, setFormErr] = useState("");
  const [assignErr, setAssignErr] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["fees"],
    queryFn: () => paymentsApi.listFees({ limit: 100 }),
  });

  const fees: Fee[] = data?.data?.data ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ["fees"] });

  const createMut = useMutation({
    mutationFn: () => paymentsApi.createFee({
      name: form.name, description: form.description || undefined,
      amount: parseFloat(form.amount) || 0,
      category: form.category as FeeCategory, dueDate: form.dueDate || undefined, isActive: form.isActive,
    }),
    onSuccess: () => { setCreateOpen(false); setForm(INIT_FEE); setFormErr(""); invalidate(); },
    onError: (e: unknown) => setFormErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create"),
  });

  const editMut = useMutation({
    mutationFn: () => paymentsApi.updateFee(editTarget!.id, {
      name: form.name, description: form.description || undefined,
      amount: parseFloat(form.amount) || 0,
      category: form.category as FeeCategory, dueDate: form.dueDate || undefined, isActive: form.isActive,
    }),
    onSuccess: () => { setEditTarget(null); setForm(INIT_FEE); setFormErr(""); invalidate(); },
    onError: (e: unknown) => setFormErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update"),
  });

  const deleteMut = useMutation({
    mutationFn: () => paymentsApi.deleteFee(deleteTarget!.id),
    onSuccess: () => { setDeleteTarget(null); invalidate(); },
  });

  const assignMut = useMutation({
    mutationFn: () => {
      const studentIds = assignForm.studentIds.split(",").map(s => s.trim()).filter(Boolean);
      return paymentsApi.assignFee(assignTarget!.id, {
        studentIds,
        amountOverride: assignForm.amountOverride ? parseFloat(assignForm.amountOverride) : undefined,
        dueDate: assignForm.dueDate || undefined,
      });
    },
    onSuccess: (res) => {
      setAssignSuccess(`Successfully assigned to ${res.data?.data?.assignmentCount ?? 0} student(s).`);
      setAssignForm(INIT_ASSIGN);
      setAssignErr("");
    },
    onError: (e: unknown) => setAssignErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to assign"),
  });

  const openEdit = (f: Fee) => {
    setEditTarget(f);
    setForm({
      name: f.name, description: f.description ?? "", amount: String(f.amount),
      category: f.category, dueDate: f.dueDate?.slice(0, 10) ?? "", isActive: f.isActive ?? true,
    });
    setFormErr("");
  };

  const FeeForm = ({ isEdit }: { isEdit?: boolean }) => (
    <div className="space-y-3">
      {formErr && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formErr}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Fee Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. First Term School Fees"
            className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Amount (NGN) *</label>
          <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="e.g. 50000"
            className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Category *</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white">
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Due Date (optional)</label>
          <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
            className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="rounded border-slate-300 text-primary" />
            <span className="text-sm text-muted-foreground">Active</span>
          </label>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
            className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={() => isEdit ? setEditTarget(null) : setCreateOpen(false)}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50">Cancel</button>
        <button
          onClick={() => {
            if (!form.name.trim() || !form.amount) return setFormErr("Name and amount are required");
            isEdit ? editMut.mutate() : createMut.mutate();
          }}
          disabled={createMut.isPending || editMut.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
          {(createMut.isPending || editMut.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isEdit ? "Save changes" : "Create Fee"}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Fees"
        description="Manage school fees and assign them to students"
        action={canManage ? (
          <div className="flex items-center gap-2">
            <Link to="/settings" className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50">
              Payment Config
            </Link>
            <button onClick={() => { setCreateOpen(true); setForm(INIT_FEE); setFormErr(""); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">
              <Plus className="h-4 w-4" /> New Fee
            </button>
          </div>
        ) : undefined}
      />

      {isLoading ? <LoadingSpinner /> : fees.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center">
            <DollarSign className="h-7 w-7 text-green-600" />
          </div>
          <p className="font-semibold text-foreground">No fees created yet</p>
          <p className="text-sm text-muted-foreground">Create fee structures to assign to students.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Name", "Category", "Amount", "Due Date", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fees.map(f => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{f.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                      {f.category.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">{formatNGN(f.amount)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{f.dueDate ? formatDate(f.dueDate) : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {f.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setAssignTarget(f); setAssignForm(INIT_ASSIGN); setAssignErr(""); setAssignSuccess(""); }}
                          className="p-1.5 rounded text-muted-foreground hover:bg-slate-100" title="Assign to students">
                          <Users className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => openEdit(f)} className="p-1.5 rounded text-muted-foreground hover:bg-slate-100">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(f)} className="p-1.5 rounded text-red-500 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Fee" size="lg">
        <FeeForm />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Fee" size="lg">
        <FeeForm isEdit />
      </Modal>

      <Modal open={!!assignTarget} onClose={() => { setAssignTarget(null); setAssignSuccess(""); }} title={`Assign: ${assignTarget?.name ?? ""}`} size="lg">
        {assignSuccess ? (
          <div className="text-center py-4">
            <p className="text-sm font-medium text-green-700 bg-green-50 px-4 py-3 rounded-lg">{assignSuccess}</p>
            <button onClick={() => { setAssignTarget(null); setAssignSuccess(""); }}
              className="mt-3 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">Done</button>
          </div>
        ) : (
          <div className="space-y-3">
            {assignErr && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{assignErr}</p>}
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Fee amount: <span className="font-semibold text-foreground">{formatNGN(assignTarget?.amount ?? 0)}</span></p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Student IDs * (comma-separated)</label>
              <textarea value={assignForm.studentIds} onChange={e => setAssignForm(f => ({ ...f, studentIds: e.target.value }))} rows={3}
                placeholder="Paste student IDs separated by commas"
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Amount Override (optional)</label>
                <input type="number" value={assignForm.amountOverride} onChange={e => setAssignForm(f => ({ ...f, amountOverride: e.target.value }))}
                  placeholder="Default fee amount"
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Due Date Override (optional)</label>
                <input type="date" value={assignForm.dueDate} onChange={e => setAssignForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setAssignTarget(null)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50">Cancel</button>
              <button
                onClick={() => {
                  if (!assignForm.studentIds.trim()) return setAssignErr("Enter at least one student ID");
                  assignMut.mutate();
                }}
                disabled={assignMut.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
                {assignMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Assign Fee
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate()}
        loading={deleteMut.isPending}
        title="Delete Fee"
        message={`Delete fee "${deleteTarget?.name}"? Any unpaid assignments will also be affected.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
