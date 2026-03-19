import Lottie from "lottie-react";
import bookAnimation from "@/assets/book-loader.json";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  size?: number;
  className?: string;
}

export default function LoadingSpinner({
  fullScreen,
  size = 180,
  className,
}: LoadingSpinnerProps) {
  const content = (
    <div className="flex flex-col items-center gap-2">
      <Lottie
        animationData={bookAnimation}
        loop
        autoplay
        style={{ width: size, height: size }}
      />
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

// ── "Loading" with per-letter CSS bounce ─────────────────────────────────────
function BouncingLabel() {
  const chars = "Loading".split("");

  return (
    <div className="flex items-end" style={{ gap: 1.5 }}>
      {chars.map((char, i) => (
        <span
          key={i}
          className="inline-block animate-bounce"
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.12em",
            color: "rgba(30,64,175,0.72)",
            animationDelay: `${i * 0.09}s`,
            animationDuration: "0.9s",
          }}
        >
          {char}
        </span>
      ))}
    </div>
  );
}
