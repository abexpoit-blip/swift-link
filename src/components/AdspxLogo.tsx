/**
 * AdsPx brand mark — inline SVG for pixel-perfect crispness at any size,
 * with animated "PX" shimmer + pulsing accent dots.
 */
type LogoMarkProps = {
  className?: string;
  glow?: boolean;
};

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
          ? { filter: "drop-shadow(0 6px 16px oklch(0.55 0.22 280 / 30%))" }
          : undefined
      }
    >
      <defs>
        <linearGradient id="adspx-mark-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#adspx-mark-g)" />
      {/* A-mark */}
      <path
        d="M11.2 30 L19 11.2 a1.5 1.5 0 0 1 2.8 0 L29.6 30 h-4.4 l-1.7-4.2 h-7 L14.8 30 z M18.9 22 h4.2 L21 16.8 z"
        fill="#fff"
      />
      {/* Pixel accent dots — pulsing */}
      <rect x="28.4" y="28.4" width="3.6" height="3.6" rx="0.8" fill="#fff">
        <animate attributeName="opacity" values="1;0.35;1" dur="1.8s" repeatCount="indefinite" />
      </rect>
      <rect x="32.6" y="32.6" width="2.4" height="2.4" rx="0.6" fill="#fff" fillOpacity="0.85">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="1.8s" repeatCount="indefinite" />
      </rect>
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
  // imgClassName kept for API compatibility — controls SVG height.
  const sizeClass = imgClassName ?? "h-10 w-auto";
  return (
    <span className={`inline-flex items-center ${className ?? ""}`}>
      <svg
        viewBox="0 0 180 40"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="AdsPx"
        className={sizeClass}
      >
        <defs>
          <linearGradient id="adspx-word-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="adspx-px-g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7c3aed">
              <animate attributeName="stop-color"
                values="#7c3aed;#ec4899;#06b6d4;#7c3aed"
                dur="4s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#ec4899">
              <animate attributeName="stop-color"
                values="#ec4899;#06b6d4;#7c3aed;#ec4899"
                dur="4s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
        </defs>
        {/* icon tile */}
        <rect width="40" height="40" rx="11" fill="url(#adspx-word-g)" />
        <path
          d="M11.2 30 L19 11.2 a1.5 1.5 0 0 1 2.8 0 L29.6 30 h-4.4 l-1.7-4.2 h-7 L14.8 30 z M18.9 22 h4.2 L21 16.8 z"
          fill="#fff"
        />
        <rect x="28.4" y="28.4" width="3.6" height="3.6" rx="0.8" fill="#fff">
          <animate attributeName="opacity" values="1;0.35;1" dur="1.8s" repeatCount="indefinite" />
        </rect>
        <rect x="32.6" y="32.6" width="2.4" height="2.4" rx="0.6" fill="#fff" fillOpacity="0.85">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="1.8s" repeatCount="indefinite" />
        </rect>

        {/* "Ads" — solid foreground */}
        <text
          x="50"
          y="29"
          fontFamily="Outfit, Inter, system-ui, sans-serif"
          fontWeight="800"
          fontSize="26"
          letterSpacing="-0.5"
          fill="currentColor"
        >
          Ads
        </text>
        {/* "Px" — animated gradient */}
        <text
          x="103"
          y="29"
          fontFamily="Outfit, Inter, system-ui, sans-serif"
          fontWeight="800"
          fontSize="26"
          letterSpacing="-0.5"
          fill="url(#adspx-px-g)"
        >
          Px
          <animate
            attributeName="opacity"
            values="1;0.75;1"
            dur="2.4s"
            repeatCount="indefinite"
          />
        </text>
      </svg>
    </span>
  );
}
