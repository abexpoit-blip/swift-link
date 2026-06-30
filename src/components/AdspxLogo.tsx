/**
 * AdsPx brand mark — crisp inline SVG so it renders sharp at any size.
 */
import logoFull from "@/assets/adspx-logo.png.asset.json";

type LogoMarkProps = {
  className?: string;
  /** Soft drop-shadow under the mark. */
  glow?: boolean;
};

export function AdspxMark({ className, glow = true }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="AdsPx"
      className={className}
      style={
        glow
          ? { filter: "drop-shadow(0 6px 16px oklch(0.55 0.22 280 / 35%))" }
          : undefined
      }
    >
      <defs>
        <linearGradient id="adspxMarkGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.55 0.22 280)" />
          <stop offset="100%" stopColor="oklch(0.72 0.20 340)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#adspxMarkGrad)" />
      <path
        d="M15 34 L23 14 H25 L33 34 H29.4 L27.6 29 H20.4 L18.6 34 Z M21.6 25.6 H26.4 L24 18.8 Z"
        fill="#ffffff"
      />
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
  return (
    <span className={`inline-flex items-center ${className ?? ""}`}>
      <img
        src={logoFull.url}
        alt="AdsPx"
        className={imgClassName ?? "h-10 w-auto"}
      />
    </span>
  );
}
