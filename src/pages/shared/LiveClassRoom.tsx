import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ChevronLeft, Video, Users, Clock, ExternalLink,
  Wifi, WifiOff, Calendar, BookOpen, Loader2, Maximize2, X,
} from "lucide-react";
import {
  LiveKitRoom,
  VideoConference,
  ControlBar,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { liveClassesApi } from "@/api/live-classes";
import { formatDate } from "@/lib/utils";

// LiveKit server URL — set VITE_LIVEKIT_URL in .env.local
// e.g. VITE_LIVEKIT_URL=wss://your-livekit-server.io
const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL as string | undefined;

// ── Helpers ───────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: {
  icon: React.ElementType; label: string; value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-slate-50 flex items-center justify-center mt-0.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const map: Record<string, string> = {
    LIVE:      "bg-green-100 text-green-700 border border-green-200",
    SCHEDULED: "bg-blue-100 text-blue-700 border border-blue-200",
    ENDED:     "bg-slate-100 text-slate-500 border border-slate-200",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${map[status] ?? "bg-slate-100 text-slate-500"}`}>
      {status === "LIVE" && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600" />
        </span>
      )}
      {status}
    </span>
  );
}

// ── In-app LiveKit room ───────────────────────────────────────────────────────
function InAppRoom({ token, onLeave }: { token: string; onLeave: () => void }) {
  const serverUrl = LIVEKIT_URL;

  if (!serverUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <WifiOff className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">LiveKit server not configured</p>
        <p className="text-xs text-muted-foreground">
          Set <code className="bg-slate-100 px-1 rounded">VITE_LIVEKIT_URL</code> in your <code className="bg-slate-100 px-1 rounded">.env.local</code> to enable in-app video.
        </p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      video
      audio
      onDisconnected={onLeave}
      style={{ height: "100%", borderRadius: 12 }}
    >
      <VideoConference />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LiveClassRoom() {
  const { id } = useParams<{ id: string }>();
  const [joined, setJoined] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { data: classData, isLoading: classLoading } = useQuery({
    queryKey: ["live-classes", id],
    queryFn: () => liveClassesApi.getById(id!),
    enabled: !!id,
  });

  const {
    data: joinData,
    isLoading: joinLoading,
    isError: joinError,
  } = useQuery({
    queryKey: ["live-classes", id, "join"],
    queryFn: () => liveClassesApi.join(id!),
    enabled: !!id,
    retry: false,
  });

  const liveClass = classData?.data?.data;
  const joinInfo  = joinData?.data?.data;

  if (classLoading) return <LoadingSpinner />;

  // ── Fullscreen in-app room ────────────────────────────────────────────────
  if (joined && joinInfo?.token) {
    return (
      <div className={`${expanded ? "fixed inset-0 z-50" : "relative"} bg-slate-900 rounded-xl overflow-hidden`}
        style={{ height: expanded ? "100vh" : "80vh" }}
      >
        <div className="absolute top-3 right-3 z-10 flex gap-2">
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
            title={expanded ? "Exit fullscreen" : "Fullscreen"}
          >
            {expanded ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setJoined(false)}
            className="px-3 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-600 text-white text-xs font-medium"
          >
            Leave Class
          </button>
        </div>
        <InAppRoom token={joinInfo.token} onLeave={() => setJoined(false)} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={liveClass?.title ?? "Live Class Room"}
        action={
          <Link
            to=".."
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Live Classes
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Details panel */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" /> Class Details
            </h3>
            <StatusBadge status={liveClass?.status} />
          </div>

          <div className="space-y-0.5">
            <InfoRow icon={BookOpen} label="Title" value={liveClass?.title ?? "—"} />
            {(liveClass as any)?.subject?.name && (
              <InfoRow icon={BookOpen} label="Subject" value={(liveClass as any).subject.name} />
            )}
            {(liveClass as any)?.class?.name && (
              <InfoRow icon={Users} label="Class" value={(liveClass as any).class.name} />
            )}
            {(liveClass as any)?.teacher && (
              <InfoRow icon={Video} label="Teacher"
                value={`${(liveClass as any).teacher.firstName} ${(liveClass as any).teacher.lastName}`}
              />
            )}
            {liveClass?.scheduledAt && (
              <InfoRow icon={Calendar} label="Scheduled" value={formatDate(liveClass.scheduledAt)} />
            )}
            {liveClass?.duration && (
              <InfoRow icon={Clock} label="Duration" value={`${liveClass.duration} minutes`} />
            )}
          </div>
        </motion.div>

        {/* Join / room panel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
          className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5"
        >
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-5">
            <Wifi className="h-4 w-4 text-primary" /> Room Access
          </h3>

          {joinLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Connecting to room…</p>
            </div>
          ) : joinInfo ? (
            <div className="flex flex-col items-center text-center py-8 px-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="relative mb-6"
              >
                <span className="absolute inset-0 rounded-full bg-green-400 opacity-20 animate-ping" />
                <div className="relative h-20 w-20 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center">
                  <Wifi className="h-9 w-9 text-green-600" />
                </div>
              </motion.div>

              <h2 className="text-xl font-bold text-foreground mb-1">Room is Live</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Room: <span className="font-mono font-semibold text-foreground">{joinInfo.roomName}</span>
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                {/* In-app join (requires VITE_LIVEKIT_URL) */}
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setJoined(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-xl shadow-sm"
                >
                  <Video className="h-4 w-4" /> Join In-App
                </motion.button>

                {/* External fallback */}
                {joinInfo.url && (
                  <motion.a
                    href={joinInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 border border-slate-200 text-foreground text-sm font-semibold rounded-xl hover:bg-slate-50"
                  >
                    <ExternalLink className="h-4 w-4" /> Open in Browser
                  </motion.a>
                )}
              </div>

              {!LIVEKIT_URL && (
                <p className="text-xs text-muted-foreground mt-5 bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg">
                  <strong>Note:</strong> In-app video requires <code>VITE_LIVEKIT_URL</code> to be set. Use "Open in Browser" as a fallback.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center text-center py-10 px-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 240, damping: 22 }}
                className="h-20 w-20 rounded-full bg-slate-50 border-2 border-slate-200 flex items-center justify-center mb-6"
              >
                <WifiOff className="h-9 w-9 text-slate-400" />
              </motion.div>

              <h2 className="text-xl font-bold text-foreground mb-1">Not Live Yet</h2>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                {joinError
                  ? "This class hasn't started yet or you don't have access."
                  : "The class room isn't active. It will become available when the teacher starts the session."}
              </p>

              {liveClass?.scheduledAt && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-xl border border-blue-100">
                  <Calendar className="h-4 w-4" />
                  Scheduled for {formatDate(liveClass.scheduledAt)}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
