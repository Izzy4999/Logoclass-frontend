import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  size?: number; // kept for API compatibility (unused)
  className?: string;
}

// ── Tuning knobs ────────────────────────────────────────────────────────────
const NUM_PAGES = 5;
const CYCLE = 3.8; // total loop duration (seconds)
const STAGGER = 0.52; // delay between consecutive page flips
const FLIP_DURATION = 0.56; // how long each single flip takes

export default function LoadingSpinner({ fullScreen, className }: LoadingSpinnerProps) {
  const content = (
    <div className="flex flex-col items-center gap-5">
      <OpenBook />
      <BouncingLabel />
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        {content}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center p-8", className)}>
      {content}
    </div>
  );
}

// ── Book component ───────────────────────────────────────────────────────────
function OpenBook() {
  return (
    <div
      style={{ perspective: "720px", perspectiveOrigin: "50% 55%", width: 116, height: 96 }}
      className="flex items-center justify-center"
    >
      <div
        style={{
          position: "relative",
          width: 108,
          height: 78,
          transformStyle: "preserve-3d",
          transform: "rotateX(24deg) rotateY(-6deg)",
        }}
      >
        {/* ── Shadow ──────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            bottom: -14,
            left: "8%",
            right: "8%",
            height: 12,
            background: "radial-gradient(ellipse at center, rgba(30,64,175,0.22) 0%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(5px)",
            transform: "translateZ(-2px)",
          }}
        />

        {/* ── Left cover ──────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 50,
            height: 78,
            background: "linear-gradient(152deg, #2563eb 0%, #1e40af 100%)",
            borderRadius: "4px 0 0 4px",
            boxShadow: "-4px 6px 20px rgba(30,64,175,0.38)",
          }}
        >
          {/* Cover decoration lines */}
          <div style={{ position: "absolute", top: 11, left: 9, right: 9, height: 2, background: "rgba(255,255,255,0.28)", borderRadius: 2 }} />
          <div style={{ position: "absolute", top: 18, left: 9, right: 20, height: 1.5, background: "rgba(255,255,255,0.18)", borderRadius: 2 }} />
          <div style={{ position: "absolute", top: 24, left: 9, right: 15, height: 1.5, background: "rgba(255,255,255,0.18)", borderRadius: 2 }} />
          <div style={{ position: "absolute", top: 30, left: 9, right: 22, height: 1.5, background: "rgba(255,255,255,0.12)", borderRadius: 2 }} />
          {/* Small decorative square bottom-left */}
          <div style={{ position: "absolute", bottom: 11, left: 9, width: 9, height: 9, border: "1.5px solid rgba(255,255,255,0.22)", borderRadius: 2 }} />
        </div>

        {/* ── Spine ───────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            left: 50,
            top: 0,
            width: 8,
            height: 78,
            background: "linear-gradient(90deg, #172554 0%, #1e3a8a 60%, #1d4ed8 100%)",
            zIndex: 30,
          }}
        />

        {/* ── Flipping pages (right side) ─────────────────── */}
        <div
          style={{
            position: "absolute",
            left: 58,
            top: 4,
            width: 44,
            height: 70,
            transformStyle: "preserve-3d",
          }}
        >
          {Array.from({ length: NUM_PAGES }).map((_, rawIdx) => {
            // Render in reverse so the first page to flip sits on top visually
            const i = NUM_PAGES - 1 - rawIdx;
            const flipStart = i * STAGGER;
            const flipEnd = flipStart + FLIP_DURATION;
            const t1 = Math.max(0.005, flipStart / CYCLE);
            const t2 = Math.min(0.88, flipEnd / CYCLE);

            // Colour: lightest page on top, grading slightly darker below
            const sat = 72 - rawIdx * 5;
            const lit = 94 - rawIdx * 3;

            return (
              <motion.div
                key={i}
                style={{
                  position: "absolute",
                  inset: 0,
                  transformOrigin: "left center",
                  borderRadius: "0 4px 4px 0",
                  backgroundColor: `hsl(214, ${sat}%, ${lit}%)`,
                  border: "0.5px solid rgba(59,130,246,0.18)",
                  boxShadow: `${1 + rawIdx * 0.6}px 1px 4px rgba(0,0,0,0.07)`,
                }}
                animate={{
                  // 0 → hold → flip → hold flipped → snap back
                  rotateY: [0, 0, -176, -176, 0],
                }}
                transition={{
                  duration: CYCLE,
                  times: [0, t1, t2, 0.93, 1],
                  ease: ["linear", "easeInOut", "linear", "easeIn"],
                  repeat: Infinity,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── "Loading" with per-letter bounce ────────────────────────────────────────
function BouncingLabel() {
  return (
    <div className="flex items-end gap-[1px]">
      {"Loading".split("").map((char, i) => (
        <motion.span
          key={i}
          className="text-[13px] font-semibold tracking-wider text-primary/70"
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 1.0,
            delay: i * 0.09,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {char}
        </motion.span>
      ))}
    </div>
  );
}
