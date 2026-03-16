/**
 * LogosClass Logo — SVG component
 *
 * Mark: Open book with a rising spark/star — symbolising knowledge, teaching,
 * and digital learning. Three variants:
 *   LogoMark    — mark only (square, great for favicons / navbar icons)
 *   LogoFull    — mark + wordmark side by side (default)
 *   LogoStacked — mark above wordmark (great for splash screens)
 */

export function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="10" fill="#1E40AF" />
      <path d="M8 13C8 13 12 12 20 14V30C20 30 14 28 8 29V13Z" fill="white" fillOpacity="0.25" />
      <path d="M32 13C32 13 28 12 20 14V30C20 30 26 28 32 29V13Z" fill="white" fillOpacity="0.15" />
      <line x1="20" y1="14" x2="20" y2="30" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
      <path
        d="M20 10L21.2 13.2H24.6L21.9 15.2L22.9 18.4L20 16.4L17.1 18.4L18.1 15.2L15.4 13.2H18.8L20 10Z"
        fill="white"
      />
      <line x1="10" y1="22" x2="18" y2="21.5" stroke="white" strokeWidth="1" strokeOpacity="0.4" strokeLinecap="round" />
      <line x1="10" y1="25" x2="18" y2="24.5" stroke="white" strokeWidth="1" strokeOpacity="0.3" strokeLinecap="round" />
      <line x1="30" y1="22" x2="22" y2="21.5" stroke="white" strokeWidth="1" strokeOpacity="0.4" strokeLinecap="round" />
      <line x1="30" y1="25" x2="22" y2="24.5" stroke="white" strokeWidth="1" strokeOpacity="0.3" strokeLinecap="round" />
    </svg>
  );
}

export function LogoFull({
  size = 36,
  className = "",
  dark = false,
}: {
  size?: number;
  className?: string;
  dark?: boolean;
}) {
  const textColor = dark ? "#EFF6FF" : "#1E3A8A";
  const subColor = dark ? "#93C5FD" : "#3B82F6";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <div className="flex flex-col leading-none">
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            fontSize: size * 0.45,
            color: textColor,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          Logos<span style={{ color: "#3B82F6" }}>Class</span>
        </span>
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 500,
            fontSize: size * 0.22,
            color: subColor,
            letterSpacing: "0.04em",
            lineHeight: 1,
            marginTop: 3,
            textTransform: "uppercase" as const,
          }}
        >
          Digital Campus
        </span>
      </div>
    </div>
  );
}

export function LogoStacked({
  size = 56,
  className = "",
  dark = false,
}: {
  size?: number;
  className?: string;
  dark?: boolean;
}) {
  const textColor = dark ? "#EFF6FF" : "#1E3A8A";
  const subColor = dark ? "#93C5FD" : "#3B82F6";

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      <div className="flex flex-col items-center leading-none">
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            fontSize: size * 0.3,
            color: textColor,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          Logos<span style={{ color: "#3B82F6" }}>Class</span>
        </span>
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 500,
            fontSize: size * 0.15,
            color: subColor,
            letterSpacing: "0.06em",
            lineHeight: 1,
            marginTop: 4,
            textTransform: "uppercase" as const,
          }}
        >
          Digital Campus
        </span>
      </div>
    </div>
  );
}

export default LogoFull;
