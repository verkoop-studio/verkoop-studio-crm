// The product's name and symbol, in one place.
// "Verkoop Studio Sales": two words plus the product word, no dot. The symbol
// keeps the dot-less tile; domains and e-mail stay verkoop.studio.
//
// In the app chrome the product reads as "Sales", the way the sibling product
// reads as "Performance". The repository and package names are untouched.
export const PRODUCT = "Verkoop Studio Sales";
export const PRODUCT_SHORT = "Sales";
export const COMPANY = "Verkoop Studio";
export const SIBLING_PRODUCT = "Verkoop Studio Performance";

/** The Verkoop Studio symbol. Paths are the agreed brand mark. */
export function Mark({ size = 32, className }: { size?: number; className?: string }) {
  const id = `vs-mark-${size}`;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={COMPANY}
      style={{ flexShrink: 0, display: "block" }}
    >
      <defs>
        <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#4265ff" />
          <stop offset="1" stopColor="#173be0" />
        </linearGradient>
        <linearGradient id={`${id}-fold`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#dbe5ff" />
          <stop offset="1" stopColor="#859dff" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${id}-tile)`} />
      <path d="M12 18h12l14 33H26Z" fill={`url(#${id}-fold)`} />
      <path d="M42 13h12L38 51H26Z" fill="#ffffff" />
    </svg>
  );
}

/** Symbol plus the word, as the sidebar and the sign-in pages show it. */
export function Wordmark({
  size = 32,
  dark = false,
  className,
}: {
  size?: number;
  dark?: boolean;
  className?: string;
}) {
  return (
    <span className={className ?? "flex items-center gap-[11px]"}>
      <Mark size={size} />
      <span
        className="font-semibold tracking-[-0.045em]"
        style={{ fontSize: Math.round(size * 0.6), color: dark ? "#ffffff" : "var(--vsp-ink)" }}
      >
        {PRODUCT_SHORT}
      </span>
    </span>
  );
}
