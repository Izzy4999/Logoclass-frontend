import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import {
  Plus, Copy, Trash2, Loader2, CalendarDays,
  ChevronLeft, ChevronRight, LayoutGrid, List, Clock,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import Modal from "@/components/shared/Modal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import InfiniteSelect from "@/components/shared/InfiniteSelect";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { timetableApi, type TimetableEntry, type DayOfWeek } from "@/api/timetable";
import { classesApi, gradeLevelsApi, academicYearsApi, subjectsApi } from "@/api/classes";
import { usersApi } from "@/api/users";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import type { PaginationMeta } from "@/types/api";

// ── Constants ─────────────────────────────────────────────────────────────────

// FullCalendar daysOfWeek: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const DAY_FC: Record<DayOfWeek, number> = {
  MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

const DAY_LABELS: Record<DayOfWeek, string> = {
  MON: "Monday", TUE: "Tuesday", WED: "Wednesday",
  THU: "Thursday", FRI: "Friday", SAT: "Saturday",
};

const SUBJECT_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];

function subjectColor(subjectId: string) {
  let h = 0;
  for (let i = 0; i < subjectId.length; i++) h = subjectId.charCodeAt(i) + ((h << 5) - h);
  return SUBJECT_COLORS[Math.abs(h) % SUBJECT_COLORS.length];
}

function fakeMeta(length: number): PaginationMeta {
  return { total: length, page: 1, limit: 100, totalPages: 1 };
}

// ── Schema ────────────────────────────────────────────────────────────────────

const entrySchema = z.object({
  termId: z.string().min(1, "Term is required"),
  academicYearId: z.string().min(1, "Academic year is required"),
  gradeLevelId: z.string().optional(),
  classId: z.string().optional(),
  subjectId: z.string().min(1, "Subject is required"),
  teacherId: z.string().min(1, "Teacher is required"),
  dayOfWeek: z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT"]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  periodLabel: z.string().optional(),
  scopeType: z.enum(["grade", "class"]),
});
type EntryFormData = z.infer<typeof entrySchema>;

const cloneSchema = z.object({
  sourceTermId: z.string().min(1),
  targetTermId: z.string().min(1),
  targetAcademicYearId: z.string().min(1),
});
type CloneFormData = z.infer<typeof cloneSchema>;

type ViewMode = "grade" | "class" | "teacher";
type CalView = "dayGridMonth" | "timeGridWeek" | "timeGridDay" | "listWeek";

// ── Component ─────────────────────────────────────────────────────────────────

export default function TimetablePage() {
  const qc = useQueryClient();
  const { user, can, isTeacher, isStudent, isParent } = useAuth();
  const calendarRef = useRef<InstanceType<typeof FullCalendar>>(null);

  const canManage = can("MANAGE_TIMETABLE");

  const defaultViewMode: ViewMode = isTeacher ? "class" : canManage ? "grade" : "class";
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [calView, setCalView] = useState<CalView>("timeGridWeek");
  const [calTitle, setCalTitle] = useState("");

  const [selectedTermId, setSelectedTermId] = useState("");
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedGradeLevelId, setSelectedGradeLevelId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState(isTeacher ? (user?.id ?? "") : "");

  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneSourceYearId, setCloneSourceYearId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TimetableEntry | null>(null);
  const [serverError, setServerError] = useState("");

  // Admin: inline form visible alongside calendar
  const [formVisible, setFormVisible] = useState(false);

  // Lookups for displaying subject/teacher names in preview
  const [subjectMap, setSubjectMap] = useState<Record<string, string>>({});
  const [teacherMap, setTeacherMap] = useState<Record<string, string>>({});

  // ── Queries ──────────────────────────────────────────────────────────────

  const enabled = Boolean(selectedTermId && (
    (viewMode === "class" && selectedClassId) ||
    (viewMode === "grade" && selectedGradeLevelId) ||
    (viewMode === "teacher" && selectedTeacherId)
  ));

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["timetable", viewMode, selectedClassId, selectedGradeLevelId, selectedTeacherId, selectedTermId],
    queryFn: async () => {
      if (viewMode === "class") return (await timetableApi.forClass(selectedClassId, selectedTermId)).data.data ?? [];
      if (viewMode === "grade") return (await timetableApi.forGrade(selectedGradeLevelId, selectedTermId)).data.data ?? [];
      return (await timetableApi.forTeacher(selectedTeacherId, selectedTermId)).data.data ?? [];
    },
    enabled,
  });

  // ── Calendar events (recurring by daysOfWeek) ─────────────────────────────

  const calendarEvents = useMemo(() => {
    return entries.map((e) => ({
      id: e.id,
      title: e.subject.name,
      daysOfWeek: [DAY_FC[e.dayOfWeek]],
      startTime: e.startTime,
      endTime: e.endTime,
      backgroundColor: subjectColor(e.subjectId),
      borderColor: subjectColor(e.subjectId),
      textColor: "#fff",
      extendedProps: { entry: e },
    }));
  }, [entries]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const invalidate = () => qc.invalidateQueries({ queryKey: ["timetable"] });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: { scopeType: viewMode === "class" ? "class" : "grade", dayOfWeek: "MON" },
  });

  const scopeType = watch("scopeType");
  const watchedSubjectId = watch("subjectId");
  const watchedTeacherId = watch("teacherId");
  const watchedDay = watch("dayOfWeek");
  const watchedStart = watch("startTime");
  const watchedEnd = watch("endTime");

  // Draft preview event shown on calendar while form is open
  const draftEvent = useMemo(() => {
    if (!formVisible || !watchedDay || !watchedStart || !watchedEnd || !watchedSubjectId) return null;
    return {
      id: "__draft__",
      title: subjectMap[watchedSubjectId] ?? "New Slot",
      daysOfWeek: [DAY_FC[watchedDay]],
      startTime: watchedStart,
      endTime: watchedEnd,
      backgroundColor: "#22C55E",
      borderColor: "#16A34A",
      textColor: "#fff",
      classNames: ["opacity-70", "border-dashed"],
    };
  }, [formVisible, watchedDay, watchedStart, watchedEnd, watchedSubjectId, subjectMap]);

  const allEvents = useMemo(
    () => draftEvent ? [...calendarEvents, draftEvent] : calendarEvents,
    [calendarEvents, draftEvent]
  );

  const createMutation = useMutation({
    mutationFn: (data: EntryFormData) => {
      const { scopeType: st, ...rest } = data;
      return timetableApi.create({
        ...rest,
        gradeLevelId: st === "grade" ? rest.gradeLevelId : undefined,
        classId: st === "class" ? rest.classId : undefined,
      });
    },
    onSuccess: () => {
      toast.success("Slot added");
      reset({ scopeType: viewMode === "class" ? "class" : "grade", dayOfWeek: "MON", termId: selectedTermId, academicYearId: selectedAcademicYearId });
      invalidate();
    },
    onError: (e: any) => setServerError(e.response?.data?.message ?? "Failed to create"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => timetableApi.delete(id),
    onSuccess: () => { toast.success("Slot removed"); setDeleteTarget(null); invalidate(); },
  });

  const cloneForm = useForm<CloneFormData>({ resolver: zodResolver(cloneSchema) });

  const cloneMutation = useMutation({
    mutationFn: (data: CloneFormData) => timetableApi.clone({
      ...data,
      gradeLevelId: viewMode === "grade" ? selectedGradeLevelId : undefined,
      classId: viewMode === "class" ? selectedClassId : undefined,
    }),
    onSuccess: (r) => { toast.success(r.data.data?.message ?? "Cloned"); setCloneOpen(false); invalidate(); },
    onError: (e: any) => setServerError(e.response?.data?.message ?? "Clone failed"),
  });

  // ── Calendar navigation helpers ──────────────────────────────────────────

  function calApi() { return calendarRef.current?.getApi(); }

  function switchView(v: CalView) {
    setCalView(v);
    calApi()?.changeView(v);
  }

  function updateTitle() {
    const t = calApi()?.view.title;
    if (t) setCalTitle(t);
  }

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const yearFetcher = ({ page, search }: { page: number; search: string }) =>
    academicYearsApi.list({ page, limit: 50, search: search || undefined })
      .then(r => ({ data: r.data.data ?? [], meta: r.data.meta ?? fakeMeta(0) }));

  const termFetcher = (_: { page: number; search: string }) => {
    if (!selectedAcademicYearId) return Promise.resolve({ data: [], meta: fakeMeta(0) });
    return academicYearsApi.listTerms(selectedAcademicYearId)
      .then(r => { const d = r.data.data ?? []; return { data: d, meta: fakeMeta(d.length) }; });
  };

  const gradeFetcher = ({ page, search }: { page: number; search: string }) =>
    gradeLevelsApi.list({ page, limit: 50, search: search || undefined })
      .then(r => ({ data: r.data.data ?? [], meta: r.data.meta ?? fakeMeta(0) }));

  const classFetcher = ({ page, search }: { page: number; search: string }) =>
    classesApi.list({ page, limit: 50, search: search || undefined })
      .then(r => ({ data: r.data.data ?? [], meta: r.data.meta ?? fakeMeta(0) }));

  const teacherFetcher = ({ page, search }: { page: number; search: string }) =>
    usersApi.list({ page, limit: 50, search: search || undefined })
      .then(r => ({ data: r.data.data ?? [], meta: r.data.meta ?? fakeMeta(0) }));

  const subjectFetcher = ({ page, search }: { page: number; search: string }) =>
    subjectsApi.list({ page, limit: 50, search: search || undefined })
      .then(r => ({ data: r.data.data ?? [], meta: r.data.meta ?? fakeMeta(0) }));

  const sourceTermFetcher = (_: { page: number; search: string }) => {
    if (!cloneSourceYearId) return Promise.resolve({ data: [], meta: fakeMeta(0) });
    return academicYearsApi.listTerms(cloneSourceYearId)
      .then(r => { const d = r.data.data ?? []; return { data: d, meta: fakeMeta(d.length) }; });
  };

  const targetTermFetcher = (_: { page: number; search: string }) => {
    const yearId = cloneForm.watch("targetAcademicYearId");
    if (!yearId) return Promise.resolve({ data: [], meta: fakeMeta(0) });
    return academicYearsApi.listTerms(yearId)
      .then(r => { const d = r.data.data ?? []; return { data: d, meta: fakeMeta(d.length) }; });
  };

  const availableViewModes: ViewMode[] = canManage
    ? ["grade", "class", "teacher"]
    : isTeacher ? ["class", "teacher"] : [];

  function openForm() {
    reset({
      scopeType: viewMode === "class" ? "class" : "grade",
      dayOfWeek: "MON",
      termId: selectedTermId,
      academicYearId: selectedAcademicYearId,
      classId: viewMode === "class" ? selectedClassId : undefined,
      gradeLevelId: viewMode === "grade" ? selectedGradeLevelId : undefined,
    });
    setServerError("");
    setFormVisible(true);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <PageHeader
        title="Timetable"
        description="Weekly schedule for classes and grade levels"
        action={
          canManage ? (
            <div className="flex gap-2">
              <button
                onClick={() => { cloneForm.reset(); setCloneSourceYearId(""); setServerError(""); setCloneOpen(true); }}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
              >
                <Copy size={16} /> Reuse Timetable
              </button>

              <button
                onClick={openForm}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
              >
                <Plus size={16} /> Add Slot
              </button>
            </div>
          ) : undefined
        }
      />

      {/* ── Filters bar ── */}
      <div className="card p-3 flex flex-wrap gap-3 items-end">
        {availableViewModes.length > 1 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">View by</label>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              {availableViewModes.map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`px-3 py-1.5 text-sm font-medium capitalize ${
                    viewMode === m ? "bg-primary-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {m === "teacher" && isTeacher ? "My Schedule" : m}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1 w-44">
          <label className="text-xs font-medium text-slate-500">Academic Year</label>
          <InfiniteSelect
            placeholder="Select year"
            value={selectedAcademicYearId}
            onChange={(v) => { setSelectedAcademicYearId(v); setSelectedTermId(""); }}
            queryKey={["academic-years-tt"]}
            fetcher={yearFetcher}
            getLabel={(y: any) => y.name}
            getValue={(y: any) => y.id}
          />
        </div>

        {selectedAcademicYearId && (
          <div className="flex flex-col gap-1 w-36">
            <label className="text-xs font-medium text-slate-500">Term</label>
            <InfiniteSelect
              placeholder="Select term"
              value={selectedTermId}
              onChange={setSelectedTermId}
              queryKey={["terms-tt", selectedAcademicYearId]}
              fetcher={termFetcher}
              getLabel={(t: any) => t.name}
              getValue={(t: any) => t.id}
            />
          </div>
        )}

        {viewMode === "grade" && (
          <div className="flex flex-col gap-1 w-44">
            <label className="text-xs font-medium text-slate-500">Grade Level</label>
            <InfiniteSelect
              placeholder="Select grade"
              value={selectedGradeLevelId}
              onChange={setSelectedGradeLevelId}
              queryKey={["grades-tt"]}
              fetcher={gradeFetcher}
              getLabel={(g: any) => g.name}
              getValue={(g: any) => g.id}
            />
          </div>
        )}

        {viewMode === "class" && !isStudent && (
          <div className="flex flex-col gap-1 w-44">
            <label className="text-xs font-medium text-slate-500">Class</label>
            <InfiniteSelect
              placeholder="Select class"
              value={selectedClassId}
              onChange={setSelectedClassId}
              queryKey={["classes-tt"]}
              fetcher={classFetcher}
              getLabel={(c: any) => c.name}
              getValue={(c: any) => c.id}
            />
          </div>
        )}

        {viewMode === "teacher" && (
          <div className="flex flex-col gap-1 w-44">
            <label className="text-xs font-medium text-slate-500">Teacher</label>
            {isTeacher ? (
              <div className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-600">
                {user?.firstName} {user?.lastName}
              </div>
            ) : (
              <InfiniteSelect
                placeholder="Select teacher"
                value={selectedTeacherId}
                onChange={setSelectedTeacherId}
                queryKey={["teachers-tt"]}
                fetcher={teacherFetcher}
                getLabel={(u: any) => `${u.firstName} ${u.lastName}`}
                getValue={(u: any) => u.id}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Main: form panel + calendar ── */}
      <div className={`flex gap-4 items-start ${formVisible && canManage ? "" : ""}`}>

        {/* Add Slot panel (admin, slides in alongside calendar) */}
        {formVisible && canManage && (
          <div className="w-80 shrink-0 card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Add Timetable Slot</h3>
              <button onClick={() => setFormVisible(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">&times;</button>
            </div>

            {serverError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>}

            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-3">
              {/* Scope */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Applies to</label>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
                  {(["grade", "class"] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setValue("scopeType", s)}
                      className={`flex-1 py-2 font-medium transition-colors ${
                        scopeType === s ? "bg-primary-600 text-white" : "bg-white text-slate-600"
                      }`}>
                      {s === "grade" ? "Grade (all classes)" : "Specific Class"}
                    </button>
                  ))}
                </div>
              </div>

              {scopeType === "grade" ? (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Grade Level</label>
                  <InfiniteSelect
                    placeholder="Select grade"
                    value={watch("gradeLevelId") ?? ""}
                    onChange={(v) => setValue("gradeLevelId", v)}
                    queryKey={["grade-form-tt"]}
                    fetcher={gradeFetcher}
                    getLabel={(g: any) => g.name}
                    getValue={(g: any) => g.id}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Class</label>
                  <InfiniteSelect
                    placeholder="Select class"
                    value={watch("classId") ?? ""}
                    onChange={(v) => setValue("classId", v)}
                    queryKey={["class-form-tt"]}
                    fetcher={classFetcher}
                    getLabel={(c: any) => c.name}
                    getValue={(c: any) => c.id}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Subject</label>
                <InfiniteSelect
                  placeholder="Select subject"
                  value={watch("subjectId") ?? ""}
                  onChange={(v, item: any) => {
                    setValue("subjectId", v);
                    if (item?.name) setSubjectMap(m => ({ ...m, [v]: item.name }));
                  }}
                  queryKey={["subject-form-tt"]}
                  fetcher={subjectFetcher}
                  getLabel={(s: any) => s.name}
                  getValue={(s: any) => s.id}
                />
                {errors.subjectId && <p className="text-xs text-red-500 mt-1">{errors.subjectId.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Teacher</label>
                <InfiniteSelect
                  placeholder="Select teacher"
                  value={watch("teacherId") ?? ""}
                  onChange={(v, item: any) => {
                    setValue("teacherId", v);
                    if (item) setTeacherMap(m => ({ ...m, [v]: `${item.firstName} ${item.lastName}` }));
                  }}
                  queryKey={["teacher-form-tt"]}
                  fetcher={teacherFetcher}
                  getLabel={(u: any) => `${u.firstName} ${u.lastName}`}
                  getValue={(u: any) => u.id}
                />
                {errors.teacherId && <p className="text-xs text-red-500 mt-1">{errors.teacherId.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Day</label>
                <select {...register("dayOfWeek")} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
                  {(["MON", "TUE", "WED", "THU", "FRI", "SAT"] as DayOfWeek[]).map((d) => (
                    <option key={d} value={d}>{DAY_LABELS[d]}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Start</label>
                  <input type="time" {...register("startTime")} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">End</label>
                  <input type="time" {...register("endTime")} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Period Label <span className="text-slate-400">(optional)</span></label>
                <input {...register("periodLabel")} placeholder="e.g. Period 1" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>

              {/* hidden fields */}
              <input type="hidden" {...register("termId")} value={selectedTermId} />
              <input type="hidden" {...register("academicYearId")} value={selectedAcademicYearId} />

              {/* Draft preview indicator */}
              {watchedSubjectId && watchedStart && watchedEnd && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Preview shown on calendar in green
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setFormVisible(false)} className="flex-1 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Add Slot
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Calendar ── */}
        <div className="flex-1 card overflow-hidden">
          {/* Calendar custom header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            {/* Left: prev/next/today */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { calApi()?.prev(); updateTitle(); }}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => { calApi()?.next(); updateTitle(); }}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => { calApi()?.today(); updateTitle(); }}
                className="px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
              >
                today
              </button>
            </div>

            {/* Center: title */}
            <h2 className="text-base font-semibold text-slate-800">{calTitle}</h2>

            {/* Right: view switcher */}
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden">
              {([
                { v: "dayGridMonth" as CalView, label: "month", icon: <LayoutGrid size={14} /> },
                { v: "timeGridWeek" as CalView, label: "week", icon: <CalendarDays size={14} /> },
                { v: "timeGridDay" as CalView, label: "day", icon: <Clock size={14} /> },
                { v: "listWeek" as CalView, label: "list", icon: <List size={14} /> },
              ]).map(({ v, label }) => (
                <button
                  key={v}
                  onClick={() => switchView(v)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    calView === v ? "bg-primary-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar body */}
          <div className="p-4">
            {!selectedTermId ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <CalendarDays size={48} className="mb-3 opacity-30" />
                <p className="text-sm">Select an academic year and term to view the timetable</p>
              </div>
            ) : isLoading ? (
              <div className="flex justify-center py-24"><LoadingSpinner /></div>
            ) : (
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                initialView={calView}
                headerToolbar={false}
                weekNumbers
                weekNumberFormat={{ week: "numeric" }}
                weekText="W"
                hiddenDays={[0]}
                allDaySlot={false}
                slotMinTime="06:00:00"
                slotMaxTime="20:00:00"
                slotDuration="00:30:00"
                height="auto"
                events={allEvents}
                dayHeaderFormat={{ weekday: "short" }}
                datesSet={updateTitle}
                eventClick={(arg: EventClickArg) => {
                  if (!canManage) return;
                  const e: TimetableEntry = arg.event.extendedProps.entry;
                  if (e) setDeleteTarget(e);
                }}
                eventContent={(arg) => {
                  const e: TimetableEntry | undefined = arg.event.extendedProps.entry;
                  const isDraft = arg.event.id === "__draft__";
                  if (arg.view.type === "dayGridMonth") {
                    return (
                      <div className="text-xs px-1 truncate font-medium">
                        {arg.timeText && <span className="opacity-75 mr-1">{arg.timeText}</span>}
                        <span className="font-semibold">{arg.event.title}</span>
                      </div>
                    );
                  }
                  return (
                    <div className="p-1 text-xs leading-tight overflow-hidden h-full">
                      <div className="font-semibold truncate">{arg.event.title}</div>
                      {e && (
                        <>
                          <div className="truncate opacity-90">{e.teacher.firstName} {e.teacher.lastName}</div>
                          {e.class && <div className="truncate opacity-75">{e.class.name}</div>}
                          {e.gradeLevel && !e.class && <div className="truncate opacity-75">{e.gradeLevel.name} (all)</div>}
                          {e.periodLabel && <div className="truncate opacity-75">{e.periodLabel}</div>}
                        </>
                      )}
                      {isDraft && <div className="truncate opacity-75 italic">{teacherMap[watchedTeacherId] ?? "Teacher TBD"}</div>}
                      {canManage && !isDraft && (
                        <button
                          onClick={(ev) => { ev.stopPropagation(); if (e) setDeleteTarget(e); }}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-white/70 hover:text-white"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  );
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Clone Modal ── */}
      {canManage && (
        <Modal open={cloneOpen} onClose={() => setCloneOpen(false)} title="Reuse Timetable">
          <form onSubmit={cloneForm.handleSubmit((d) => cloneMutation.mutate(d))} className="space-y-4">
            {serverError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>}
            <p className="text-sm text-slate-500">Copy all timetable entries from one term into another.</p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source Academic Year</label>
              <InfiniteSelect placeholder="Select year" value={cloneSourceYearId}
                onChange={(v) => { setCloneSourceYearId(v); cloneForm.setValue("sourceTermId", ""); }}
                queryKey={["src-year-clone"]} fetcher={yearFetcher}
                getLabel={(y: any) => y.name} getValue={(y: any) => y.id} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source Term</label>
              <InfiniteSelect placeholder={cloneSourceYearId ? "Select term" : "Select source year first"}
                value={cloneForm.watch("sourceTermId") ?? ""}
                onChange={(v) => cloneForm.setValue("sourceTermId", v)}
                queryKey={["src-terms-clone", cloneSourceYearId]} fetcher={sourceTermFetcher}
                enabled={Boolean(cloneSourceYearId)}
                getLabel={(t: any) => t.name} getValue={(t: any) => t.id} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Academic Year</label>
              <InfiniteSelect placeholder="Select year" value={cloneForm.watch("targetAcademicYearId") ?? ""}
                onChange={(v) => cloneForm.setValue("targetAcademicYearId", v)}
                queryKey={["tgt-year-clone"]} fetcher={yearFetcher}
                getLabel={(y: any) => y.name} getValue={(y: any) => y.id} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Term</label>
              <InfiniteSelect placeholder="Select term" value={cloneForm.watch("targetTermId") ?? ""}
                onChange={(v) => cloneForm.setValue("targetTermId", v)}
                queryKey={["tgt-terms-clone", cloneForm.watch("targetAcademicYearId")]} fetcher={targetTermFetcher}
                enabled={Boolean(cloneForm.watch("targetAcademicYearId"))}
                getLabel={(t: any) => t.name} getValue={(t: any) => t.id} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setCloneOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={cloneMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
                {cloneMutation.isPending && <Loader2 size={14} className="animate-spin" />} Clone Timetable
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete Confirm ── */}
      {canManage && (
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title="Remove Slot"
          message={`Remove ${deleteTarget?.subject.name} on ${deleteTarget?.dayOfWeek} at ${deleteTarget?.startTime}?`}
          confirmLabel="Remove"
          variant="danger"
          loading={deleteMutation.isPending}
          onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        />
      )}
    </div>
  );
}
