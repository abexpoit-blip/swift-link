/**
 * AdsPx brand mark — premium fintech monogram.
 * Rounded gradient tile with a bold "Px" cut-out and an animated
 * ascending bar-chart accent (growth motif). Wordmark pairs the
 * tile with an "Ads Px" lockup where "Px" carries the shimmer.
 */
type LogoMarkProps = {
  className?: string;
  glow?: boolean;
};

/* Shared inline mark — used by AdspxMark and AdspxWordmark */
function MarkTile({ idPrefix }: { idPrefix: string }) {
  const gid = `${idPrefix}-tile`;
  const sid = `${idPrefix}-sheen`;
  return (
    <>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="55%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        {/* Diagonal sheen that sweeps across the tile */}
        <linearGradient id={sid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${idPrefix}-clip`}>
          <rect width="40" height="40" rx="11" />
        </clipPath>
      </defs>

      {/* Base rounded tile */}
      <rect width="40" height="40" rx="11" fill={`url(#${gid})`} />

      {/* Sweeping sheen — masked to the tile */}
      <g clipPath={`url(#${idPrefix}-clip)`}>
        <rect x="-40" y="0" width="20" height="40" fill={`url(#${sid})`} opacity="0.9">
          <animate
            attributeName="x"
            values="-40;60"
            dur="4.5s"
            begin="0s"
            repeatCount="indefinite"
          />
        </rect>
      </g>

      {/* Inner top highlight — glass edge */}
      <rect
        x="0.5"
        y="0.5"
        width="39"
        height="39"
        rx="10.5"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.28"
      />

      {/* Monogram "Px" — bold custom paths, crisp at any size */}
      {/* P: vertical stem + head loop */}
      <path
        d="M9.4 10 h6.4 a5.2 5.2 0 0 1 0 10.4 h-3.2 v9.6 h-3.2 z M12.6 12.8 v4.8 h3.2 a2.4 2.4 0 0 0 0 -4.8 z"
        fill="#fff"
      />
      {/* x: two crossing strokes */}
      <path
        d="M20.4 18.4 h3.1 l2.4 3.5 l2.4 -3.5 h3.1 l -3.9 5.6 l 4.1 6 h -3.2 l -2.5 -3.8 l -2.5 3.8 h -3.2 l 4.1 -6 z"
        fill="#fff"
      />

      {/* Ascending bar-chart — growth accent bottom-left */}
      <g>
        <rect x="6" y="32" width="2.4" height="3" rx="0.6" fill="#fff" fillOpacity="0.9">
          <animate attributeName="height" values="2;4;2" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="y" values="33;31;33" dur="2.2s" repeatCount="indefinite" />
        </rect>
        <rect x="9.2" y="30" width="2.4" height="5" rx="0.6" fill="#fff" fillOpacity="0.95">
          <animate attributeName="height" values="4;7;4" dur="2.2s" begin="0.25s" repeatCount="indefinite" />
          <animate attributeName="y" values="31;28;31" dur="2.2s" begin="0.25s" repeatCount="indefinite" />
        </rect>
        <rect x="12.4" y="28" width="2.4" height="7" rx="0.6" fill="#fff">
          <animate attributeName="height" values="6;9;6" dur="2.2s" begin="0.5s" repeatCount="indefinite" />
          <animate attributeName="y" values="29;26;29" dur="2.2s" begin="0.5s" repeatCount="indefinite" />
        </rect>
      </g>
    </>
  );
}

export function AdspxMark({ className, glow = true }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="AdsPx"
      className={`block ${className ?? ""}`}
      style={
        glow
          ? { filter: "drop-shadow(0 8px 20px oklch(0.55 0.22 280 / 32%))" }
          : undefined
      }
    >
      <MarkTile idPrefix="adspx-mark" />
    </svg>
  );
}

export function AdspxWordmark({
  className,
  imgClassName,
}: {
  className?: string;
  imgClassName?: string;
}) {
  const sizeClass = imgClassName ?? "h-9 w-auto";
  return (
    <span className={`inline-flex items-center ${className ?? ""}`}>
      <svg
        viewBox="0 0 168 40"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="AdsPx"
        className={sizeClass}
      >
        <defs>
          <linearGradient id="adspx-word-px" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4f46e5">
              <animate
                attributeName="stop-color"
                values="#4f46e5;#7c3aed;#ec4899;#4f46e5"
                dur="5s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="#ec4899">
              <animate
                attributeName="stop-color"
                values="#ec4899;#4f46e5;#7c3aed;#ec4899"
                dur="5s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
        </defs>

        <MarkTile idPrefix="adspx-word" />

        {/* "Ads" — solid foreground */}
        <text
          x="50"
          y="27"
          fontFamily="Outfit, Inter, system-ui, sans-serif"
          fontWeight="700"
          fontSize="22"
          letterSpacing="-0.6"
          fill="currentColor"
        >
          Ads
        </text>
        {/* "Px" — animated gradient */}
        <text
          x="97"
          y="27"
          fontFamily="Outfit, Inter, system-ui, sans-serif"
          fontWeight="800"
          fontSize="22"
          letterSpacing="-0.6"
          fill="url(#adspx-word-px)"
        >
          Px
        </text>
        {/* Fine underline dot — "registered" premium touch */}
        <circle cx="140" cy="26" r="2" fill="oklch(0.72 0.20 340)">
          <animate attributeName="opacity" values="1;0.35;1" dur="2.4s" repeatCount="indefinite" />
        </circle>
      </svg>
    </span>
  );
}
