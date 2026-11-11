/*
 * The small pieces the redesign canvas repeats on every screen: the channel
 * mark in the Via column and on a card, the stage chip, the owner avatar and
 * the way a figure, a last touch and an initial are written.
 *
 * Colour here is data — a channel, a stage, an owner — so none of it uses the
 * accent. The accent is chrome only.
 */
import type { CSSProperties, ReactNode } from "react";
import { STAGE_META, type Stage } from "@/lib/sales";

/* ── Channels ─────────────────────────────────────────────────────────────── */

/** source value → label, path, ink. The paths are the canvas's own. */
export const CHANNEL_MARK: Record<string, { label: string; path: string; ink: string }> = {
  email: {
    label: "Email outreach",
    path: "M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zm0 1 10 6 10-6",
    ink: "#676d7e",
  },
  linkedin: {
    label: "LinkedIn",
    path: "M4 9h4v11H4zM6 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4M11 20V9h4v1.6c.7-1 1.9-1.9 3.6-1.9 2.6 0 4.4 1.7 4.4 5V20h-4v-5.3c0-1.6-.7-2.6-2.1-2.6-1.2 0-1.9.8-2.2 1.6-.1.3-.1.7-.1 1.1V20z",
    ink: "#0a66c2",
  },
  ads: {
    label: "Ads and inbound",
    path: "m3 11 18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6",
    ink: "#254bfa",
  },
  referral: {
    label: "Referral",
    path: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M19 8v6M22 11h-6",
    ink: "#0d5745",
  },
  website: {
    label: "Website request",
    path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M2 12h20M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",
    ink: "#676d7e",
  },
  csv: {
    label: "CSV import",
    path: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5",
    ink: "#879099",
  },
};

export function channelMark(source: string | null | undefined) {
  return CHANNEL_MARK[source ?? ""] ?? CHANNEL_MARK["csv"]!;
}

/** The Via cell: an icon only, with the channel name as its accessible name. */
export function ChannelIcon({ source, size = 15 }: { source: string | null; size?: number }) {
  const mark = channelMark(source);
  return (
    <span
      title={mark.label}
      className="flex size-7 shrink-0 items-center justify-center rounded-chip bg-wash"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={mark.ink}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={mark.label}
      >
        <path d={mark.path} />
      </svg>
    </span>
  );
}

/** The same mark bare, as the prospect cards draw it. */
export function ChannelGlyph({ source, size = 13 }: { source: string | null; size?: number }) {
  const mark = channelMark(source);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={mark.ink}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={mark.label}
      className="shrink-0"
    >
      <path d={mark.path} />
    </svg>
  );
}

/* ── Stages ───────────────────────────────────────────────────────────────── */

export type StageSkin = { bg: string; ink: string; dot: string };

/**
 * Stage colours. The database still calls the fifth step `proposal`; the
 * product has called it Closing since the canvas, and STAGE_META holds that
 * label. Only the skin lives here.
 */
export const STAGE_SKIN: Record<Stage, StageSkin> = {
  new: { bg: "var(--vsp-chip-quiet)", ink: "var(--vsp-text)", dot: "var(--vsp-stage-new)" },
  contacted: {
    bg: "var(--vsp-accent-tint)",
    ink: "var(--vsp-accent-ink)",
    dot: "var(--vsp-stage-contacted)",
  },
  engaged: {
    bg: "var(--vsp-accent-tint)",
    ink: "var(--vsp-accent-ink)",
    dot: "var(--vsp-stage-engaged)",
  },
  meeting: { bg: "var(--vsp-warn-bg)", ink: "var(--vsp-warn)", dot: "var(--vsp-stage-meeting)" },
  proposal: { bg: "var(--vsp-good-bg)", ink: "var(--vsp-good)", dot: "var(--vsp-stage-closing)" },
  won: { bg: "var(--vsp-good)", ink: "#ffffff", dot: "var(--vsp-good-bright)" },
  lost: { bg: "var(--vsp-bad-bg)", ink: "var(--vsp-bad-ink)", dot: "var(--vsp-bad)" },
};

export function stageSkin(stage: string): StageSkin {
  return STAGE_SKIN[stage as Stage] ?? STAGE_SKIN.new;
}

export function stageLabel(stage: string) {
  return STAGE_META[stage as Stage]?.short ?? stage;
}

/** The pill the table, the sheet header and the cards all use. */
export function StageBadge({ stage }: { stage: string }) {
  const skin = stageSkin(stage);
  return (
    <span
      className="inline-flex items-center gap-[7px] rounded-pill px-2.5 py-1 text-[12px] font-semibold"
      style={{ background: skin.bg, color: skin.ink }}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: skin.dot }} />
      {stageLabel(stage)}
    </span>
  );
}

/* ── People ───────────────────────────────────────────────────────────────── */

const OWNER_SKINS: { bg: string; ink: string }[] = [
  { bg: "var(--vsp-chip)", ink: "var(--vsp-accent-ink)" },
  { bg: "var(--vsp-good-bg)", ink: "var(--vsp-good)" },
  { bg: "var(--vsp-warn-bg)", ink: "var(--vsp-warn)" },
  { bg: "var(--vsp-accent-tint)", ink: "var(--vsp-accent-ink)" },
];

/** A stable skin per person, so the same face keeps the same colour. */
export function ownerSkin(id: string | null) {
  if (!id) return { bg: "var(--vsp-chip-quiet)", ink: "var(--vsp-caption)" };
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return OWNER_SKINS[hash % OWNER_SKINS.length]!;
}

/** Initials from a person's name, or the canvas's two dashes for nobody. */
export function initialsOf(name: string | null | undefined, fallback = "--") {
  const cleaned = (name ?? "").trim();
  if (!cleaned) return fallback;
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || fallback;
}

export function OwnerAvatar({
  id,
  name,
  size = 26,
}: {
  id: string | null;
  name: string | null;
  size?: number;
}) {
  const skin = ownerSkin(id);
  return (
    <span
      aria-hidden="true"
      title={name ?? "Nobody yet"}
      className="flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        background: skin.bg,
        color: skin.ink,
        fontSize: Math.max(9, Math.round(size * 0.38)),
      }}
    >
      {initialsOf(name)}
    </span>
  );
}

/** The square tile a company gets, in the table and on the documents page. */
export function CompanyTile({
  company,
  size = 28,
  skin,
}: {
  company: string;
  size?: number;
  skin?: StageSkin;
}) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-chip font-bold"
      style={{
        width: size,
        height: size,
        borderRadius: size >= 36 ? 11 : 8,
        background: skin?.bg ?? "var(--vsp-chip)",
        color: skin?.ink ?? "var(--vsp-text)",
        fontSize: Math.max(10, Math.round(size * 0.39)),
      }}
    >
      {initialsOf(company)}
    </span>
  );
}

/* ── Figures and dates ────────────────────────────────────────────────────── */

/** €24.000 — the canvas writes euros with a dot and no decimals. */
export function euro(value: number) {
  // Grouped by hand, so the separator is the dot the canvas uses and never an
  // ICU-dependent space.
  const rounded = Math.round(value);
  const digits = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${rounded < 0 ? "-" : ""}\u20ac${digits}`;
}

/** €18,14 — the two places the canvas does show cents. */
export function euroCents(value: number) {
  return `€${value.toFixed(2).replace(".", ",")}`;
}

export const STALE_DAYS = 7;

export function daysSince(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((now - then) / 86_400_000));
}

/** Today / Yesterday / N days ago, and "Never" when nobody has been in touch. */
export function lastTouch(iso: string | null | undefined, now = Date.now()) {
  const days = daysSince(iso, now);
  if (days == null) return { text: "Never", days: null as number | null, stale: true };
  if (days === 0) return { text: "Today", days, stale: false };
  if (days === 1) return { text: "Yesterday", days, stale: false };
  return { text: `${days} days ago`, days, stale: days >= STALE_DAYS };
}

export function LastTouch({ at, now }: { at: string | null | undefined; now?: number }) {
  const touch = lastTouch(at, now);
  return (
    <span className="flex items-center gap-[7px]">
      {touch.stale && (
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full"
          style={{ background: "var(--vsp-bad)" }}
        />
      )}
      <span
        className="text-[13px]"
        style={{ color: touch.stale ? "var(--vsp-bad-ink)" : "var(--vsp-text)" }}
      >
        {touch.text}
      </span>
    </span>
  );
}

/* ── Layout bits every screen repeats ─────────────────────────────────────── */

/** A white panel on a 1px edge, 16px radius, no shadow. */
export function Panel({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`overflow-hidden rounded-panel border border-border bg-panel ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/** The header line of a panel: a title, and a quiet figure pushed right. */
export function PanelHead({
  title,
  aside,
  divider = true,
}: {
  title: ReactNode;
  aside?: ReactNode;
  divider?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-baseline gap-2.5 px-[18px] pb-3 pt-4 ${
        divider ? "border-b border-hairline" : ""
      }`}
    >
      <span className="text-[15px] font-semibold tracking-[-0.025em]">{title}</span>
      {aside != null && <span className="ml-auto text-[12px] text-caption vsp-nums">{aside}</span>}
    </div>
  );
}

/** The two-chip segmented control the canvas puts above a figure. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-0.5 rounded-control bg-chip p-[3px]">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.value)}
            className="rounded-chip px-[11px] py-1.5 text-[13px]"
            style={{
              background: on ? "var(--vsp-panel)" : "none",
              boxShadow: on ? "var(--vsp-shadow-pressed)" : "none",
              color: on ? "var(--vsp-ink)" : "var(--vsp-text)",
              fontWeight: on ? 600 : 500,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
