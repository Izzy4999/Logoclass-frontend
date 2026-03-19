import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit2, Trash2, Loader2, DollarSign, Users, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Modal from "@/components/shared/Modal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { paymentsApi } from "@/api/payments";
import { gradeLevelsApi, academicYearsApi } from "@/api/classes";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import type { Fee, FeeAssignment, FeeCategory } from "@/types/payment";
import type { GradeLevel, AcademicYear, Term } from "@/types/class";

const CATEGORIES = ["SCHOOL_FEES", "EXAM_FEES", "UNIFORM", "BOOK_FEES", "OTHER"] as const;

const feeSchema = z.object({
  name: z.string().min(1, "Fee name is required"),
  description: z.string().optional(),
  amount: z.coerce.number().min(0, "Amount must be 0 or more"),
  category: z.enum(CATEGORIES, { message: "Category is required" }),
  gradeLevelId: z.string().optional(),
  academicYearId: z.string().optional(),
  termId: z.string().optional(),
  dueDate: z.string().optional(),
  isActive: z.boolean().optional(),
});

type FeeFormValues = z.infer<typeof feeSchema>;

const DEFAULTS: FeeFormValues = {
  name: "",
  description: "",
  amount: 0,
  category: "SCHOOL_FEES",
  gradeLevelId: "",
  academicYearId: "",
  termId: "",
  dueDate: "",
  isActive: true,
};

function formatNGN(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);
}

// ── Student My Fees view ──────────────────────────────────────────────────────
function MyFeesTab() {
  const [initiatingId, setInitiatingId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-fees"],
    queryFn: () => paymentsApi.getMyFees(),
  });

  const fees: FeeAssignment[] = data?.data?.data ?? [];

  const initiateMut = useMutation({
    mutationFn: (feeAssignmentId: string) => paymentsApi.initiate(feeAssignmentId),
    onMutate: (id) => setInitiatingId(id),
    onSettled: () => setInitiatingId(null),
    onSuccess: (res) => {
      const paymentUrl = res.data?.data?.paymentUrl;
      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        toast.error("No payment URL returned", "Please contact the school office.");
        refetch();
      }
    },
    onError: () => toast.error("Could not initiate payment", "Please try again or contact support."),
  });

  if (isLoading) return <LoadingSpinner />;

  if (!fees.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center gap-3">
        <div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center">
          <DollarSign className="h-7 w-7 text-green-600" />
        </div>
        <p className="font-semibold text-foreground">No fees assigned</p>
        <p className="text-sm text-muted-foreground">You have no outstanding fees at this time.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {["Fee", "Amount", "Due Date", "Status", "Action"].map(h => (
              <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {fees.map((fa, i) => (
            <motion.tr
              key={fa.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="hover:bg-slate-50"
            >
              <td className="px-4 py-3 font-medium">{fa.fee.name}</td>
              <td className="px-4 py-3 font-semibold">
                {formatNGN(Number(fa.amountOverride ?? fa.fee.amount))}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {(fa.dueDate ?? fa.fee.dueDate) ? formatDate((fa.dueDate ?? fa.fee.dueDate)!) : "—"}
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  fa.status === "PAID"    ? "bg-green-100 text-green-700" :
                  fa.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                  fa.status === "FAILED"  ? "bg-red-100 text-red-700" :
                  "bg-slate-100 text-slate-600"
                }`}>{fa.status}</span>
              </td>
              <td className="px-4 py-3">
                {fa.status === "PENDING" ? (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => initiateMut.mutate(fa.id)}
                    disabled={initiatingId === fa.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-60"
                  >
                    {initiatingId === fa.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <ExternalLink className="h-3 w-3" />
                    }
                    Pay Online
                  </motion.button>
                ) : fa.status === "PAID" ? (
                  <span className="text-xs text-green-600 font-medium">Paid {fa.paidAt ? formatDate(fa.paidAt) : ""}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">{fa.status}</span>
                )}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Fee Form (extracted to avoid focus loss) ─────────────────────────────────
function FeeForm({
  defaultValues,
  onSubmit,
  onCancel,
  isPending,
  serverError,
  submitLabel,
}: {
  defaultValues: FeeFormValues;
  onSubmit: (values: FeeFormValues) => void;
  onCancel: () => void;
  isPending: boolean;
  serverError: string;
  submitLabel: string;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(feeSchema),
    defaultValues,
  });

  const academicYearId = watch("academicYearId");

  const { data: gradesData } = useQuery({
    queryKey: ["grade-levels-all"],
    queryFn: () => gradeLevelsApi.list({ limit: 100 }),
  });

  const { data: yearsData } = useQuery({
    queryKey: ["academic-years-all"],
    queryFn: () => academicYearsApi.list({ limit: 100 }),
  });

  const { data: termsData } = useQuery({
    queryKey: ["terms-for-year", academicYearId],
    queryFn: () => academicYearsApi.listTerms(academicYearId!),
    enabled: !!academicYearId,
  });

  const grades = gradesData?.data?.data ?? [];
  const years = yearsData?.data?.data ?? [];
  const terms = termsData?.data?.data ?? [];

  // Reset term when academic year changes
  useEffect(() => {
    setValue("termId", "");
  }, [academicYearId, setValue]);

  const doSubmit = (values: FeeFormValues) => {
    onSubmit({
      ...values,
      gradeLevelId: values.gradeLevelId || undefined,
      academicYearId: values.academicYearId || undefined,
      termId: values.termId || undefined,
      dueDate: values.dueDate || undefined,
      description: values.description || undefined,
    });
  };

  const inputCls = "mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";
  const selectCls = "mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white";

  return (
    <form onSubmit={handleSubmit(doSubmit)} className="space-y-3">
      {serverError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Fee Name *</label>
          <input {...register("name")} placeholder="e.g. First Term School Fees" className={inputCls} />
          {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name.message}</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Amount (NGN) *</label>
          <input type="number" step="any" {...register("amount")} placeholder="e.g. 50000" className={inputCls} />
          {errors.amount && <p className="text-xs text-red-500 mt-0.5">{errors.amount.message}</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Category *</label>
          <select {...register("category")} className={selectCls}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
          </select>
          {errors.category && <p className="text-xs text-red-500 mt-0.5">{errors.category.message}</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Grade Level (optional)</label>
          <select {...register("gradeLevelId")} className={selectCls}>
            <option value="">— All grades —</option>
            {grades.map((g: GradeLevel) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Academic Year (optional)</label>
          <select {...register("academicYearId")} className={selectCls}>
            <option value="">— All years —</option>
            {years.map((y: AcademicYear) => <option key={y.id} value={y.id}>{y.name}{y.isCurrent ? " (Current)" : ""}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Term (optional)</label>
          <select {...register("termId")} disabled={!academicYearId} className={`${selectCls} disabled:opacity-50`}>
            <option value="">— All terms —</option>
            {(Array.isArray(terms) ? terms : []).map((t: Term) => <option key={t.id} value={t.id}>{t.name}{t.isCurrent ? " (Current)" : ""}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Due Date (optional)</label>
          <input type="date" {...register("dueDate")} className={inputCls} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register("isActive")} className="rounded border-slate-300 text-primary" />
            <span className="text-sm text-muted-foreground">Active</span>
          </label>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
          <textarea {...register("description")} rows={2}
            className={`${inputCls} resize-none`} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function FeesPage() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const canManage = can("MANAGE_PAYMENTS");

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Fee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Fee | null>(null);
  const [assignTarget, setAssignTarget] = useState<Fee | null>(null);
  const [assignForm, setAssignForm] = useState({ studentIds: "", amountOverride: "", dueDate: "" });
  const [formErr, setFormErr] = useState("");
  const [assignErr, setAssignErr] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["fees"],
    queryFn: () => paymentsApi.listFees(),
  });

  const fees: Fee[] = data?.data?.data ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ["fees"] });

  const toPayload = (v: FeeFormValues) => ({
    name: v.name,
    description: v.description || undefined,
    amount: v.amount,
    category: v.category as FeeCategory,
    gradeLevelId: v.gradeLevelId || undefined,
    academicYearId: v.academicYearId || undefined,
    termId: v.termId || undefined,
    dueDate: v.dueDate || undefined,
  });

  const createMut = useMutation({
    mutationFn: (values: FeeFormValues) => paymentsApi.createFee(toPayload(values)),
    onSuccess: () => { setCreateOpen(false); setFormErr(""); invalidate(); },
    onError: (e: unknown) => setFormErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create"),
  });

  const editMut = useMutation({
    mutationFn: (values: FeeFormValues) => paymentsApi.updateFee(editTarget!.id, toPayload(values)),
    onSuccess: () => { setEditTarget(null); setFormErr(""); invalidate(); },
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
      setAssignForm({ studentIds: "", amountOverride: "", dueDate: "" });
      setAssignErr("");
    },
    onError: (e: unknown) => setAssignErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to assign"),
  });

  // if user cannot manage payments, show only their own fees
  if (!canManage) {
    return (
      <div>
        <PageHeader title="My Fees" description="View and pay your outstanding fees" />
        <MyFeesTab />
      </div>
    );
  }

  const editDefaults: FeeFormValues | undefined = editTarget ? {
    name: editTarget.name,
    description: editTarget.description ?? "",
    amount: editTarget.amount,
    category: (editTarget.category as FeeFormValues["category"]) ?? "SCHOOL_FEES",
    gradeLevelId: editTarget.gradeLevelId ?? "",
    academicYearId: editTarget.academicYearId ?? "",
    termId: editTarget.termId ?? "",
    dueDate: editTarget.dueDate?.slice(0, 10) ?? "",
  } : undefined;

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
            <button onClick={() => { setCreateOpen(true); setFormErr(""); }}
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
                {["Name", "Category", "Grade", "Year", "Amount", "Due Date", "Status", "Actions"].map(h => (
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
                  <td className="px-4 py-3 text-muted-foreground text-xs">{f.gradeLevel?.name ?? "All"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{f.academicYear?.name ?? "All"}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{formatNGN(f.amount)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{f.dueDate ? formatDate(f.dueDate) : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {f.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setAssignTarget(f); setAssignForm({ studentIds: "", amountOverride: "", dueDate: "" }); setAssignErr(""); setAssignSuccess(""); }}
                        className="p-1.5 rounded text-muted-foreground hover:bg-slate-100" title="Assign to students">
                        <Users className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => { setEditTarget(f); setFormErr(""); }} className="p-1.5 rounded text-muted-foreground hover:bg-slate-100">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(f)} className="p-1.5 rounded text-red-500 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Fee" size="lg">
        <FeeForm
          defaultValues={DEFAULTS}
          onSubmit={(v) => createMut.mutate(v)}
          onCancel={() => setCreateOpen(false)}
          isPending={createMut.isPending}
          serverError={formErr}
          submitLabel="Create Fee"
        />
      </Modal>

      {editTarget && (
        <Modal open onClose={() => setEditTarget(null)} title="Edit Fee" size="lg">
          <FeeForm
            key={editTarget.id}
            defaultValues={editDefaults!}
            onSubmit={(v) => editMut.mutate(v)}
            onCancel={() => setEditTarget(null)}
            isPending={editMut.isPending}
            serverError={formErr}
            submitLabel="Save changes"
          />
        </Modal>
      )}

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
