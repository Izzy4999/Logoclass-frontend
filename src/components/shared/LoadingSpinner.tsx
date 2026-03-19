import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  size?: number; // kept for API compatibility
  className?: string;
}

// ── Animation constants ──────────────────────────────────────────────────────
const NUM_PAGES = 4;     // pages in left stack that flip to the right
const CYCLE     = 3.6;   // full loop duration (seconds)
const STAGGER   = 0.55;  // delay between consecutive pages
const FLIP_DUR  = 0.60;  // time for one page to cross to the right

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

// ── Open Book ────────────────────────────────────────────────────────────────
function OpenBook() {
  const SW = 12;          // spine width
  const PW = 100;         // page width per side
  const H  = 68;          // page height
  const W  = PW * 2 + SW; // 212 total

  return (
    /*
     * perspective on the wrapper gives depth to the rotateY flips.
     * The book itself has NO rotateX so both pages face the viewer
     * just like the reference image.
     */
    <div
      style={{
        perspective: "600px",
        perspectiveOrigin: "50% 50%",
        width: W,
        height: H + 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: W,
          height: H,
          transformStyle: "preserve-3d",
          // ← NO rotateX — book faces upward, pages visible left & right
        }}
      >
        {/* ── Soft drop shadow ─────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: -14,
            height: 14,
            background:
              "radial-gradient(ellipse at center, rgba(30,64,175,0.16) 0%, transparent 70%)",
            filter: "blur(6px)",
          }}
        />

        {/* ── RIGHT page (static) ──────────────────────────── */}
        <div
          style={{
            position: "absolute",
            left: PW + SW,
            top: 0,
            width: PW,
            height: H,
            background: "linear-gradient(115deg, #dbeafe 0%, #bfdbfe 100%)",
            borderRadius: "0 14px 14px 0",
            border: "1px solid rgba(30,64,175,0.14)",
            overflow: "hidden",
          }}
        >
          {[12, 21, 30, 39, 48].map((top, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top,
                left: 14,
                right: i % 2 === 0 ? 14 : 28,
                height: 1.5,
                background: "rgba(30,64,175,0.14)",
                borderRadius: 2,
              }}
            />
          ))}
        </div>

        {/* ── LEFT page base (shows once all pages have flipped) ─ */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: PW,
            height: H,
            background: "linear-gradient(65deg, #eff6ff 0%, #dbeafe 100%)",
            borderRadius: "14px 0 0 14px",
            border: "1px solid rgba(30,64,175,0.10)",
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
            background:
              "linear-gradient(180deg, #3b82f6 0%, #1e40af 45%, #1e3a8a 100%)",
            zIndex: 20,
            boxShadow: "0 0 10px rgba(30,58,138,0.35)",
          }}
        />

        {/* ── Animated pages: LEFT side → flip RIGHT ───────── */}
        {/*
         * Each page is in a container that spans the LEFT half only.
         * transformOrigin "right center" = pivot at the spine.
         * rotateY 0→-180 sends the page over to the right side.
         * preserve-3d on every level lets the flipped page appear
         * geometrically on the right side of the book.
         */}
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
            // Render in reverse so page-0 sits on top (first to flip)
            const i = NUM_PAGES - 1 - rawIdx;

            const flipStart = i * STAGGER;
            const flipEnd   = flipStart + FLIP_DUR;
            const t1 = Math.max(0.008, flipStart / CYCLE);
            const t2 = Math.min(0.88,  flipEnd   / CYCLE);

            // Colour gradient: lightest on top → deeper below
            const sat = 70 - rawIdx * 7;
            const lit = 94 - rawIdx * 4;

            return (
              <motion.div
                key={i}
                style={{
                  position: "absolute",
                  inset: 0,
                  // ← pivot = spine (right edge of this element)
                  transformOrigin: "right center",
                  borderRadius: "14px 0 0 14px",
                  backgroundColor: `hsl(214, ${sat}%, ${lit}%)`,
                  border: "0.5px solid rgba(59,130,246,0.22)",
                  boxShadow: `-${1 + rawIdx}px 2px 5px rgba(0,0,0,0.07)`,
                  overflow: "hidden",
                }}
                animate={{
                  // flat-left → edge-on at spine → flat-right → hold → snap back
                  rotateY: [0, 0, -180, -180, 0],
                }}
                transition={{
                  duration: CYCLE,
                  times: [0, t1, t2, 0.94, 1],
                  ease: ["linear", "easeInOut", "linear", "easeIn"],
                  repeat: Infinity,
                }}
              >
                {/* Content lines on each flipping page */}
                {[12, 21, 30].map((top, li) => (
                  <div
                    key={li}
                    style={{
                      position: "absolute",
                      top,
                      left: 14,
                      right: li === 1 ? 28 : 14,
                      height: 1.5,
                      background: "rgba(30,64,175,0.11)",
                      borderRadius: 2,
                    }}
                  />
                ))}
              </motion.div>
            );
          })}
        </div>

        {/* ── Page-stack depth strips (bottom edge, both sides) ─ */}
        {[0, 1, 2].map((i) => (
          <div
            key={`ls-${i}`}
            style={{
              position: "absolute",
              left: i * 2,
              bottom: -(i + 1) * 3,
              width: PW - i * 2,
              height: 3,
              background: `hsl(214, 55%, ${86 - i * 7}%)`,
              borderRadius: "0 0 0 3px",
            }}
          />
        ))}
        {[0, 1, 2].map((i) => (
          <div
            key={`rs-${i}`}
            style={{
              position: "absolute",
              right: i * 2,
              bottom: -(i + 1) * 3,
              width: PW - i * 2,
              height: 3,
              background: `hsl(214, 48%, ${83 - i * 7}%)`,
              borderRadius: "0 0 3px 0",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── "Loading" with per-letter bounce ─────────────────────────────────────────
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
