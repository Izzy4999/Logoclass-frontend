import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, DateSelectArg } from "@fullcalendar/core";
import { Plus, Copy, Trash2, Loader2, CalendarDays } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import Modal from "@/components/shared/Modal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import InfiniteSelect from "@/components/shared/InfiniteSelect";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { timetableApi, type TimetableEntry, type DayOfWeek } from "@/api/timetable";
import { classesApi, gradeLevelsApi, academicYearsApi, subjectsApi } from "@/api/classes";
import { usersApi } from "@/api/users";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_MAP: Record<DayOfWeek, number> = {
  MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

const SUBJECT_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];

function subjectColor(subjectId: string) {
  let hash = 0;
  for (let i = 0; i < subjectId.length; i++) hash = subjectId.charCodeAt(i) + ((hash << 5) - hash);
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
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
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  periodLabel: z.string().optional(),
  scopeType: z.enum(["grade", "class"]),
});
type EntryFormData = z.infer<typeof entrySchema>;

const cloneSchema = z.object({
  sourceTermId: z.string().min(1, "Source term is required"),
  targetTermId: z.string().min(1, "Target term is required"),
  targetAcademicYearId: z.string().min(1, "Target academic year is required"),
});
type CloneFormData = z.infer<typeof cloneSchema>;

// ── View filter state ─────────────────────────────────────────────────────────

type ViewMode = "grade" | "class" | "teacher";

// ── Component ─────────────────────────────────────────────────────────────────

export default function TimetablePage() {
  const qc = useQueryClient();
  const { user, can, isTeacher, isStudent, isParent } = useAuth();
  const calendarRef = useRef<any>(null);

  const canManage = can("MANAGE_TIMETABLE" as any);
  const readOnly = isStudent || isParent;

  // Filter state
  const [viewMode, setViewMode] = useState<ViewMode>(isTeacher ? "teacher" : "class");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedGradeLevelId, setSelectedGradeLevelId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState(
    isTeacher ? (user?.id ?? "") : ""
  );

  // Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TimetableEntry | null>(null);
  const [prefill, setPrefill] = useState<{ dayOfWeek?: DayOfWeek; startTime?: string; endTime?: string } | null>(null);
  const [serverError, setServerError] = useState("");

  // ── Queries ──────────────────────────────────────────────────────────────

  const enabled = Boolean(selectedTermId && (
    (viewMode === "class" && selectedClassId) ||
    (viewMode === "grade" && selectedGradeLevelId) ||
    (viewMode === "teacher" && selectedTeacherId)
  ));

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["timetable", viewMode, selectedClassId, selectedGradeLevelId, selectedTeacherId, selectedTermId],
    queryFn: async () => {
      if (viewMode === "class") {
        const r = await timetableApi.forClass(selectedClassId, selectedTermId);
        return r.data.data ?? [];
      }
      if (viewMode === "grade") {
        const r = await timetableApi.forGrade(selectedGradeLevelId, selectedTermId);
        return r.data.data ?? [];
      }
      const r = await timetableApi.forTeacher(selectedTeacherId, selectedTermId);
      return r.data.data ?? [];
    },
    enabled,
  });

  // ── Calendar events ──────────────────────────────────────────────────────

  // We use a fixed "anchor" week: Mon 2000-01-03 to Sat 2000-01-08
  const calendarEvents = useMemo(() => {
    return entries.map((e) => {
      const dayNum = DAY_MAP[e.dayOfWeek];
      const date = new Date(2000, 0, 3 + (dayNum - 1)); // 2000-01-03 is Monday
      const dateStr = date.toISOString().split("T")[0];
      const color = subjectColor(e.subjectId);
      return {
        id: e.id,
        title: `${e.subject.name}\n${e.teacher.firstName} ${e.teacher.lastName}`,
        start: `${dateStr}T${e.startTime}`,
        end: `${dateStr}T${e.endTime}`,
        backgroundColor: color,
        borderColor: color,
        extendedProps: { entry: e },
      };
    });
  }, [entries]);

  // ── Mutations ────────────────────────────────────────────────────────────

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["timetable"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: EntryFormData) => {
      const { scopeType, ...rest } = data;
      return timetableApi.create({
        ...rest,
        gradeLevelId: scopeType === "grade" ? rest.gradeLevelId : undefined,
        classId: scopeType === "class" ? rest.classId : undefined,
      });
    },
    onSuccess: () => { toast.success("Entry created"); setCreateOpen(false); invalidate(); },
    onError: (e: any) => setServerError(e.response?.data?.message ?? "Failed to create"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => timetableApi.delete(id),
    onSuccess: () => { toast.success("Entry deleted"); setDeleteTarget(null); invalidate(); },
  });

  const cloneMutation = useMutation({
    mutationFn: (data: CloneFormData) => timetableApi.clone({
      ...data,
      gradeLevelId: viewMode === "grade" ? selectedGradeLevelId : undefined,
      classId: viewMode === "class" ? selectedClassId : undefined,
    }),
    onSuccess: (r) => {
      toast.success(r.data.data?.message ?? "Cloned");
      setCloneOpen(false);
      invalidate();
    },
    onError: (e: any) => setServerError(e.response?.data?.message ?? "Clone failed"),
  });

  // ── Form ─────────────────────────────────────────────────────────────────

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: { scopeType: "grade", dayOfWeek: "MON" },
  });
  const scopeType = watch("scopeType");
  const cloneForm = useForm<CloneFormData>({ resolver: zodResolver(cloneSchema) });

  function openCreate(slot?: { dayOfWeek?: DayOfWeek; startTime?: string; endTime?: string }) {
    reset({ scopeType: viewMode === "class" ? "class" : "grade", dayOfWeek: slot?.dayOfWeek ?? "MON" });
    if (slot?.startTime) setValue("startTime", slot.startTime);
    if (slot?.endTime) setValue("endTime", slot.endTime);
    if (selectedTermId) setValue("termId", selectedTermId);
    if (selectedAcademicYearId) setValue("academicYearId", selectedAcademicYearId);
    if (viewMode === "class" && selectedClassId) setValue("classId", selectedClassId);
    if (viewMode === "grade" && selectedGradeLevelId) setValue("gradeLevelId", selectedGradeLevelId);
    setServerError("");
    setPrefill(slot ?? null);
    setCreateOpen(true);
  }

  // ── Calendar handlers ────────────────────────────────────────────────────

  function handleDateSelect(arg: DateSelectArg) {
    if (!canManage) return;
    const d = arg.start;
    const day = d.getDay(); // 0=Sun,1=Mon...
    const dayKeys: DayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const dayOfWeek = dayKeys[day - 1] as DayOfWeek;
    const startTime = d.toTimeString().slice(0, 5);
    const end = arg.end;
    const endTime = end.toTimeString().slice(0, 5);
    openCreate({ dayOfWeek, startTime, endTime });
  }

  function handleEventClick(arg: EventClickArg) {
    const entry: TimetableEntry = arg.event.extendedProps.entry;
    if (canManage) setDeleteTarget(entry);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable"
        subtitle="Weekly schedule for classes and grade levels"
        actions={
          canManage ? (
            <div className="flex gap-2">
              <button
                onClick={() => { cloneForm.reset(); setServerError(""); setCloneOpen(true); }}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                <Copy size={16} /> Reuse Timetable
              </button>
              <button
                onClick={() => openCreate()}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                <Plus size={16} /> Add Slot
              </button>
            </div>
          ) : undefined
        }
      />

      {/* ── Filters ── */}
      <div className="card p-4 flex flex-wrap gap-4 items-end">
        {/* View mode (admin only) */}
        {canManage && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">View by</label>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              {(["grade", "class", "teacher"] as ViewMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                    viewMode === m ? "bg-primary-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Academic year */}
        <div className="flex flex-col gap-1 w-48">
          <label className="text-xs font-medium text-slate-500">Academic Year</label>
          <InfiniteSelect
            placeholder="Select year"
            value={selectedAcademicYearId}
            onChange={(v) => { setSelectedAcademicYearId(v); setSelectedTermId(""); }}
            fetchFn={(p) => academicYearsApi.list(p).then((r) => ({
              items: r.data.data?.items ?? [],
              total: r.data.data?.total ?? 0,
            }))}
            getLabel={(y: any) => y.name}
            getValue={(y: any) => y.id}
            queryKey="academic-years-select"
          />
        </div>

        {/* Term */}
        {selectedAcademicYearId && (
          <div className="flex flex-col gap-1 w-40">
            <label className="text-xs font-medium text-slate-500">Term</label>
            <InfiniteSelect
              placeholder="Select term"
              value={selectedTermId}
              onChange={setSelectedTermId}
              fetchFn={() => academicYearsApi.listTerms(selectedAcademicYearId).then((r) => ({
                items: r.data.data ?? [],
                total: (r.data.data ?? []).length,
              }))}
              getLabel={(t: any) => t.name}
              getValue={(t: any) => t.id}
              queryKey={`terms-select-${selectedAcademicYearId}`}
            />
          </div>
        )}

        {/* Grade / Class / Teacher filter */}
        {viewMode === "grade" && (
          <div className="flex flex-col gap-1 w-48">
            <label className="text-xs font-medium text-slate-500">Grade Level</label>
            <InfiniteSelect
              placeholder="Select grade"
              value={selectedGradeLevelId}
              onChange={setSelectedGradeLevelId}
              fetchFn={(p) => gradeLevelsApi.list(p).then((r) => ({
                items: r.data.data?.items ?? [],
                total: r.data.data?.total ?? 0,
              }))}
              getLabel={(g: any) => g.name}
              getValue={(g: any) => g.id}
              queryKey="grade-levels-select"
            />
          </div>
        )}
        {viewMode === "class" && (
          <div className="flex flex-col gap-1 w-48">
            <label className="text-xs font-medium text-slate-500">Class</label>
            <InfiniteSelect
              placeholder="Select class"
              value={selectedClassId}
              onChange={setSelectedClassId}
              fetchFn={(p) => classesApi.list(p).then((r) => ({
                items: r.data.data?.items ?? [],
                total: r.data.data?.total ?? 0,
              }))}
              getLabel={(c: any) => c.name}
              getValue={(c: any) => c.id}
              queryKey="classes-select"
            />
          </div>
        )}
        {viewMode === "teacher" && !isTeacher && (
          <div className="flex flex-col gap-1 w-48">
            <label className="text-xs font-medium text-slate-500">Teacher</label>
            <InfiniteSelect
              placeholder="Select teacher"
              value={selectedTeacherId}
              onChange={setSelectedTeacherId}
              fetchFn={(p) => usersApi.list({ ...p, role: "Teacher" }).then((r) => ({
                items: r.data.data?.items ?? [],
                total: r.data.data?.total ?? 0,
              }))}
              getLabel={(u: any) => `${u.firstName} ${u.lastName}`}
              getValue={(u: any) => u.id}
              queryKey="teachers-select"
            />
          </div>
        )}
      </div>

      {/* ── Calendar ── */}
      <div className="card p-4">
        {!selectedTermId ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <CalendarDays size={48} className="mb-3 opacity-30" />
            <p className="text-sm">Select an academic year and term to view the timetable</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={false}
            initialDate="2000-01-03"
            validRange={{ start: "2000-01-03", end: "2000-01-09" }}
            hiddenDays={[0]} // hide Sunday
            allDaySlot={false}
            selectable={canManage}
            selectMirror
            events={calendarEvents}
            slotMinTime="06:00:00"
            slotMaxTime="20:00:00"
            slotDuration="00:30:00"
            height="auto"
            dayHeaderFormat={{ weekday: "long" }}
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventContent={(arg) => (
              <div className="p-1 text-xs leading-tight overflow-hidden h-full">
                <div className="font-semibold truncate">{arg.event.extendedProps.entry.subject.name}</div>
                <div className="truncate opacity-80">
                  {arg.event.extendedProps.entry.teacher.firstName} {arg.event.extendedProps.entry.teacher.lastName}
                </div>
                {arg.event.extendedProps.entry.class && (
                  <div className="truncate opacity-70">{arg.event.extendedProps.entry.class.name}</div>
                )}
                {arg.event.extendedProps.entry.gradeLevel && !arg.event.extendedProps.entry.class && (
                  <div className="truncate opacity-70">{arg.event.extendedProps.entry.gradeLevel.name} (all)</div>
                )}
              </div>
            )}
          />
        )}
      </div>

      {/* ── Create Modal ── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Timetable Slot">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          {serverError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>}

          {/* Scope type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Applies to</label>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button type="button" onClick={() => setValue("scopeType", "grade")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${scopeType === "grade" ? "bg-primary-600 text-white" : "bg-white text-slate-600"}`}>
                Grade (all classes)
              </button>
              <button type="button" onClick={() => setValue("scopeType", "class")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${scopeType === "class" ? "bg-primary-600 text-white" : "bg-white text-slate-600"}`}>
                Specific Class
              </button>
            </div>
          </div>

          {/* Grade or Class picker */}
          {scopeType === "grade" ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Grade Level</label>
              <InfiniteSelect
                placeholder="Select grade"
                value={watch("gradeLevelId") ?? ""}
                onChange={(v) => setValue("gradeLevelId", v)}
                fetchFn={(p) => gradeLevelsApi.list(p).then((r) => ({ items: r.data.data?.items ?? [], total: r.data.data?.total ?? 0 }))}
                getLabel={(g: any) => g.name}
                getValue={(g: any) => g.id}
                queryKey="grade-modal"
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
                fetchFn={(p) => classesApi.list(p).then((r) => ({ items: r.data.data?.items ?? [], total: r.data.data?.total ?? 0 }))}
                getLabel={(c: any) => c.name}
                getValue={(c: any) => c.id}
                queryKey="class-modal"
              />
              {errors.classId && <p className="text-xs text-red-500 mt-1">{errors.classId.message}</p>}
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
            <InfiniteSelect
              placeholder="Select subject"
              value={watch("subjectId") ?? ""}
              onChange={(v) => setValue("subjectId", v)}
              fetchFn={(p) => subjectsApi.list(p).then((r) => ({ items: r.data.data?.items ?? [], total: r.data.data?.total ?? 0 }))}
              getLabel={(s: any) => s.name}
              getValue={(s: any) => s.id}
              queryKey="subjects-modal"
            />
            {errors.subjectId && <p className="text-xs text-red-500 mt-1">{errors.subjectId.message}</p>}
          </div>

          {/* Teacher */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Teacher</label>
            <InfiniteSelect
              placeholder="Select teacher"
              value={watch("teacherId") ?? ""}
              onChange={(v) => setValue("teacherId", v)}
              fetchFn={(p) => usersApi.list(p).then((r) => ({ items: r.data.data?.items ?? [], total: r.data.data?.total ?? 0 }))}
              getLabel={(u: any) => `${u.firstName} ${u.lastName}`}
              getValue={(u: any) => u.id}
              queryKey="teachers-modal"
            />
            {errors.teacherId && <p className="text-xs text-red-500 mt-1">{errors.teacherId.message}</p>}
          </div>

          {/* Day */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Day</label>
            <select {...register("dayOfWeek")} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              {(["MON", "TUE", "WED", "THU", "FRI", "SAT"] as DayOfWeek[]).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
              <input type="time" {...register("startTime")} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              {errors.startTime && <p className="text-xs text-red-500 mt-1">{errors.startTime.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
              <input type="time" {...register("endTime")} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              {errors.endTime && <p className="text-xs text-red-500 mt-1">{errors.endTime.message}</p>}
            </div>
          </div>

          {/* Period label */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Period Label <span className="text-slate-400">(optional)</span></label>
            <input {...register("periodLabel")} placeholder="e.g. Period 1" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
              {createMutation.isPending && <Loader2 size={14} className="animate-spin" />} Add Slot
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Clone Modal ── */}
      <Modal open={cloneOpen} onClose={() => setCloneOpen(false)} title="Reuse Timetable">
        <form onSubmit={cloneForm.handleSubmit((d) => cloneMutation.mutate(d))} className="space-y-4">
          {serverError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>}
          <p className="text-sm text-slate-500">Copy all timetable entries from one term into another term or academic year. Useful for reusing the same schedule in a new session.</p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Source Term</label>
            <InfiniteSelect
              placeholder="Select source term"
              value={cloneForm.watch("sourceTermId") ?? ""}
              onChange={(v) => cloneForm.setValue("sourceTermId", v)}
              fetchFn={() => academicYearsApi.listTerms(selectedAcademicYearId).then((r) => ({ items: r.data.data ?? [], total: (r.data.data ?? []).length }))}
              getLabel={(t: any) => t.name}
              getValue={(t: any) => t.id}
              queryKey={`source-terms-${selectedAcademicYearId}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Target Academic Year</label>
            <InfiniteSelect
              placeholder="Select target year"
              value={cloneForm.watch("targetAcademicYearId") ?? ""}
              onChange={(v) => cloneForm.setValue("targetAcademicYearId", v)}
              fetchFn={(p) => academicYearsApi.list(p).then((r) => ({ items: r.data.data?.items ?? [], total: r.data.data?.total ?? 0 }))}
              getLabel={(y: any) => y.name}
              getValue={(y: any) => y.id}
              queryKey="target-year-clone"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Target Term</label>
            <InfiniteSelect
              placeholder="Select target term"
              value={cloneForm.watch("targetTermId") ?? ""}
              onChange={(v) => cloneForm.setValue("targetTermId", v)}
              fetchFn={() => academicYearsApi.listTerms(cloneForm.watch("targetAcademicYearId")).then((r) => ({ items: r.data.data ?? [], total: (r.data.data ?? []).length }))}
              getLabel={(t: any) => t.name}
              getValue={(t: any) => t.id}
              queryKey={`target-terms-${cloneForm.watch("targetAcademicYearId")}`}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setCloneOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={cloneMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
              {cloneMutation.isPending && <Loader2 size={14} className="animate-spin" />} Clone Timetable
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove Slot"
        description={`Remove ${deleteTarget?.subject.name} on ${deleteTarget?.dayOfWeek} at ${deleteTarget?.startTime}?`}
        confirmLabel="Remove"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
