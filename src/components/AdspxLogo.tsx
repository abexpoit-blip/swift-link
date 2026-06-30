/**
 * AdsPx brand mark.
 * Geometric "A" formed by an upward growth arrow + a pixel accent (the "px").
 * Uses the project's primary gradient + glow tokens so it adapts to themes.
 */

type LogoMarkProps = {
  className?: string;
  /** Shadow / glow under the mark. */
  glow?: boolean;
};

export function AdspxMark({ className, glow = true }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={glow ? { filter: "drop-shadow(0 6px 18px oklch(0.55 0.22 280 / 35%))" } : undefined}
    >
      <defs>
        <linearGradient id="adspx-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.55 0.22 280)" />
          <stop offset="100%" stopColor="oklch(0.72 0.20 340)" />
        </linearGradient>
      </defs>

      {/* Rounded squircle base */}
      <rect x="0" y="0" width="40" height="40" rx="11" fill="url(#adspx-grad)" />

      {/* Bold "A" — two diagonal strokes + crossbar, drawn in negative space (white) */}
      <path
        d="M11.2 30 L19 11.2 a1.5 1.5 0 0 1 2.8 0 L29.6 30 h-4.4 l-1.7-4.2 h-7 L14.8 30 z M18.9 22 h4.2 L21 16.8 z"
        fill="#ffffff"
      />

      {/* "px" pixel accent — two small squares bottom-right */}
      <rect x="28.4" y="28.4" width="3.6" height="3.6" rx="0.8" fill="#ffffff" />
      <rect x="32.6" y="32.6" width="2.4" height="2.4" rx="0.6" fill="#ffffff" opacity="0.85" />
    </svg>
  );
}

export function AdspxWordmark({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <AdspxMark className={markClassName ?? "h-8 w-8"} />
      <span className="font-display font-bold text-lg tracking-tight">
        Ads<span className="text-gradient">Px</span>
      </span>
    </span>
  );
}
