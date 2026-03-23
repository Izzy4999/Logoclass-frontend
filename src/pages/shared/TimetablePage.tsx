import { useState, useMemo, useRef, useEffect } from "react";
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
  ChevronLeft, ChevronRight, Video, ExternalLink, X,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import Modal from "@/components/shared/Modal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import InfiniteSelect from "@/components/shared/InfiniteSelect";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { liveClassesApi } from "@/api/live-classes";
import { timetableApi, type TimetableEntry, type DayOfWeek } from "@/api/timetable";
import { classesApi, gradeLevelsApi, academicYearsApi, subjectsApi } from "@/api/classes";
import { usersApi } from "@/api/users";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentAcademicYear } from "@/hooks/useCurrentAcademicYear";
import { toast } from "@/lib/toast";
import type { PaginationMeta } from "@/types/api";

// ── Constants ─────────────────────────────────────────────────────────────────

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
  sourceTermId: z.string().min(1, "Source term required"),
  targetTermId: z.string().min(1, "Target term required"),
  targetAcademicYearId: z.string().min(1, "Target year required"),
});
type CloneFormData = z.infer<typeof cloneSchema>;

type ViewMode = "grade" | "class" | "teacher";
type CalView = "dayGridMonth" | "timeGridWeek" | "timeGridDay" | "listWeek";

// ── SegmentedControl ──────────────────────────────────────────────────────────

function SegmentedControl<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
            value === opt.value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TimetablePage() {
  const qc = useQueryClient();
  const { user, can, isTeacher, isStudent, isParent } = useAuth();
  const calendarRef = useRef<InstanceType<typeof FullCalendar>>(null);

  const canManage = can("MANAGE_TIMETABLE");
  const { currentYear } = useCurrentAcademicYear();

  const defaultViewMode: ViewMode =
    isStudent || isParent ? "class" : isTeacher ? "class" : "grade";

  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [calView, setCalView] = useState<CalView>("timeGridWeek");
  const [calTitle, setCalTitle] = useState("");

  // Filters
  const [selectedTermId, setSelectedTermId] = useState("");
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedGradeLevelId, setSelectedGradeLevelId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState(
    isTeacher ? (user?.id ?? "") : ""
  );

  // Auto-select current academic year on first load
  useEffect(() => {
    if (currentYear && !selectedAcademicYearId) {
      setSelectedAcademicYearId(currentYear.id);
    }
  }, [currentYear]);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneSourceYearId, setCloneSourceYearId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TimetableEntry | null>(null);
  const [detailEntry, setDetailEntry] = useState<TimetableEntry | null>(null);
  const [scheduleMode, setScheduleMode] = useState<"livekit" | "external" | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [scheduleDuration, setScheduleDuration] = useState(45);
  const [serverError, setServerError] = useState("");

  // Subject/teacher name cache for draft preview
  const [subjectMap, setSubjectMap] = useState<Record<string, string>>({});
  const [teacherMap, setTeacherMap] = useState<Record<string, string>>({});

  // ── Queries ──────────────────────────────────────────────────────────────

  const enabled = Boolean(
    selectedTermId &&
    ((viewMode === "class" && selectedClassId) ||
     (viewMode === "grade" && selectedGradeLevelId) ||
     (viewMode === "teacher" && selectedTeacherId))
  );

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["timetable", viewMode, selectedClassId, selectedGradeLevelId, selectedTeacherId, selectedTermId],
    queryFn: async () => {
      if (viewMode === "class") return (await timetableApi.forClass(selectedClassId, selectedTermId)).data.data ?? [];
      if (viewMode === "grade") return (await timetableApi.forGrade(selectedGradeLevelId, selectedTermId)).data.data ?? [];
      return (await timetableApi.forTeacher(selectedTeacherId, selectedTermId)).data.data ?? [];
    },
    enabled,
  });

  // ── Calendar events ───────────────────────────────────────────────────────

  const calendarEvents = useMemo(() =>
    entries.map((e) => ({
      id: e.id,
      title: e.subject.name,
      daysOfWeek: [DAY_FC[e.dayOfWeek]],
      startTime: e.startTime,
      endTime: e.endTime,
      backgroundColor: subjectColor(e.subjectId),
      borderColor: subjectColor(e.subjectId),
      textColor: "#fff",
      extendedProps: { entry: e },
    })),
  [entries]);

  // ── Form ──────────────────────────────────────────────────────────────────

  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors },
  } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: { scopeType: "grade", dayOfWeek: "MON" },
  });

  const scopeType    = watch("scopeType");
  const watchSubject = watch("subjectId");
  const watchTeacher = watch("teacherId");
  const watchDay     = watch("dayOfWeek");
  const watchStart   = watch("startTime");
  const watchEnd     = watch("endTime");

  // Draft preview on calendar while create modal is open
  const draftEvent = useMemo(() => {
    if (!createOpen || !watchDay || !watchStart || !watchEnd || !watchSubject) return null;
    return {
      id: "__draft__",
      title: subjectMap[watchSubject] ?? "New Slot",
      daysOfWeek: [DAY_FC[watchDay]],
      startTime: watchStart,
      endTime: watchEnd,
      backgroundColor: "#22C55E",
      borderColor: "#16A34A",
      textColor: "#fff",
      classNames: ["opacity-70"],
    };
  }, [createOpen, watchDay, watchStart, watchEnd, watchSubject, subjectMap]);

  const allEvents = useMemo(
    () => (draftEvent ? [...calendarEvents, draftEvent] : calendarEvents),
    [calendarEvents, draftEvent]
  );

  // ── Mutations ─────────────────────────────────────────────────────────────

  const invalidate = () => qc.invalidateQueries({ queryKey: ["timetable"] });

  const createMutation = useMutation({
    mutationFn: (data: EntryFormData) => {
      const { scopeType: st, ...rest } = data;
      return timetableApi.create({
        ...rest,
        gradeLevelId: st === "grade" ? rest.gradeLevelId : undefined,
        classId:      st === "class" ? rest.classId      : undefined,
      });
    },
    onSuccess: () => {
      toast.success("Slot added");
      setCreateOpen(false);
      reset({ scopeType: "grade", dayOfWeek: "MON", termId: selectedTermId, academicYearId: selectedAcademicYearId });
      invalidate();
    },
    onError: (e: any) => setServerError(e.response?.data?.message ?? "Failed to create"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => timetableApi.delete(id),
    onSuccess: () => { toast.success("Slot removed"); setDeleteTarget(null); invalidate(); },
  });

  const scheduleLiveClassMutation = useMutation({
    mutationFn: (dto: Parameters<typeof liveClassesApi.create>[0]) => liveClassesApi.create(dto),
    onSuccess: () => {
      toast.success("Live class scheduled");
      setScheduleMode(null);
      setScheduleDate("");
      setExternalLink("");
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to schedule"),
  });

  const cloneForm = useForm<CloneFormData>({ resolver: zodResolver(cloneSchema) });

  const cloneMutation = useMutation({
    mutationFn: (data: CloneFormData) =>
      timetableApi.clone({
        ...data,
        gradeLevelId: viewMode === "grade" ? selectedGradeLevelId : undefined,
        classId:      viewMode === "class" ? selectedClassId      : undefined,
      }),
    onSuccess: (r) => {
      toast.success(r.data.data?.message ?? "Cloned");
      setCloneOpen(false);
      invalidate();
    },
    onError: (e: any) => setServerError(e.response?.data?.message ?? "Clone failed"),
  });

  // ── Calendar helpers ──────────────────────────────────────────────────────

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
    usersApi.list({ page, limit: 50, search: search || undefined, roleName: "Teacher" })
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

  // ── View mode tabs (admin sees all three, teacher sees class + my schedule) ─

  const viewOptions: { value: ViewMode; label: string }[] =
    canManage
      ? [
          { value: "grade",   label: "Grade"       },
          { value: "class",   label: "Class"       },
          { value: "teacher", label: "My Schedule" },
        ]
      : isTeacher
      ? [
          { value: "class",   label: "Class"       },
          { value: "teacher", label: "My Schedule" },
        ]
      : [];

  const FC_DAY_MAP: Record<number, DayOfWeek> = { 1: "MON", 2: "TUE", 3: "WED", 4: "THU", 5: "FRI", 6: "SAT" };

  function openCreate(prefill?: { dayOfWeek?: DayOfWeek; startTime?: string; endTime?: string }) {
    reset({
      scopeType:      viewMode === "class" ? "class" : "grade",
      dayOfWeek:      prefill?.dayOfWeek ?? "MON",
      startTime:      prefill?.startTime ?? "",
      endTime:        prefill?.endTime   ?? "",
      termId:         selectedTermId,
      academicYearId: selectedAcademicYearId,
      classId:        viewMode === "class" ? selectedClassId      : undefined,
      gradeLevelId:   viewMode === "grade" ? selectedGradeLevelId : undefined,
    });
    setServerError("");
    setCreateOpen(true);
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
                onClick={() => {
                  cloneForm.reset();
                  setCloneSourceYearId("");
                  setServerError("");
                  setCloneOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
              >
                <Copy size={16} /> Reuse Timetable
              </button>

              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-brand-900"
              >
                <Plus size={16} /> Add Slot
              </button>
            </div>
          ) : undefined
        }
      />

      {/* ── Filters bar ── */}
      <div className="card p-3 flex flex-wrap gap-3 items-end">

        {/* View mode tabs */}
        {viewOptions.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">View by</label>
            <SegmentedControl
              options={viewOptions}
              value={viewMode}
              onChange={(v) => setViewMode(v)}
            />
          </div>
        )}

        {/* Academic Year */}
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

        {/* Term */}
        {selectedAcademicYearId && (
          <div className="flex flex-col gap-1 w-36">
            <label className="text-xs font-medium text-slate-500">Term</label>
            <InfiniteSelect
              placeholder="Select term"
              value={selectedTermId}
              onChange={setSelectedTermId}
              queryKey={["terms-tt", selectedAcademicYearId]}
              fetcher={termFetcher}
              enabled={Boolean(selectedAcademicYearId)}
              getLabel={(t: any) => t.name}
              getValue={(t: any) => t.id}
            />
          </div>
        )}

        {/* Grade filter */}
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

        {/* Class filter */}
        {viewMode === "class" && !isStudent && !isParent && (
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

        {/* Teacher filter */}
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

      {/* ── Calendar card ── */}
      <div className="card overflow-hidden">
        {/* Custom calendar toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          {/* Prev / Next / Today */}
          <div className="flex items-center gap-1">
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
              className="px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 ml-1"
            >
              today
            </button>
          </div>

          {/* Title */}
          <h2 className="text-base font-semibold text-slate-800">{calTitle}</h2>

          {/* View switcher */}
          <SegmentedControl
            options={[
              { value: "dayGridMonth" as CalView, label: "month"  },
              { value: "timeGridWeek" as CalView, label: "week"   },
              { value: "timeGridDay"  as CalView, label: "day"    },
              { value: "listWeek"     as CalView, label: "list"   },
            ]}
            value={calView}
            onChange={switchView}
          />
        </div>

        {/* Calendar body */}
        <div className="p-4">
          {!selectedTermId ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <CalendarDays size={48} className="mb-3 opacity-30" />
              <p className="text-sm">Select an academic year and term to view the timetable</p>
              {canManage && (
                <button
                  onClick={openCreate}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-brand-900"
                >
                  <Plus size={16} /> Add Slot
                </button>
              )}
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
              dateClick={(arg) => {
                if (!canManage) return;
                const d = arg.date;
                const dayEnum = FC_DAY_MAP[d.getDay()];
                const hh = String(d.getHours()).padStart(2, "0");
                const mm = String(d.getMinutes()).padStart(2, "0");
                const startTime = `${hh}:${mm}`;
                // default 45-min period
                const endD = new Date(d.getTime() + 45 * 60 * 1000);
                const endTime = `${String(endD.getHours()).padStart(2, "0")}:${String(endD.getMinutes()).padStart(2, "0")}`;
                openCreate({ dayOfWeek: dayEnum ?? "MON", startTime, endTime });
              }}
              eventClick={(arg: EventClickArg) => {
                const e: TimetableEntry = arg.event.extendedProps.entry;
                if (!e) return;
                setDetailEntry(e);
                setScheduleMode(null);
                setScheduleDate("");
                setExternalLink("");
              }}
              eventContent={(arg) => {
                const e: TimetableEntry | undefined = arg.event.extendedProps.entry;
                const isDraft = arg.event.id === "__draft__";

                if (arg.view.type === "dayGridMonth") {
                  return (
                    <div className="text-xs px-1 truncate font-medium">
                      {arg.timeText && <span className="opacity-75 mr-1">{arg.timeText}</span>}
                      <span>{arg.event.title}</span>
                    </div>
                  );
                }

                if (arg.view.type === "listWeek") {
                  return (
                    <div className="flex items-center gap-3 py-0.5">
                      <span className="font-medium">{arg.event.title}</span>
                      {e && (
                        <>
                          <span className="text-slate-500 text-xs">{e.teacher.firstName} {e.teacher.lastName}</span>
                          {e.class && <span className="text-xs text-slate-400">{e.class.name}</span>}
                          {e.gradeLevel && !e.class && <span className="text-xs text-slate-400">{e.gradeLevel.name} (all)</span>}
                        </>
                      )}
                    </div>
                  );
                }

                const hasLive = e && e.liveClasses && e.liveClasses.length > 0;
                return (
                  <div className="p-1 text-xs leading-tight overflow-hidden h-full relative group">
                    <div className="font-semibold truncate flex items-center gap-1">
                      {hasLive && <Video size={10} className="shrink-0 opacity-90" />}
                      {arg.event.title}
                    </div>
                    {e && (
                      <>
                        <div className="truncate opacity-90">{e.teacher.firstName} {e.teacher.lastName}</div>
                        {e.class && <div className="truncate opacity-75">{e.class.name}</div>}
                        {e.gradeLevel && !e.class && <div className="truncate opacity-75">{e.gradeLevel.name} (all)</div>}
                        {e.periodLabel && <div className="truncate opacity-60">{e.periodLabel}</div>}
                      </>
                    )}
                    {isDraft && (
                      <div className="truncate opacity-75 italic">
                        {teacherMap[watchTeacher] ?? "Teacher TBD"}
                      </div>
                    )}
                  </div>
                );
              }}
            />
          )}
        </div>
      </div>

      {/* ── Create Slot Modal (admin only) ── */}
      {canManage && (
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Timetable Slot">
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="flex flex-col">
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {serverError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>
            )}

            {/* Scope */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Applies to</label>
              <SegmentedControl
                options={[
                  { value: "grade", label: "Grade Level (all classes)" },
                  { value: "class", label: "Specific Class" },
                ]}
                value={scopeType}
                onChange={(v) => setValue("scopeType", v)}
              />
            </div>

            {scopeType === "grade" ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Grade Level</label>
                <InfiniteSelect
                  placeholder="Select grade"
                  value={watch("gradeLevelId") ?? ""}
                  onChange={(v) => setValue("gradeLevelId", v)}
                  queryKey={["grade-form-tt"]}
                  fetcher={gradeFetcher}
                  getLabel={(g: any) => g.name}
                  getValue={(g: any) => g.id}
                />
                {errors.gradeLevelId && <p className="text-xs text-red-500 mt-1">{errors.gradeLevelId.message}</p>}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                <InfiniteSelect
                  placeholder="Select class"
                  value={watch("classId") ?? ""}
                  onChange={(v) => setValue("classId", v)}
                  queryKey={["class-form-tt"]}
                  fetcher={classFetcher}
                  getLabel={(c: any) => c.name}
                  getValue={(c: any) => c.id}
                />
                {errors.classId && <p className="text-xs text-red-500 mt-1">{errors.classId.message}</p>}
              </div>
            )}

            {/* Academic Year + Term */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year</label>
                <InfiniteSelect
                  placeholder="Select year"
                  value={watch("academicYearId") ?? ""}
                  onChange={(v) => { setValue("academicYearId", v); setValue("termId", ""); }}
                  queryKey={["year-form-tt"]}
                  fetcher={yearFetcher}
                  getLabel={(y: any) => y.name}
                  getValue={(y: any) => y.id}
                />
                {errors.academicYearId && <p className="text-xs text-red-500 mt-1">{errors.academicYearId.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Term</label>
                <InfiniteSelect
                  placeholder="Select term"
                  value={watch("termId") ?? ""}
                  onChange={(v) => setValue("termId", v)}
                  queryKey={["term-form-tt", watch("academicYearId")]}
                  fetcher={(_) => {
                    const yId = watch("academicYearId");
                    if (!yId) return Promise.resolve({ data: [], meta: fakeMeta(0) });
                    return academicYearsApi.listTerms(yId)
                      .then(r => { const d = r.data.data ?? []; return { data: d, meta: fakeMeta(d.length) }; });
                  }}
                  enabled={Boolean(watch("academicYearId"))}
                  getLabel={(t: any) => t.name}
                  getValue={(t: any) => t.id}
                />
                {errors.termId && <p className="text-xs text-red-500 mt-1">{errors.termId.message}</p>}
              </div>
            </div>

            {/* Subject + Teacher */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Teacher</label>
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
            </div>

            {/* Day + Time */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Day</label>
                <select
                  {...register("dayOfWeek")}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {(["MON", "TUE", "WED", "THU", "FRI", "SAT"] as DayOfWeek[]).map((d) => (
                    <option key={d} value={d}>{DAY_LABELS[d]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                <input
                  type="time"
                  {...register("startTime")}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.startTime && <p className="text-xs text-red-500 mt-1">{errors.startTime.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                <input
                  type="time"
                  {...register("endTime")}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.endTime && <p className="text-xs text-red-500 mt-1">{errors.endTime.message}</p>}
              </div>
            </div>

            {/* Period label */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Period Label <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                {...register("periodLabel")}
                placeholder="e.g. Period 1"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Live preview indicator */}
            {watchSubject && watchStart && watchEnd && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                Live preview shown on calendar in green
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 mt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-5 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-brand-900 disabled:opacity-50 flex items-center gap-2"
            >
              {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Add Slot
            </button>
          </div>
          </form>
        </Modal>
      )}

      {/* ── Slot Detail Modal ── */}
      {detailEntry && (
        <Modal
          open={Boolean(detailEntry)}
          onClose={() => { setDetailEntry(null); setScheduleMode(null); }}
          title={detailEntry.subject.name}
        >
          <div className="space-y-4">
            {/* Entry info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-2">
                <div>
                  <span className="text-slate-500 text-xs">Day &amp; Time</span>
                  <p className="font-medium">{DAY_LABELS[detailEntry.dayOfWeek]} · {detailEntry.startTime} – {detailEntry.endTime}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-xs">Teacher</span>
                  <p className="font-medium">{detailEntry.teacher.firstName} {detailEntry.teacher.lastName}</p>
                </div>
              </div>
              <div className="space-y-2">
                {detailEntry.class && (
                  <div>
                    <span className="text-slate-500 text-xs">Class</span>
                    <p className="font-medium">{detailEntry.class.name}</p>
                  </div>
                )}
                {detailEntry.gradeLevel && (
                  <div>
                    <span className="text-slate-500 text-xs">Grade</span>
                    <p className="font-medium">{detailEntry.gradeLevel.name}{!detailEntry.class ? " (all classes)" : ""}</p>
                  </div>
                )}
                {detailEntry.periodLabel && (
                  <div>
                    <span className="text-slate-500 text-xs">Period</span>
                    <p className="font-medium">{detailEntry.periodLabel}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming live classes */}
            {detailEntry.liveClasses && detailEntry.liveClasses.length > 0 && (
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Upcoming Sessions</p>
                {detailEntry.liveClasses.map((lc) => (
                  <div key={lc.id} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{lc.title}</p>
                      <p className="text-xs text-slate-500">{new Date(lc.scheduledAt).toLocaleString()}</p>
                    </div>
                    {!isParent && (
                      lc.status === "LIVE" ? (
                        <a
                          href={lc.joinUrl ?? `/live-classes/${lc.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg animate-pulse"
                        >
                          <Video size={12} /> Live Now
                        </a>
                      ) : (
                        <a
                          href={lc.joinUrl ?? `/live-classes/${lc.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-brand-900"
                        >
                          <Video size={12} /> Join
                        </a>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Teacher actions: schedule live class */}
            {(isTeacher && user?.id === detailEntry.teacherId) || canManage ? (
              <div className="border-t border-slate-100 pt-3 space-y-3">
                {!scheduleMode ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setScheduleMode("livekit")}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-brand-900"
                    >
                      <Video size={14} /> Schedule Live Class
                    </button>
                    <button
                      onClick={() => setScheduleMode("external")}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                    >
                      <ExternalLink size={14} /> Add External Link
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-700">
                        {scheduleMode === "livekit" ? "Schedule Live Class" : "Add External Link"}
                      </p>
                      <button onClick={() => setScheduleMode(null)} className="text-slate-400 hover:text-slate-600">
                        <X size={14} />
                      </button>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Date &amp; Time</label>
                      <input
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                      />
                    </div>

                    {scheduleMode === "external" && (
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Meeting Link (Google Meet / Zoom)</label>
                        <input
                          type="url"
                          value={externalLink}
                          onChange={(e) => setExternalLink(e.target.value)}
                          placeholder="https://meet.google.com/..."
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Duration (minutes)</label>
                      <input
                        type="number"
                        min={15}
                        max={180}
                        value={scheduleDuration}
                        onChange={(e) => setScheduleDuration(Number(e.target.value))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                      />
                    </div>

                    <button
                      disabled={!scheduleDate || scheduleLiveClassMutation.isPending || (!detailEntry.classId) || (scheduleMode === "external" && !externalLink)}
                      onClick={() => {
                        if (!detailEntry.classId) {
                          toast.error("This slot is grade-wide. Open Live Classes to schedule for a specific class.");
                          return;
                        }
                        scheduleLiveClassMutation.mutate({
                          classId: detailEntry.classId,
                          termId: detailEntry.termId,
                          timetableEntryId: detailEntry.id,
                          title: `${detailEntry.subject.name} — ${DAY_LABELS[detailEntry.dayOfWeek]} ${detailEntry.startTime}`,
                          scheduledAt: new Date(scheduleDate).toISOString(),
                          duration: scheduleDuration,
                          joinUrl: scheduleMode === "external" ? externalLink : undefined,
                        });
                      }}
                      className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-brand-900 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {scheduleLiveClassMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
                      {scheduleMode === "livekit" ? "Create Room & Schedule" : "Save Link & Schedule"}
                    </button>

                    {!detailEntry.classId && (
                      <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                        Grade-wide slots can't be scheduled directly — go to Live Classes and select a specific class.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {/* Admin delete */}
            {canManage && (
              <div className="border-t border-slate-100 pt-3 flex justify-end">
                <button
                  onClick={() => { setDetailEntry(null); setDeleteTarget(detailEntry); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  <Trash2 size={12} /> Delete Slot
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Clone Modal ── */}
      {canManage && (
        <Modal open={cloneOpen} onClose={() => setCloneOpen(false)} title="Reuse Timetable">
          <form onSubmit={cloneForm.handleSubmit((d) => cloneMutation.mutate(d))} className="space-y-4">
            {serverError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>}
            <p className="text-sm text-slate-500">Copy all timetable entries from one term into another.</p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source Academic Year</label>
              <InfiniteSelect
                placeholder="Select year"
                value={cloneSourceYearId}
                onChange={(v) => { setCloneSourceYearId(v); cloneForm.setValue("sourceTermId", ""); }}
                queryKey={["src-year-clone"]}
                fetcher={yearFetcher}
                getLabel={(y: any) => y.name}
                getValue={(y: any) => y.id}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source Term</label>
              <InfiniteSelect
                placeholder={cloneSourceYearId ? "Select term" : "Select source year first"}
                value={cloneForm.watch("sourceTermId") ?? ""}
                onChange={(v) => cloneForm.setValue("sourceTermId", v)}
                queryKey={["src-terms-clone", cloneSourceYearId]}
                fetcher={sourceTermFetcher}
                enabled={Boolean(cloneSourceYearId)}
                getLabel={(t: any) => t.name}
                getValue={(t: any) => t.id}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Academic Year</label>
              <InfiniteSelect
                placeholder="Select year"
                value={cloneForm.watch("targetAcademicYearId") ?? ""}
                onChange={(v) => { cloneForm.setValue("targetAcademicYearId", v); cloneForm.setValue("targetTermId", ""); }}
                queryKey={["tgt-year-clone"]}
                fetcher={yearFetcher}
                getLabel={(y: any) => y.name}
                getValue={(y: any) => y.id}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Term</label>
              <InfiniteSelect
                placeholder={cloneForm.watch("targetAcademicYearId") ? "Select term" : "Select target year first"}
                value={cloneForm.watch("targetTermId") ?? ""}
                onChange={(v) => cloneForm.setValue("targetTermId", v)}
                queryKey={["tgt-terms-clone", cloneForm.watch("targetAcademicYearId")]}
                fetcher={targetTermFetcher}
                enabled={Boolean(cloneForm.watch("targetAcademicYearId"))}
                getLabel={(t: any) => t.name}
                getValue={(t: any) => t.id}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCloneOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={cloneMutation.isPending}
                className="px-5 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-brand-900 disabled:opacity-50 flex items-center gap-2"
              >
                {cloneMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Clone Timetable
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
