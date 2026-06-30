/**
 * AdsPx brand mark — uses local public assets for self-host friendliness.
 */
type LogoMarkProps = {
  className?: string;
  glow?: boolean;
};

export function AdspxMark({ className, glow = true }: LogoMarkProps) {
  return (
    <img
      src="/adspx-icon-sm.png"
      alt="AdsPx"
      width={48}
      height={48}
      decoding="async"
      className={`object-contain ${className ?? ""}`}
      style={
        glow
          ? { filter: "drop-shadow(0 6px 16px oklch(0.55 0.22 280 / 30%))" }
          : undefined
      }
    />
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
        src="/adspx-logo.png"
        alt="AdsPx"
        className={imgClassName ?? "h-10 w-auto"}
      />
    </span>
  );
}
