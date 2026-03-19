import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  size?: number; // kept for API compatibility
  className?: string;
}

// ── Animation tuning ────────────────────────────────────────────────────────
const NUM_PAGES = 4;     // pages in the left stack
const CYCLE = 3.6;       // full loop duration (s)
const STAGGER = 0.58;    // delay between consecutive page flips
const FLIP_DUR = 0.62;   // time for one page to cross to the right

export default function LoadingSpinner({ fullScreen, className }: LoadingSpinnerProps) {
  const content = (
    <div className="flex flex-col items-center gap-6">
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

// ── Open book ────────────────────────────────────────────────────────────────
function OpenBook() {
  // Book dimensions — wide & flat to match the image
  const W = 210;   // total width (both pages + spine)
  const H = 58;    // height before perspective tilt
  const SW = 14;   // spine width
  const PW = (W - SW) / 2;  // 98px per page side

  return (
    <div
      style={{
        perspective: "480px",
        perspectiveOrigin: "50% 40%",
        width: W,
        height: H + 24, // extra for shadow offset
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
      }}
    >
      {/* Outer wrapper — rotated so book appears flat-open from above */}
      <div
        style={{
          position: "relative",
          width: W,
          height: H,
          transformStyle: "preserve-3d",
          transform: "rotateX(42deg)",
          marginTop: 8,
        }}
      >
        {/* ── Drop shadow ──────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            inset: "12px 10px",
            bottom: -18,
            borderRadius: "50%",
            background: "radial-gradient(ellipse at center, rgba(30,64,175,0.18) 0%, transparent 70%)",
            filter: "blur(6px)",
            transform: "translateZ(-4px) scaleY(0.5)",
            transformOrigin: "center bottom",
          }}
        />

        {/* ── Right page — static background ───────────────── */}
        <div
          style={{
            position: "absolute",
            left: PW + SW,
            top: 0,
            width: PW,
            height: H,
            background: "linear-gradient(108deg, #dbeafe 0%, #bfdbfe 100%)",
            borderRadius: "0 10px 10px 0",
            border: "1px solid rgba(30,64,175,0.12)",
            overflow: "hidden",
          }}
        >
          {/* Page content lines */}
          {[10, 18, 26, 34, 42].map((top, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top,
                left: 12,
                right: i % 2 === 0 ? 12 : 24,
                height: 1.5,
                background: "rgba(30,64,175,0.13)",
                borderRadius: 2,
              }}
            />
          ))}
        </div>

        {/* ── Left page — static base (shows when pages finish flipping) ─ */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: PW,
            height: H,
            background: "linear-gradient(72deg, #eff6ff 0%, #dbeafe 100%)",
            borderRadius: "10px 0 0 10px",
            border: "1px solid rgba(30,64,175,0.1)",
          }}
        />

        {/* ── Spine ────────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            left: PW,
            top: 0,
            width: SW,
            height: H,
            background: "linear-gradient(0deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)",
            zIndex: 20,
            boxShadow: "0 0 10px rgba(30,58,138,0.5)",
          }}
        />

        {/* ── Animated pages (left side → flip right) ──────── */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: PW,
            height: H,
            transformStyle: "preserve-3d",
          }}
        >
          {Array.from({ length: NUM_PAGES }).map((_, rawIdx) => {
            // Render in reverse order so page-0 sits on top (first to flip)
            const i = NUM_PAGES - 1 - rawIdx;

            const flipStart = i * STAGGER;
            const flipEnd = flipStart + FLIP_DUR;
            const t1 = Math.max(0.008, flipStart / CYCLE);
            const t2 = Math.min(0.89, flipEnd / CYCLE);

            // Colour: top page lightest → progressively deeper blue underneath
            const sat = 68 - rawIdx * 7;
            const lit = 93 - rawIdx * 4;

            return (
              <motion.div
                key={i}
                style={{
                  position: "absolute",
                  inset: 0,
                  // Pivot at the RIGHT edge — the spine
                  transformOrigin: "right center",
                  borderRadius: "10px 0 0 10px",
                  backgroundColor: `hsl(214, ${sat}%, ${lit}%)`,
                  border: "0.5px solid rgba(59,130,246,0.2)",
                  // Slight left shadow so pages look stacked
                  boxShadow: `-${1 + rawIdx}px 1px 4px rgba(0,0,0,0.07)`,
                  overflow: "hidden",
                }}
                animate={{
                  // 0 = flat left  |  -90 = edge-on at spine  |  -180 = flat right
                  rotateY: [0, 0, -180, -180, 0],
                }}
                transition={{
                  duration: CYCLE,
                  times: [0, t1, t2, 0.94, 1],
                  ease: ["linear", "easeInOut", "linear", "easeIn"],
                  repeat: Infinity,
                }}
              >
                {/* Content lines on each flippable page */}
                {[10, 18, 26].map((top, li) => (
                  <div
                    key={li}
                    style={{
                      position: "absolute",
                      top,
                      left: 12,
                      right: li === 1 ? 24 : 12,
                      height: 1.5,
                      background: "rgba(30,64,175,0.12)",
                      borderRadius: 2,
                    }}
                  />
                ))}
              </motion.div>
            );
          })}
        </div>

        {/* ── Page-stack edge (bottom strip, both sides) ───── */}
        {/* Left stack edge lines */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`le-${i}`}
            style={{
              position: "absolute",
              left: i * 2,
              top: H - 1,
              width: PW - i * 2,
              height: 3,
              background: `hsl(214, 60%, ${88 - i * 6}%)`,
              borderRadius: "0 0 0 2px",
              zIndex: 5 - i,
            }}
          />
        ))}
        {/* Right stack edge lines */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`re-${i}`}
            style={{
              position: "absolute",
              right: i * 2,
              top: H - 1,
              width: PW - i * 2,
              height: 3,
              background: `hsl(214, 50%, ${85 - i * 6}%)`,
              borderRadius: "0 0 2px 0",
              zIndex: 5 - i,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── "Loading" with letter bounce ─────────────────────────────────────────────
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
