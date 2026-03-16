import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { LogoFull } from "@/components/Logo";
import { BookOpen, GraduationCap, Users, BarChart3 } from "lucide-react";

const FEATURES = [
  { icon: BookOpen,       text: "Live & recorded lessons" },
  { icon: GraduationCap, text: "Exams, quizzes & assignments" },
  { icon: Users,          text: "Parent portal & communication" },
  { icon: BarChart3,      text: "Real-time analytics & reports" },
];

const STATS = [
  { value: "10K+",  label: "Students" },
  { value: "500+",  label: "Schools"  },
  { value: "99.9%", label: "Uptime"   },
];

function AttendanceWidget() {
  const avatars = [
    { init: "AM", bg: "bg-sky-400"    },
    { init: "BK", bg: "bg-emerald-400"},
    { init: "CN", bg: "bg-violet-400" },
    { init: "DT", bg: "bg-amber-400"  },
  ];

  return (
    <motion.div
      className="mt-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.5, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-white text-xs font-semibold">Today's Attendance</p>
          <p className="text-blue-200 text-[11px]">JSS 2A · 38 students</p>
        </div>
        <span className="flex items-center gap-1 bg-emerald-400/20 text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/10 rounded-full mb-3 overflow-hidden">
        <motion.div
          className="h-1.5 bg-emerald-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: "84%" }}
          transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex -space-x-1.5">
          {avatars.map((a) => (
            <div
              key={a.init}
              className={`h-6 w-6 rounded-full ${a.bg} flex items-center justify-center text-white text-[9px] font-bold ring-2 ring-[#0F2872]`}
            >
              {a.init}
            </div>
          ))}
          <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-white text-[9px] font-bold ring-2 ring-[#0F2872]">
            +34
          </div>
        </div>
        <div className="flex gap-3 text-[11px]">
          <span className="text-emerald-300 font-medium">32 present</span>
          <span className="text-red-300 font-medium">4 absent</span>
          <span className="text-amber-300 font-medium">2 late</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* ── Left decorative panel ──────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[44%] flex-col bg-[#0F2872] relative overflow-hidden">
        {/* Glow blobs */}
        <div className="absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full bg-blue-700/50 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[360px] h-[360px] rounded-full bg-indigo-600/30 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full px-10 py-12">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <LogoFull size={36} dark />
          </motion.div>

          {/* Headline */}
          <motion.div
            className="mt-14"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
          >
            <h1 className="text-[2.6rem] font-extrabold text-white leading-[1.1] tracking-tight">
              Your School,<br />
              <span className="text-[#60A5FA]">Fully Digital.</span>
            </h1>
            <p className="mt-4 text-blue-200/80 text-[15px] leading-relaxed max-w-[280px]">
              One platform for lessons, exams, attendance, fees, and parent communication.
            </p>
          </motion.div>

          {/* Feature list */}
          <motion.div
            className="mt-9 space-y-3.5"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.07, delayChildren: 0.3 } } }}
          >
            {FEATURES.map(({ icon: Icon, text }) => (
              <motion.div
                key={text}
                className="flex items-center gap-3"
                variants={{
                  hidden:  { opacity: 0, x: -12 },
                  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
                }}
              >
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-[#93C5FD]" />
                </div>
                <span className="text-sm text-blue-100">{text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Attendance widget */}
          <AttendanceWidget />

          {/* Stats */}
          <motion.div
            className="mt-auto pt-8 border-t border-white/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <div className="flex gap-8">
              {STATS.map(({ value, label }) => (
                <div key={label}>
                  <p className="text-[1.7rem] font-extrabold text-white leading-none">{value}</p>
                  <p className="text-[11px] text-blue-300 mt-1 uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Right form panel ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-100 p-6 lg:p-12">
        {/* Mobile-only logo */}
        <div className="lg:hidden mb-8">
          <LogoFull size={32} />
        </div>

        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <Outlet />
          </div>
        </motion.div>

        <p className="mt-6 text-xs text-slate-400">
          © {new Date().getFullYear()} LogosClass · Digital Campus
        </p>
      </div>
    </div>
  );
}
