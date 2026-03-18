import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Video, PlayCircle, Users } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { lessonsApi } from "@/api/lessons";
import { liveClassesApi } from "@/api/live-classes";
import { formatDate } from "@/lib/utils";
import type { LessonAttachment } from "@/types/lesson";
import type { LiveClass } from "@/types/notification";

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    SCHEDULED: "bg-blue-50 text-blue-700 border border-blue-200",
    LIVE: "bg-green-50 text-green-700 border border-green-200 animate-pulse",
    ENDED: "bg-slate-100 text-slate-500 border border-slate-200",
    CANCELLED: "bg-red-50 text-red-500 border border-red-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? map.SCHEDULED}`}>
      {status === "LIVE" && <span className="mr-1 h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />}
      {status}
    </span>
  );
}

export default function LessonDetail() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["lessons", id],
    queryFn: () => lessonsApi.getById(id!),
    enabled: !!id,
  });

  // Live sessions linked to this lesson
  const { data: liveData } = useQuery({
    queryKey: ["live-classes", { lessonId: id }],
    queryFn: () => liveClassesApi.list({ lessonId: id!, limit: 50 }),
    enabled: !!id,
  });

  const lesson = data?.data?.data;
  const attachments: LessonAttachment[] = lesson?.attachments ?? [];
  const liveSessions: LiveClass[] = liveData?.data?.data ?? [];

  if (isLoading) return <LoadingSpinner />;

  if (!lesson) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Lesson not found.</p>
      </div>
    );
  }

  // Split sessions for display
  const upcoming = liveSessions.filter((s) => s.status === "SCHEDULED" || s.status === "LIVE");
  const past = liveSessions.filter((s) => s.status === "ENDED");

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <PageHeader
        title={lesson.title}
        action={
          <Link to=".." className="text-sm text-muted-foreground hover:text-foreground">
            Back to Lessons
          </Link>
        }
      />

      {/* ── Lesson info ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              lesson.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {lesson.isPublished ? "Published" : "Draft"}
          </span>
          {lesson.subject && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
              {lesson.subject.code ? `${lesson.subject.code} · ` : ""}{lesson.subject.name}
            </span>
          )}
          <span className="text-muted-foreground text-xs">Order: {lesson.order}</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{lesson.description ?? "No description."}</p>
        <p className="text-xs text-muted-foreground">Created: {formatDate(lesson.createdAt)}</p>
      </div>

      {/* ── Materials / Attachments ──────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
        <h2 className="text-base font-semibold mb-4">
          Materials ({attachments.length})
        </h2>
        {attachments.length === 0 ? (
          <EmptyState title="No materials" description="No files or links attached to this lesson." />
        ) : (
          <div className="space-y-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{att.title ?? "Untitled"}</p>
                  <p className="text-xs text-muted-foreground">{att.contentType}</p>
                </div>
                <a
                  href={att.contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-xs font-medium"
                >
                  Open
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Live Sessions ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            Live Sessions ({liveSessions.length})
          </h2>
          <Link
            to={`/live-classes/new`}
            className="text-xs text-primary hover:underline"
          >
            + Schedule Session
          </Link>
        </div>

        {liveSessions.length === 0 ? (
          <EmptyState
            title="No live sessions"
            description="No live sessions have been scheduled for this lesson yet."
          />
        ) : (
          <div className="space-y-4">
            {/* Upcoming / Live */}
            {upcoming.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Upcoming & Live
                </p>
                <div className="space-y-2">
                  {upcoming.map((s) => (
                    <SessionCard key={s.id} session={s} />
                  ))}
                </div>
              </div>
            )}

            {/* Past / Recordings */}
            {past.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Past Sessions & Recordings
                </p>
                <div className="space-y-2">
                  {past.map((s) => (
                    <SessionCard key={s.id} session={s} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Quiz ─────────────────────────────────────────────────────────── */}
      {lesson.quiz && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          <h2 className="text-base font-semibold mb-2">Quiz</h2>
          <p className="text-sm font-medium">{lesson.quiz.title}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {lesson.quiz.questionCount} questions
            {lesson.quiz.timeLimit ? ` · ${lesson.quiz.timeLimit} min limit` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Session card component ────────────────────────────────────────────────────
function SessionCard({ session }: { session: LiveClass }) {
  const scheduledDate = new Date(session.scheduledAt);
  const isLive = session.status === "LIVE";
  const isEnded = session.status === "ENDED";

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 text-sm gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-foreground truncate">{session.title}</p>
          <StatusBadge status={session.status} />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {scheduledDate.toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {scheduledDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            {session.duration ? ` · ${session.duration} min` : ""}
          </span>
          {session.attendeeCount != null && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {session.attendeeCount}
            </span>
          )}
        </div>
      </div>

      {/* Action button */}
      <div className="shrink-0">
        {isEnded && session.recordingUrl ? (
          <a
            href={session.recordingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 text-white rounded-lg hover:bg-slate-700"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            Watch Recording
          </a>
        ) : isEnded ? (
          <span className="text-xs text-muted-foreground italic">No recording</span>
        ) : (
          <Link
            to={`/live-classes/${session.id}/room`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg ${
              isLive
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-primary text-white hover:bg-primary/90"
            }`}
          >
            <Video className="h-3.5 w-3.5" />
            {isLive ? "Join Now" : "Preview"}
          </Link>
        )}
      </div>
    </div>
  );
}
