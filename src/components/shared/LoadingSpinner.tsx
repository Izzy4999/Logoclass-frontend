import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  size?: number; // kept for API compatibility
  className?: string;
}

// ── Book dimensions ──────────────────────────────────────────────────────────
const PAGE_W  = 92;   // width of each page half
const PAGE_H  = 120;  // height of the book
const SPINE_W = 12;   // spine width
const BOOK_W  = PAGE_W * 2 + SPINE_W; // 196

export default function LoadingSpinner({ fullScreen, className }: LoadingSpinnerProps) {
  const content = (
    <div className="flex flex-col items-center gap-7">
      <BookAnimation />
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

// ── Book animation ────────────────────────────────────────────────────────────
function BookAnimation() {
  const sceneRef  = useRef<HTMLDivElement>(null);
  const coverRef  = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cover  = coverRef.current;
    const scene  = sceneRef.current;
    const shadow = shadowRef.current;
    if (!cover || !scene || !shadow) return;

    // ── Starting state ────────────────────────────────────────────────────
    gsap.set(cover,  { rotateY: 0 });
    gsap.set(shadow, { opacity: 0 });
    gsap.set(scene,  { scale: 1 });

    // ── Main timeline ─────────────────────────────────────────────────────
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.25 });

    // Phase 1 — OPEN (right cover flips from 0° → -180°)
    tl
      // shadow fades in as cover lifts, peaks at midpoint, fades out
      .to(shadow, { opacity: 0.38, duration: 0.6, ease: "power2.in" },   0)
      .to(cover,  { rotateY: -180, duration: 1.25, ease: "power2.inOut" }, 0)
      .to(shadow, { opacity: 0,    duration: 0.6, ease: "power2.out" },  0.65)

    // Fully open — subtle bounce on the whole book
      .to(scene, { scale: 1.05, duration: 0.18, ease: "power2.out" },      "+=0.35")
      .to(scene, { scale: 1,    duration: 0.45, ease: "elastic.out(1,0.5)" })

    // Hold open
      .to({}, { duration: 0.6 })

    // Phase 2 — CLOSE (cover flips back from -180° → 0°)
      .to(shadow, { opacity: 0.28, duration: 0.45, ease: "power2.in" })
      .to(cover,  { rotateY: 0,    duration: 0.95, ease: "power2.inOut" }, "-=0.45")
      .to(shadow, { opacity: 0,    duration: 0.45, ease: "power2.out" },   "-=0.45")

    // Hold closed before next loop
      .to({}, { duration: 0.3 });

    return () => { tl.kill(); };
  }, []);

  return (
    /*
     * perspective is on the outer wrapper so the rotateY flip has
     * natural 3D depth. The book container uses preserve-3d so every
     * child lives in the same 3D space.
     */
    <div
      style={{
        perspective: "900px",
        perspectiveOrigin: "50% 50%",
        width: BOOK_W,
        height: PAGE_H + 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        ref={sceneRef}
        style={{
          position: "relative",
          width: BOOK_W,
          height: PAGE_H,
          transformStyle: "preserve-3d",
        }}
      >
        {/* ── Drop shadow beneath book ──────────────────────── */}
        <div
          style={{
            position: "absolute",
            left: "8%", right: "8%",
            bottom: -18,
            height: 18,
            background:
              "radial-gradient(ellipse at center, rgba(30,64,175,0.22) 0%, transparent 70%)",
            filter: "blur(7px)",
          }}
        />

        {/* ── LEFT inside page (static, revealed as cover opens) ── */}
        <div
          style={{
            position: "absolute",
            left: 0, top: 0,
            width: PAGE_W, height: PAGE_H,
            background: "linear-gradient(140deg, #f8faff 0%, #eff6ff 100%)",
            borderRadius: "12px 0 0 12px",
            border: "1px solid rgba(30,64,175,0.10)",
            overflow: "hidden",
          }}
        >
          {/* Content lines */}
          {[16,27,38,49,60,71,84].map((top, i) => (
            <div key={i} style={{
              position: "absolute", top, left: 14,
              right: [14,28,14,20,14,28,36][i],
              height: 1.5,
              background: "rgba(30,64,175,0.1)",
              borderRadius: 2,
            }} />
          ))}
          {/* Small decorative circle */}
          <div style={{
            position: "absolute", bottom: 18, left: 14,
            width: 30, height: 30, borderRadius: "50%",
            background: "rgba(30,64,175,0.07)",
            border: "1px solid rgba(30,64,175,0.12)",
          }} />
        </div>

        {/* ── LEFT page-stack strips (book thickness, left side) ── */}
        {[0,1,2].map((i) => (
          <div key={`ls${i}`} style={{
            position: "absolute",
            left: i * 2, bottom: -(i + 1) * 3,
            width: PAGE_W - i * 2, height: 3,
            background: `hsl(214,50%,${88 - i * 8}%)`,
            borderRadius: "0 0 0 3px",
          }} />
        ))}

        {/* ── SPINE ────────────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            left: PAGE_W, top: 0,
            width: SPINE_W, height: PAGE_H,
            background:
              "linear-gradient(180deg, #3b82f6 0%, #1e40af 45%, #1e3a8a 100%)",
            transform: "translateZ(2px)", // always in front in 3D space
            boxShadow: "0 0 12px rgba(30,58,138,0.45)",
          }}
        />

        {/* ── RIGHT inside page (visible when cover is fully open) ── */}
        <div
          style={{
            position: "absolute",
            left: PAGE_W + SPINE_W, top: 0,
            width: PAGE_W, height: PAGE_H,
            background: "linear-gradient(40deg, #eff6ff 0%, #f8faff 100%)",
            borderRadius: "0 12px 12px 0",
            border: "1px solid rgba(30,64,175,0.10)",
            overflow: "hidden",
          }}
        >
          {[16,27,38,49,60,71,84].map((top, i) => (
            <div key={i} style={{
              position: "absolute", top,
              left: [28,14,28,14,20,14,36][i],
              right: 14,
              height: 1.5,
              background: "rgba(30,64,175,0.1)",
              borderRadius: 2,
            }} />
          ))}
          <div style={{
            position: "absolute", bottom: 18, right: 14,
            width: 30, height: 30, borderRadius: "50%",
            background: "rgba(30,64,175,0.07)",
            border: "1px solid rgba(30,64,175,0.12)",
          }} />
        </div>

        {/* ── RIGHT page-stack strips ────────────────────────── */}
        {[0,1,2].map((i) => (
          <div key={`rs${i}`} style={{
            position: "absolute",
            right: i * 2, bottom: -(i + 1) * 3,
            width: PAGE_W - i * 2, height: 3,
            background: `hsl(214,44%,${85 - i * 8}%)`,
            borderRadius: "0 0 3px 0",
          }} />
        ))}

        {/* ── Flip shadow overlay on left page ─────────────────── */}
        {/*  Fades in/out in sync with the cover rotation to mimic
            the shadow a real page casts as it flips.            */}
        <div
          ref={shadowRef}
          style={{
            position: "absolute",
            left: 0, top: 0,
            width: PAGE_W, height: PAGE_H,
            background:
              "linear-gradient(90deg, rgba(0,0,0,0) 20%, rgba(20,40,120,0.55) 100%)",
            borderRadius: "12px 0 0 12px",
            zIndex: 12,
            pointerEvents: "none",
            opacity: 0,
          }}
        />

        {/* ── FRONT COVER — the element that flips ─────────────── */}
        {/*
         * Positioned on the RIGHT half of the open book.
         * transformOrigin "left center" = pivot at the spine.
         * rotateY 0°  = closed (facing viewer, covering right inside page).
         * rotateY -180° = fully open (flipped to the left side, back face visible).
         */}
        <div
          ref={coverRef}
          style={{
            position: "absolute",
            left: PAGE_W + SPINE_W, top: 0,
            width: PAGE_W, height: PAGE_H,
            transformOrigin: "left center",
            transformStyle: "preserve-3d",
            zIndex: 10,
          }}
        >
          {/* ── Front face (outside of cover — visible when closed) ── */}
          <div
            style={{
              position: "absolute", inset: 0,
              background:
                "linear-gradient(145deg, #2563eb 0%, #1e40af 55%, #1e3a8a 100%)",
              borderRadius: "0 12px 12px 0",
              backfaceVisibility: "hidden",
              overflow: "hidden",
            }}
          >
            {/* Title lines */}
            <div style={{ position:"absolute", top:18, left:16, right:16, height:2,     background:"rgba(255,255,255,0.30)", borderRadius:2 }} />
            <div style={{ position:"absolute", top:26, left:16, right:32, height:1.5,   background:"rgba(255,255,255,0.20)", borderRadius:2 }} />
            <div style={{ position:"absolute", top:33, left:16, right:26, height:1.5,   background:"rgba(255,255,255,0.18)", borderRadius:2 }} />
            {/* Emblem */}
            <div style={{
              position:"absolute", top:52, left:"50%",
              transform:"translateX(-50%)",
              width:46, height:46, borderRadius:"50%",
              border:"2px solid rgba(255,255,255,0.35)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <div style={{ width:22, height:22, borderRadius:"50%", background:"rgba(255,255,255,0.25)" }} />
            </div>
            {/* Bottom lines */}
            <div style={{ position:"absolute", bottom:24, left:16, right:16, height:1.5, background:"rgba(255,255,255,0.15)", borderRadius:2 }} />
            <div style={{ position:"absolute", bottom:16, left:28, right:28, height:1.5, background:"rgba(255,255,255,0.10)", borderRadius:2 }} />
          </div>

          {/* ── Back face (inside of cover — visible when fully open) ── */}
          <div
            style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(220deg, #f0f7ff 0%, #dbeafe 100%)",
              borderRadius: "0 12px 12px 0",
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              border: "1px solid rgba(30,64,175,0.10)",
              overflow: "hidden",
            }}
          >
            {[16,27,38,49,60,71].map((top, i) => (
              <div key={i} style={{
                position:"absolute", top, left:14,
                right: i % 2 === 0 ? 14 : 26,
                height:1.5,
                background:"rgba(30,64,175,0.11)",
                borderRadius:2,
              }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── "Loading" with per-letter GSAP bounce ────────────────────────────────────
function BouncingLabel() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const chars = "Loading".split("");

  useEffect(() => {
    const els = wrapperRef.current?.querySelectorAll("span");
    if (!els) return;

    const tweens = Array.from(els).map((el, i) =>
      gsap.to(el, {
        y: -6,
        duration: 0.45,
        delay: i * 0.09,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      })
    );

    return () => { tweens.forEach(t => t.kill()); };
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{ display: "flex", alignItems: "flex-end", gap: 1.5 }}
    >
      {chars.map((char, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.12em",
            color: "rgba(30,64,175,0.72)",
          }}
        >
          {char}
        </span>
      ))}
    </div>
  );
}
