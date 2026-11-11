import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand";

/*
 * The two front doors share a shape: a dark panel that says what this is for,
 * and a light column with the form. They say different things in it, because
 * they are not the same door — one joins a company that already exists, the
 * other creates one.
 */
export function AuthSplit({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-wrap bg-panel text-ink">
      <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-8 bg-dark px-12 py-11">
        <Wordmark size={34} dark />
        {left}
      </div>
      <div className="flex min-w-0 flex-[1_1_460px] flex-col justify-center gap-6 px-12 py-11">
        <div className="mx-auto flex w-full max-w-[400px] flex-col gap-[22px]">{right}</div>
      </div>
    </div>
  );
}

/** A numbered or iconned step in the dark column, joined by a short tail. */
export function Chain({
  items,
}: {
  items: { title: string; note: string; icon?: string; number?: string; last?: boolean }[];
}) {
  return (
    <div className="flex flex-col">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <div key={item.title} className="flex flex-col">
            <div className="flex items-center gap-3.5">
              <span
                aria-hidden="true"
                className="flex shrink-0 items-center justify-center"
                style={{
                  width: item.number ? 30 : 34,
                  height: item.number ? 30 : 34,
                  borderRadius: item.number ? "50%" : 10,
                  background: last ? "var(--vsp-good)" : "var(--vsp-dark-raised-2)",
                  color: last ? "var(--vsp-good-bright)" : "var(--vsp-dark-bright)",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {item.number ?? (
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={item.icon} />
                  </svg>
                )}
              </span>
              <span className="flex flex-col">
                <span className="text-[13px] font-semibold text-white">{item.title}</span>
                <span className="text-[12px] text-dark-muted">{item.note}</span>
              </span>
            </div>
            {!last && (
              <span
                aria-hidden="true"
                className="w-0.5 bg-dark-raised-2"
                style={{ height: 22, marginLeft: item.number ? 14 : 16 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function GoogleMark({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285f4"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4"
      />
      <path
        fill="#34a853"
        d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22"
      />
      <path fill="#fbbc04" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z" />
      <path
        fill="#ea4335"
        d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1"
      />
    </svg>
  );
}

export function Or() {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-caption">or</span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  );
}

export const fieldClass =
  "min-h-[46px] w-full rounded-control border border-border-control bg-panel px-[13px] text-[14px] text-ink";

export const primaryClass =
  "mt-0.5 min-h-[50px] rounded-control px-[18px] py-3.5 text-[14px] font-semibold text-white shadow-raised disabled:opacity-60";

/** The eye button inside a password field. */
export function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
  shown,
  onToggle,
  required = true,
  minLength,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder: string;
  shown: boolean;
  onToggle: () => void;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <span className="relative flex">
      <input
        id={id}
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`${fieldClass} pr-[46px]`}
      />
      <button
        type="button"
        aria-pressed={shown}
        aria-controls={id}
        aria-label={shown ? "Hide password" : "Show password"}
        onClick={onToggle}
        className="absolute right-0 top-0 flex h-full w-[46px] items-center justify-center rounded-control text-body-quiet"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="3" />
          <path d={shown ? "M3.5 3.5 20.5 20.5" : "M12 12"} />
        </svg>
      </button>
    </span>
  );
}

/** How strong a password looks, without pretending to be a cracker. */
export function passwordStrength(value: string) {
  const length = value.length;
  const variety =
    Number(/[a-z]/.test(value)) +
    Number(/[A-Z]/.test(value)) +
    Number(/\d/.test(value)) +
    Number(/[^A-Za-z0-9]/.test(value));
  if (length === 0) return { width: "0%", label: "", ink: "var(--vsp-caption)" };
  if (length < 12) return { width: "28%", label: "Too short", ink: "var(--vsp-bad-ink)" };
  if (length < 15 || variety < 2) return { width: "64%", label: "Good", ink: "#8a5a12" };
  return { width: "100%", label: "Strong", ink: "var(--vsp-good)" };
}
