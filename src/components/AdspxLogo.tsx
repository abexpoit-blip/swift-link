/**
 * AdsPx brand mark — uses the polished logo image.
 */
import logoIcon from "@/assets/adspx-icon-sm.png.asset.json";
import logoFull from "@/assets/adspx-logo.png.asset.json";

type LogoMarkProps = {
  className?: string;
  /** Soft drop-shadow under the mark. */
  glow?: boolean;
};

export function AdspxMark({ className, glow = true }: LogoMarkProps) {
  return (
    <img
      src={logoIcon.url}
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
        src={logoFull.url}
        alt="AdsPx"
        className={imgClassName ?? "h-10 w-auto"}
      />
    </span>
  );
}
