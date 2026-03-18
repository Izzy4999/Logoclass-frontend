import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Edit2, Trash2, Loader2, Calendar,
  ChevronDown, ChevronRight, Star, Clock, CheckCircle2, AlertCircle,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Modal from "@/components/shared/Modal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { academicYearsApi } from "@/api/classes";
import { formatDate } from "@/lib/utils";
import type { AcademicYear, Term } from "@/types/class";

// ── Date status helpers ──────────────────────────────────────────────────────

type DateStatus = "upcoming" | "active" | "ended";

function getDateStatus(startDate: string | Date, endDate: string | Date): DateStatus {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "active";
}

function StatusBadge({ status }: { status: DateStatus }) {
  if (status === "ended") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
        <AlertCircle className="h-3 w-3" /> Ended
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
        <CheckCircle2 className="h-3 w-3" /> Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">
      <Clock className="h-3 w-3" /> Upcoming
    </span>
  );
}

// ── Zod schemas ──────────────────────────────────────────────────────────────

const yearSchema = z.object({
  name: z.string().min(1, "Name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  isCurrent: z.boolean(),
});
type YearFormData = z.infer<typeof yearSchema>;

const termSchema = z.object({
  name: z.string().min(1, "Term name is required"),
  order: z.number().int().min(1, "Order is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  isCurrent: z.boolean(),
});
type TermFormData = z.infer<typeof termSchema>;

// ── Component ────────────────────────────────────────────────────────────────

export default function AcademicYears() {
  const qc = useQueryClient();

  // Year modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AcademicYear | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AcademicYear | null>(null);

  // Term UI state
  const [expandedYear, setExpandedYear] = useState<string | null>(null);
  const [termFormYear, setTermFormYear] = useState<string | null>(null);
  const [deleteTermTarget, setDeleteTermTarget] = useState<{ yearId: string; term: Term } | null>(null);

  // Per-button loading: track exactly which id is being set as current
  const [settingCurrentYearId, setSettingCurrentYearId] = useState<string | null>(null);
  const [settingCurrentTermId, setSettingCurrentTermId] = useState<string | null>(null);

  // Server error messages
  const [yearServerError, setYearServerError] = useState("");
  const [termServerError, setTermServerError] = useState("");

  // ── Forms ──────────────────────────────────────────────────────────────────

  const {
    register: registerYear,
    handleSubmit: handleYearSubmit,
    reset: resetYear,
    formState: { errors: yearErrors },
  } = useForm<YearFormData>({
    resolver: zodResolver(yearSchema),
    defaultValues: { name: "", startDate: "", endDate: "", isCurrent: false },
  });

  const {
    register: registerTerm,
    handleSubmit: handleTermSubmit,
    reset: resetTerm,
    formState: { errors: termErrors },
  } = useForm<TermFormData>({
    resolver: zodResolver(termSchema),
    defaultValues: { name: "", order: 1, startDate: "", endDate: "", isCurrent: false },
  });

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => academicYearsApi.list({ limit: 100 }),
  });
  const years: AcademicYear[] = data?.data?.data ?? [];

  const { data: termsData } = useQuery({
    queryKey: ["terms", expandedYear],
    queryFn: () => (expandedYear ? academicYearsApi.listTerms(expandedYear) : null),
    enabled: !!expandedYear,
  });
  const terms: Term[] =
    (termsData?.data as { data?: Term[] } | undefined)?.data ??
    (termsData?.data as Term[] | undefined) ??
    [];

  // ── Mutations ──────────────────────────────────────────────────────────────

  const invalidateYears = () => qc.invalidateQueries({ queryKey: ["academic-years"] });
  const invalidateTerms = (yearId: string) =>
    qc.invalidateQueries({ queryKey: ["terms", yearId] });

  const createMut = useMutation({
    mutationFn: (d: YearFormData) =>
      academicYearsApi.create({ name: d.name, startDate: d.startDate, endDate: d.endDate, isCurrent: d.isCurrent }),
    onSuccess: () => { setCreateOpen(false); resetYear(); setYearServerError(""); invalidateYears(); },
    onError: (e: unknown) =>
      setYearServerError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create",
      ),
  });

  const editMut = useMutation({
    mutationFn: (d: YearFormData) =>
      academicYearsApi.update(editTarget!.id, {
        name: d.name, startDate: d.startDate, endDate: d.endDate, isCurrent: d.isCurrent,
      }),
    onSuccess: () => { setEditTarget(null); resetYear(); setYearServerError(""); invalidateYears(); },
    onError: (e: unknown) =>
      setYearServerError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update",
      ),
  });

  const deleteMut = useMutation({
    mutationFn: () => academicYearsApi.delete(deleteTarget!.id),
    onSuccess: () => { setDeleteTarget(null); invalidateYears(); },
  });

  const setCurrentYearMut = useMutation({
    mutationFn: (id: string) => {
      setSettingCurrentYearId(id);
      return academicYearsApi.setCurrent(id);
    },
    onSuccess: () => { setSettingCurrentYearId(null); invalidateYears(); },
    onError: () => setSettingCurrentYearId(null),
  });

  const createTermMut = useMutation({
    mutationFn: (d: TermFormData) =>
      academicYearsApi.createTerm(termFormYear!, {
        name: d.name, order: d.order,
        startDate: d.startDate, endDate: d.endDate, isCurrent: d.isCurrent,
      }),
    onSuccess: () => {
      const yearId = termFormYear;
      setTermFormYear(null); resetTerm(); setTermServerError("");
      if (yearId) invalidateTerms(yearId);
    },
    onError: (e: unknown) =>
      setTermServerError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create term",
      ),
  });

  const deleteTermMut = useMutation({
    mutationFn: () =>
      academicYearsApi.deleteTerm(deleteTermTarget!.yearId, deleteTermTarget!.term.id),
    onSuccess: () => {
      const yearId = deleteTermTarget!.yearId;
      setDeleteTermTarget(null);
      invalidateTerms(yearId);
    },
  });

  const setCurrentTermMut = useMutation({
    mutationFn: ({ yearId, termId }: { yearId: string; termId: string }) => {
      setSettingCurrentTermId(termId);
      return academicYearsApi.setCurrentTerm(yearId, termId);
    },
    onSuccess: (_data, { yearId }) => {
      setSettingCurrentTermId(null);
      invalidateTerms(yearId);
    },
    onError: () => setSettingCurrentTermId(null),
  });

  // ── Helpers ────────────────────────────────────────────────────────────────

  const openEdit = (y: AcademicYear) => {
    setEditTarget(y);
    resetYear({
      name: y.name,
      startDate: y.startDate?.slice(0, 10) ?? "",
      endDate: y.endDate?.slice(0, 10) ?? "",
      isCurrent: y.isCurrent ?? false,
    });
    setYearServerError("");
  };

  // ── Sub-form ───────────────────────────────────────────────────────────────

  const YearForm = ({ isEdit }: { isEdit?: boolean }) => (
    <form
      onSubmit={handleYearSubmit((d) => (isEdit ? editMut.mutate(d) : createMut.mutate(d)))}
      className="space-y-3"
    >
      {yearServerError && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{yearServerError}</p>
      )}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Name *</label>
        <input
          {...registerYear("name")}
          placeholder="e.g. 2024/2025"
          className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
            yearErrors.name ? "border-destructive" : "border-slate-200"
          }`}
        />
        {yearErrors.name && <p className="text-xs text-destructive mt-1">{yearErrors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Start Date *</label>
          <input
            type="date"
            {...registerYear("startDate")}
            className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
              yearErrors.startDate ? "border-destructive" : "border-slate-200"
            }`}
          />
          {yearErrors.startDate && (
            <p className="text-xs text-destructive mt-1">{yearErrors.startDate.message}</p>
          )}
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">End Date *</label>
          <input
            type="date"
            {...registerYear("endDate")}
            className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
              yearErrors.endDate ? "border-destructive" : "border-slate-200"
            }`}
          />
          {yearErrors.endDate && (
            <p className="text-xs text-destructive mt-1">{yearErrors.endDate.message}</p>
          )}
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          {...registerYear("isCurrent")}
          className="rounded border-slate-300 text-primary"
        />
        <span className="text-sm text-muted-foreground">Set as current academic year</span>
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => (isEdit ? setEditTarget(null) : setCreateOpen(false))}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createMut.isPending || editMut.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {(createMut.isPending || editMut.isPending) && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          {isEdit ? "Save changes" : "Create"}
        </button>
      </div>
    </form>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Academic Years"
        description="Manage academic years and their terms / semesters"
        action={
          <button
            onClick={() => {
              setCreateOpen(true);
              resetYear({ name: "", startDate: "", endDate: "", isCurrent: false });
              setYearServerError("");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> New Academic Year
          </button>
        }
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : years.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center">
            <Calendar className="h-7 w-7 text-primary" />
          </div>
          <p className="font-semibold text-foreground">No academic years yet</p>
          <p className="text-sm text-muted-foreground">Create your first academic year to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {years.map((y) => {
            const yearStatus = getDateStatus(y.startDate, y.endDate);
            const isSettingThisYear = settingCurrentYearId === y.id;

            return (
              <div
                key={y.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Year row */}
                <div className="flex items-center gap-3 p-4">
                  <button
                    onClick={() => setExpandedYear(expandedYear === y.id ? null : y.id)}
                    className="p-1 rounded hover:bg-slate-100 text-muted-foreground"
                  >
                    {expandedYear === y.id ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground">{y.name}</h3>
                      {y.isCurrent && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium flex items-center gap-1">
                          <Star className="h-2.5 w-2.5 fill-current" /> Current
                        </span>
                      )}
                      <StatusBadge status={yearStatus} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(y.startDate)} — {formatDate(y.endDate)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {!y.isCurrent && yearStatus !== "ended" && (
                      <button
                        onClick={() => setCurrentYearMut.mutate(y.id)}
                        disabled={isSettingThisYear}
                        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-60"
                      >
                        {isSettingThisYear ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Setting…
                          </>
                        ) : (
                          "Set Current"
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(y)}
                      className="p-1.5 rounded text-muted-foreground hover:bg-slate-100"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(y)}
                      className="p-1.5 rounded text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Terms section (expanded) */}
                {expandedYear === y.id && (
                  <div className="border-t border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Terms / Semesters
                      </h4>
                      <button
                        onClick={() => {
                          setTermFormYear(y.id);
                          resetTerm({ name: "", order: 1, startDate: "", endDate: "", isCurrent: false });
                          setTermServerError("");
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-white rounded-lg hover:bg-primary/90"
                      >
                        <Plus className="h-3 w-3" /> Add Term
                      </button>
                    </div>

                    {terms.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No terms yet. Add terms for this academic year.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {terms.map((t) => {
                          const termStatus = getDateStatus(t.startDate, t.endDate);
                          const isSettingThisTerm = settingCurrentTermId === t.id;

                          return (
                            <div
                              key={t.id}
                              className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 px-3 py-2"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium">{t.name}</span>
                                  {t.isCurrent && (
                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 font-medium flex items-center gap-1">
                                      <Star className="h-2.5 w-2.5 fill-current" /> Current
                                    </span>
                                  )}
                                  <StatusBadge status={termStatus} />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(t.startDate)} — {formatDate(t.endDate)}
                                </p>
                              </div>

                              <div className="flex items-center gap-1">
                                {!t.isCurrent && termStatus !== "ended" && (
                                  <button
                                    onClick={() =>
                                      setCurrentTermMut.mutate({ yearId: y.id, termId: t.id })
                                    }
                                    disabled={isSettingThisTerm}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs text-muted-foreground border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-60"
                                  >
                                    {isSettingThisTerm ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Setting…
                                      </>
                                    ) : (
                                      "Set Current"
                                    )}
                                  </button>
                                )}
                                <button
                                  onClick={() => setDeleteTermTarget({ yearId: y.id, term: t })}
                                  className="p-1 rounded text-red-400 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Inline add-term form */}
                    {termFormYear === y.id && (
                      <form
                        onSubmit={handleTermSubmit((d) => createTermMut.mutate(d))}
                        className="mt-3 bg-white rounded-lg border border-slate-200 p-3 space-y-2"
                      >
                        <p className="text-xs font-semibold text-muted-foreground">New Term</p>
                        {termServerError && (
                          <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                            {termServerError}
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <input
                              {...registerTerm("name")}
                              placeholder="Term name *"
                              className={`px-2 py-1.5 text-xs border rounded outline-none focus:ring-2 focus:ring-primary/30 w-full ${
                                termErrors.name ? "border-destructive" : "border-slate-200"
                              }`}
                            />
                            {termErrors.name && (
                              <p className="text-xs text-destructive mt-0.5">
                                {termErrors.name.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <input
                              type="number"
                              {...registerTerm("order", { valueAsNumber: true })}
                              placeholder="Order *"
                              className={`px-2 py-1.5 text-xs border rounded outline-none focus:ring-2 focus:ring-primary/30 w-full ${
                                termErrors.order ? "border-destructive" : "border-slate-200"
                              }`}
                            />
                            {termErrors.order && (
                              <p className="text-xs text-destructive mt-0.5">
                                {termErrors.order.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <input
                              type="date"
                              {...registerTerm("startDate")}
                              className={`px-2 py-1.5 text-xs border rounded outline-none focus:ring-2 focus:ring-primary/30 w-full ${
                                termErrors.startDate ? "border-destructive" : "border-slate-200"
                              }`}
                            />
                            {termErrors.startDate && (
                              <p className="text-xs text-destructive mt-0.5">
                                {termErrors.startDate.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <input
                              type="date"
                              {...registerTerm("endDate")}
                              className={`px-2 py-1.5 text-xs border rounded outline-none focus:ring-2 focus:ring-primary/30 w-full ${
                                termErrors.endDate ? "border-destructive" : "border-slate-200"
                              }`}
                            />
                            {termErrors.endDate && (
                              <p className="text-xs text-destructive mt-0.5">
                                {termErrors.endDate.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setTermFormYear(null)}
                            className="px-2 py-1 text-xs text-muted-foreground border border-slate-200 rounded hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={createTermMut.isPending}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
                          >
                            {createTermMut.isPending && (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            )}
                            Add Term
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Year modals */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Academic Year">
        <YearForm />
      </Modal>
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Academic Year">
        <YearForm isEdit />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate()}
        loading={deleteMut.isPending}
        title="Delete Academic Year"
        message={`Delete academic year "${deleteTarget?.name}"? All terms and related data will be affected.`}
        confirmLabel="Delete"
      />
      <ConfirmDialog
        open={!!deleteTermTarget}
        onClose={() => setDeleteTermTarget(null)}
        onConfirm={() => deleteTermMut.mutate()}
        loading={deleteTermMut.isPending}
        title="Delete Term"
        message={`Delete term "${deleteTermTarget?.term.name}"? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
