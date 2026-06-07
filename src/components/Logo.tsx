/**
 * Attent logo (§13). Two pieces:
 *  - <LogoMark/>  the brand mark: the terracotta circle with the serif "A"
 *    (supplied artwork in /public/images/attent-mark.png).
 *  - <Logo/>      the lockup: mark + the "Attent." wordmark (terracotta period)
 *    in the display serif. Used at the top of splash / sign-in.
 */

export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/attent-mark.png"
      alt="Attent"
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function Logo({
  tone = "navy",
  markSize = 30,
  withMark = true,
  className = "text-2xl",
}: {
  tone?: "light" | "navy";
  markSize?: number;
  withMark?: boolean;
  className?: string;
}) {
  const textColor = tone === "light" ? "text-cream" : "text-navy";
  return (
    <span className="inline-flex items-center gap-2.5">
      {withMark && <LogoMark size={markSize} />}
      <span className={`font-display leading-none ${textColor} ${className}`}>
        Attent<span className="text-terracotta">.</span>
      </span>
    </span>
  );
}
