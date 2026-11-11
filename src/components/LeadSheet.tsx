import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { Lead } from "@/hooks/use-pipeline-leads";
import {
  CHANNELS,
  PIPELINE_STEPS,
  SOURCES,
  STAGE_META,
  labelFor,
  priorityLabel,
  type Channel,
  type Stage,
} from "@/lib/sales";
import {
  documentSize,
  documentTitle,
  listLeadDocuments,
  openLeadDocument,
  uploadLeadDocument,
  type DocumentKind,
} from "@/lib/lead-documents";
import {
  CompanyTile,
  OwnerAvatar,
  StageBadge,
  channelMark,
  euro,
  lastTouch,
  stageSkin,
} from "@/components/sales-ui";

type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];
type Profile = { id: string; full_name: string | null; email: string | null };

/** The icons the log chips and the history rows share. */
const KIND_ICON: Record<Channel | "stage", string> = {
  call: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z",
  email: "M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zm0 1 10 6 10-6",
  linkedin:
    "M4 9h4v11H4zM6 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4M11 20V9h4v1.6c.7-1 1.9-1.9 3.6-1.9 2.6 0 4.4 1.7 4.4 5V20h-4v-5.3c0-1.6-.7-2.6-2.1-2.6-1.2 0-1.9.8-2.2 1.6-.1.3-.1.7-.1 1.1V20z",
  meeting: "M4 5.5h16a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1M3 10h18M8 3v4M16 3v4",
  ads: "m3 11 18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6",
  note: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  stage: "M5 12h13M13 6l6 6-6 6",
};

const KIND_SKIN: Record<string, { bg: string; ink: string }> = {
  call: { bg: "var(--vsp-accent-tint)", ink: "var(--vsp-accent-ink)" },
  email: { bg: "var(--vsp-accent-tint)", ink: "var(--vsp-accent-ink)" },
  linkedin: { bg: "var(--vsp-accent-tint)", ink: "var(--vsp-accent-ink)" },
  meeting: { bg: "var(--vsp-warn-bg)", ink: "var(--vsp-warn)" },
  ads: { bg: "var(--vsp-accent-tint)", ink: "var(--vsp-accent-ink)" },
  note: { bg: "var(--vsp-chip-quiet)", ink: "var(--vsp-text)" },
};

/** What the box under the kind chips suggests you write. */
const PLACEHOLDER: Record<Channel, string> = {
  call: "What did they actually say?",
  email: "What did you send them?",
  linkedin: "Connected, or sent a note about what?",
  meeting: "When is it, where, and who is coming?",
  ads: "What did they come back to the site for?",
  note: "Something worth remembering next time.",
};

/*
 * One lead, opened.
 *
 * The canvas changed the shape of this sheet, not only its paint. Deal value
 * and stage are one panel split by a hairline, so the two halves can never end
 * up different heights. Logging a contact is a row of chips and a box, not a
 * dropdown inside a collapsed section. Everything that used to hide behind a
 * <details> is simply on the page in the order you work through it.
 */
export function LeadSheet({
  lead,
  profiles,
  onClose,
}: {
  lead: Lead;
  profiles: Profile[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();
  const canEdit = Boolean(me) && !lead.deleted_at;

  const patch = useMutation({
    mutationFn: async (update: LeadUpdate) => {
      const { error } = await supabase
        .from("leads")
        .update(update)
        .eq("id", lead.id)
        .select("id")
        .single();
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const save = (update: LeadUpdate) => patch.mutateAsync(update);

  const nameOf = (id: string | null) =>
    profiles.find((p) => p.id === id)?.full_name ?? profiles.find((p) => p.id === id)?.email ?? null;

  const ownerName = nameOf(lead.owner_id);
  const touch = lastTouch(lead.last_touch_at ?? lead.created_at);
  const channel = channelMark(lead.source);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{ background: "#0b0f1c4d" }}
      />
      <div
        role="dialog"
        aria-label={lead.company}
        className="relative flex h-full w-full max-w-[640px] flex-col overflow-hidden border-l border-border bg-panel shadow-sheet"
      >
        {/* Head */}
        <div className="flex flex-col gap-3 border-b border-hairline px-[22px] pb-3.5 pt-[18px]">
          <div className="flex items-start gap-3">
            <CompanyTile company={lead.company} size={38} skin={stageSkin(lead.stage)} />
            <span className="flex min-w-0 flex-1 flex-col gap-px">
              <span className="truncate text-[18px] font-bold tracking-[-0.035em] text-ink-strong">
                {lead.company}
              </span>
              <span className="truncate text-[12px] text-body-quiet">
                {[lead.contact_name, lead.city].filter(Boolean).join(" · ")}
                {lead.contact_name || lead.city ? " · " : ""}
                came in through {channel.label.toLowerCase()}
              </span>
            </span>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex size-8 shrink-0 items-center justify-center rounded-control border border-border bg-panel text-body"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StageBadge stage={lead.stage} />
            <span className="inline-flex items-center gap-[7px] rounded-pill bg-warn-bg px-[11px] py-[5px] text-[12px] font-semibold text-warn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8z" />
              </svg>
              {priorityLabel(lead.priority)}
            </span>
            <span className="inline-flex items-center gap-[7px] rounded-pill bg-wash py-1 pl-1 pr-2.5 text-[12px] text-body">
              <OwnerAvatar id={lead.owner_id} name={ownerName} size={20} />
              {ownerName?.split(" ")[0] ?? "Nobody yet"}
            </span>
            <span className="ml-auto text-[12px] text-caption">Last touch {touch.text.toLowerCase()}</span>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-[22px] pb-[22px] pt-4">
          <ValueAndStage lead={lead} canEdit={canEdit} ownerName={ownerName} meId={me?.id ?? null} onSave={save} />

          <LogSomething lead={lead} canEdit={canEdit} />

          <WhoTheyAre lead={lead} canEdit={canEdit} onSave={save} />

          <Paperwork lead={lead} canEdit={canEdit} />

          <History lead={lead} nameOf={nameOf} />

          {/* The dangerous end */}
          <div className="flex flex-wrap items-center gap-3 rounded-panel border border-bad-line bg-panel px-4 py-3.5">
            <span className="min-w-0 flex-[1_1_240px] text-[12px] leading-[1.6] text-body">
              Nothing here is deleted. A lead you drop goes to the bin and can come back with its
              whole history.
            </span>
            {lead.deleted_at ? (
              <button
                type="button"
                disabled={patch.isPending}
                onClick={() =>
                  void save({ deleted_at: null }).then(() => toast.success("Lead restored"))
                }
                className="min-h-10 rounded-control border border-good-line bg-panel px-3.5 py-2.5 text-[13px] font-semibold text-good"
              >
                Take it out of the bin
              </button>
            ) : (
              <button
                type="button"
                disabled={!canEdit || patch.isPending}
                onClick={() => {
                  void save({ deleted_at: new Date().toISOString() }).then(() => {
                    toast.success("Moved to the bin");
                    onClose();
                  });
                }}
                className="min-h-10 rounded-control border border-bad-line bg-panel px-3.5 py-2.5 text-[13px] font-semibold text-bad-ink disabled:opacity-50"
              >
                Move to the bin
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Deal value and stage: one panel, split by a hairline ─────────────────── */

function ValueAndStage({
  lead,
  canEdit,
  ownerName,
  meId,
  onSave,
}: {
  lead: Lead;
  canEdit: boolean;
  ownerName: string | null;
  meId: string | null;
  onSave: (patch: LeadUpdate) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const step = PIPELINE_STEPS.indexOf(lead.stage as Stage);
  const closed = lead.stage === "won" || lead.stage === "lost";
  const current = step === -1 ? (closed ? PIPELINE_STEPS.length - 1 : 0) : step;

  const commit = async () => {
    const text = draft.trim().replace(",", ".");
    if (text && (!/^\d+(\.\d{1,2})?$/.test(text) || Number(text) > 9_999_999_999.99)) {
      setError("Enter a non-negative amount with up to 2 decimals, without thousands separators.");
      return;
    }
    setError("");
    await onSave({ value_estimate: text === "" ? null : Number(text) });
    setEditing(false);
  };

  const whose =
    lead.value_estimate == null
      ? "nobody has put a number on this yet"
      : lead.owner_id && lead.owner_id === meId
        ? "your estimate"
        : ownerName
          ? `${ownerName.split(" ")[0]}'s estimate`
          : "an estimate, owner unknown";

  return (
    <div className="flex flex-wrap items-stretch overflow-hidden rounded-panel-inner border border-border bg-panel">
      <div className="min-w-0 flex-[1_1_230px]">
        {editing ? (
          <div className="flex flex-col gap-1.5 px-4 py-3.5">
            <label htmlFor="deal-value" className="text-[12px] text-body-quiet">
              Deal value
            </label>
            <input
              id="deal-value"
              autoFocus
              inputMode="decimal"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void commit();
                if (e.key === "Escape") setEditing(false);
              }}
              placeholder="24000"
              className="w-full rounded-control border border-border-control bg-panel px-3 py-2 text-[20px] font-bold tracking-[-0.045em] vsp-nums"
            />
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void commit()}
                className="rounded-control px-3 py-1.5 text-[12px] font-semibold text-white"
                style={{ background: "var(--vsp-accent)" }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-control px-2 py-1.5 text-[12px] font-semibold text-body"
              >
                Cancel
              </button>
              <span className="text-[11px] text-caption">Leave it empty to unset it.</span>
            </span>
            {error && (
              <span role="alert" className="text-[11px] text-bad-ink">
                {error}
              </span>
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => {
              setDraft(lead.value_estimate == null ? "" : String(lead.value_estimate));
              setEditing(true);
            }}
            className="vsp-field flex w-full flex-col gap-0.5 px-4 py-3.5 text-left disabled:cursor-default"
          >
            <span className="flex w-full items-center gap-2">
              <span className="text-[12px] text-body-quiet">Deal value</span>
              {canEdit && (
                <span aria-hidden="true" className="vsp-pen ml-auto flex text-disabled">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                  </svg>
                </span>
              )}
            </span>
            <span
              className="text-[26px] font-bold tracking-[-0.045em] vsp-nums"
              style={{
                color: lead.value_estimate == null ? "var(--vsp-disabled)" : "var(--vsp-ink)",
              }}
            >
              {lead.value_estimate == null ? "Not valued" : euro(lead.value_estimate)}
            </span>
            <span className="text-[11px] text-caption">{whose}</span>
          </button>
        )}
      </div>

      <div className="flex min-w-0 flex-[1_1_250px] flex-col gap-0.5 border-l border-hairline px-4 py-3.5">
        <span className="flex items-baseline gap-2">
          <span className="text-[12px] text-body-quiet">Stage</span>
          <span className="ml-auto text-[12px] font-semibold text-ink vsp-nums">
            {closed ? STAGE_META[lead.stage as Stage].short : `${current + 1} of 5`}
          </span>
        </span>
        <span
          role="group"
          aria-label="Move this lead to another stage"
          className="flex items-center gap-1.5"
        >
          {PIPELINE_STEPS.map((stepValue, index) => (
            <button
              key={stepValue}
              type="button"
              aria-label={STAGE_META[stepValue].short}
              title={STAGE_META[stepValue].short}
              disabled={!canEdit}
              onClick={() => void onSave({ stage: stepValue })}
              className="flex min-w-0 flex-1 items-center py-[11px] disabled:cursor-default"
            >
              <span
                aria-hidden="true"
                className="block h-1.5 w-full rounded-[3px]"
                style={{
                  background:
                    lead.stage === "won"
                      ? "var(--vsp-good)"
                      : index < current
                        ? "var(--vsp-stage-bar)"
                        : index === current && !closed
                          ? "var(--vsp-stage-closing)"
                          : "var(--vsp-hairline)",
                }}
              />
            </button>
          ))}
        </span>
        <span className="text-[12px] leading-[1.5] text-body">
          {STAGE_META[lead.stage as Stage]?.meaning}
        </span>
        {/* Not on the canvas, but nothing else in this product can close a deal. */}
        <span className="flex gap-1.5 pt-2">
          {(["won", "lost"] as const).map((outcome) => {
            const on = lead.stage === outcome;
            const good = outcome === "won";
            return (
              <button
                key={outcome}
                type="button"
                disabled={!canEdit}
                aria-pressed={on}
                onClick={() => void onSave({ stage: on ? ("proposal" as Stage) : outcome })}
                className="rounded-pill border px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50"
                style={{
                  background: on
                    ? good
                      ? "var(--vsp-good)"
                      : "var(--vsp-bad-bg)"
                    : "var(--vsp-panel)",
                  borderColor: good ? "var(--vsp-good-line)" : "var(--vsp-bad-line)",
                  color: on
                    ? good
                      ? "#ffffff"
                      : "var(--vsp-bad-ink)"
                    : good
                      ? "var(--vsp-good)"
                      : "var(--vsp-bad-ink)",
                }}
              >
                {on ? `Marked ${outcome}` : `Mark ${outcome}`}
              </button>
            );
          })}
        </span>
      </div>
    </div>
  );
}

/* ── Log what just happened ───────────────────────────────────────────────── */

function LogSomething({ lead, canEdit }: { lead: Lead; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();
  const [kind, setKind] = useState<Channel>("call");
  const [body, setBody] = useState("");

  const log = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error("Not signed in");
      const { error } = await supabase.from("activities").insert({
        lead_id: lead.id,
        user_id: me.id,
        channel: kind,
        direction: "outbound",
        body: body || null,
      });
      if (error) throw error;
      const { error: touchError } = await supabase
        .from("leads")
        .update({ last_touch_at: new Date().toISOString() })
        .eq("id", lead.id);
      if (touchError)
        throw new Error("Activity saved, but the last-contact date could not be updated.");
    },
    onSuccess: () => {
      setBody("");
      toast.success("Logged");
      queryClient.invalidateQueries({ queryKey: ["activities", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="flex flex-col overflow-hidden rounded-panel border border-border bg-panel">
      <span className="px-4 pb-[11px] pt-[13px] text-[13px] font-semibold tracking-[-0.02em]">
        Log what just happened
      </span>
      <div className="flex flex-col gap-[11px] px-4 pb-3.5">
        <div role="group" aria-label="Kind of contact" className="flex flex-wrap gap-[7px]">
          {CHANNELS.map((option) => {
            const on = kind === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={on}
                onClick={() => setKind(option.value)}
                className="flex min-h-[38px] items-center gap-[7px] rounded-pill border px-3 py-2 text-[13px]"
                style={{
                  background: on ? "var(--vsp-accent-tint)" : "var(--vsp-panel)",
                  borderColor: on ? "var(--vsp-accent)" : "var(--vsp-border-control)",
                  color: on ? "var(--vsp-accent-ink)" : "var(--vsp-text)",
                  fontWeight: on ? 600 : 500,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="shrink-0"
                >
                  <path d={KIND_ICON[option.value]} />
                </svg>
                {option.value === "ads" ? "Ads or inbound" : option.label}
              </button>
            );
          })}
        </div>
        <label htmlFor="log-note" className="sr-only">
          What happened
        </label>
        <textarea
          id="log-note"
          rows={2}
          value={body}
          disabled={!canEdit}
          onChange={(e) => setBody(e.target.value)}
          placeholder={PLACEHOLDER[kind]}
          className="w-full resize-y rounded-panel-inner border border-border-control bg-panel px-[13px] py-[11px] text-[13px] leading-[1.6] text-ink"
        />
        <span className="flex flex-wrap items-center gap-[11px]">
          <button
            type="button"
            disabled={!canEdit || log.isPending}
            onClick={() => log.mutate()}
            className="min-h-[42px] rounded-control px-4 py-2.5 text-[13px] font-semibold text-white shadow-raised disabled:opacity-50"
            style={{ background: "var(--vsp-accent)" }}
          >
            {log.isPending ? "Logging…" : "Log it"}
          </button>
          <span className="text-[11px] text-caption">
            Logging a contact sets the last touch to today, which is what takes this lead off the
            follow-up list.
          </span>
        </span>
      </div>
    </div>
  );
}

/* ── Who they are ─────────────────────────────────────────────────────────── */

function WhoTheyAre({
  lead,
  canEdit,
  onSave,
}: {
  lead: Lead;
  canEdit: boolean;
  onSave: (patch: LeadUpdate) => Promise<unknown>;
}) {
  const fields: {
    label: string;
    value: string | null;
    column: keyof LeadUpdate;
    basis: string;
    options?: readonly { value: string; label: string }[] | undefined;
  }[] = [
    { label: "Job title", value: lead.job_title, column: "job_title", basis: "180px" },
    { label: "Email", value: lead.email, column: "email", basis: "230px" },
    { label: "Phone", value: lead.phone, column: "phone", basis: "180px" },
    { label: "LinkedIn", value: lead.linkedin_url, column: "linkedin_url", basis: "180px" },
    { label: "Website", value: lead.website, column: "website", basis: "180px" },
    { label: "City", value: lead.city, column: "city", basis: "180px" },
    { label: "Country", value: lead.country, column: "country", basis: "180px" },
    {
      label: "Channel",
      value: lead.source,
      column: "source",
      basis: "180px",
      options: SOURCES,
    },
    { label: "Campaign", value: lead.campaign, column: "campaign", basis: "180px" },
  ];

  return (
    <div className="overflow-hidden rounded-panel border border-border bg-panel">
      <span className="block border-b border-hairline px-4 pb-[11px] pt-[13px] text-[13px] font-semibold tracking-[-0.02em]">
        Who they are
      </span>
      <div className="flex flex-wrap">
        {fields.map((field) => (
          <EditableCell
            key={field.label}
            label={field.label}
            value={field.value}
            basis={field.basis}
            canEdit={canEdit}
            options={field.options}
            onSave={(next) =>
              onSave({ [field.column]: next === "" ? null : next } as LeadUpdate)
            }
          />
        ))}
      </div>
      {/*
       * Not a field on the canvas, but the column exists and both the import
       * and the website form write into it, so it has to be readable.
       */}
      <Notes lead={lead} canEdit={canEdit} onSave={onSave} />
    </div>
  );
}

function Notes({
  lead,
  canEdit,
  onSave,
}: {
  lead: Lead;
  canEdit: boolean;
  onSave: (patch: LeadUpdate) => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? lead.notes ?? "";
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3">
      <label htmlFor={`notes-${lead.id}`} className="text-[11px] text-caption">
        Anything else worth knowing
      </label>
      <textarea
        id={`notes-${lead.id}`}
        rows={2}
        value={value}
        disabled={!canEdit}
        placeholder="What came in with them, what they asked for, what to watch out for."
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft != null && draft !== (lead.notes ?? "")) {
            void onSave({ notes: draft || null });
          }
          setDraft(null);
        }}
        className="w-full resize-y rounded-panel-inner border border-border-control bg-panel px-[13px] py-2.5 text-[13px] leading-[1.6] text-ink"
      />
    </div>
  );
}

function EditableCell({
  label,
  value,
  basis,
  canEdit,
  options,
  onSave,
}: {
  label: string;
  value: string | null;
  basis: string;
  canEdit: boolean;
  options?: readonly { value: string; label: string }[] | undefined;
  onSave: (value: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const shown = options ? labelFor(options, value) : (value ?? "—");

  if (editing && options) {
    return (
      <span
        className="flex min-w-0 flex-1 flex-col gap-px border-b border-r border-hairline px-4 py-[11px]"
        style={{ flexBasis: basis }}
      >
        <label htmlFor={`f-${label}`} className="text-[11px] text-caption">
          {label}
        </label>
        <select
          id={`f-${label}`}
          autoFocus
          defaultValue={value ?? ""}
          onBlur={() => setEditing(false)}
          onChange={(e) => {
            void onSave(e.target.value);
            setEditing(false);
          }}
          className="rounded-chip border border-border-control bg-panel px-2 py-1 text-[13px]"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    );
  }

  if (editing) {
    return (
      <span
        className="flex min-w-0 flex-1 flex-col gap-px border-b border-r border-hairline px-4 py-[11px]"
        style={{ flexBasis: basis }}
      >
        <label htmlFor={`f-${label}`} className="text-[11px] text-caption">
          {label}
        </label>
        <input
          id={`f-${label}`}
          ref={input}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") input.current?.blur();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={() => {
            if (draft !== (value ?? "")) void onSave(draft);
            setEditing(false);
          }}
          className="rounded-chip border border-border-control bg-panel px-2 py-1 text-[13px]"
        />
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={!canEdit}
      onClick={() => {
        setDraft(value ?? "");
        setEditing(true);
      }}
      className="vsp-field flex min-w-0 flex-1 flex-col gap-px border-b border-r border-hairline px-4 py-[11px] text-left disabled:cursor-default"
      style={{ flexBasis: basis }}
    >
      <span className="flex items-center gap-2">
        <span className="text-[11px] text-caption">{label}</span>
        {canEdit && (
          <span aria-hidden="true" className="vsp-pen ml-auto text-disabled">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
          </span>
        )}
      </span>
      <span
        className="truncate text-[13px]"
        style={{ color: value ? "var(--vsp-ink)" : "var(--vsp-disabled)" }}
      >
        {shown}
      </span>
    </button>
  );
}

/* ── Quotes and contracts ─────────────────────────────────────────────────── */

function Paperwork({ lead, canEdit }: { lead: Lead; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const picker = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<DocumentKind>("quote");
  const queryKey = ["lead-documents", lead.id];
  const { data: documents = [], isPending } = useQuery({
    queryKey,
    queryFn: () => listLeadDocuments(lead.id),
  });

  const upload = useMutation({
    mutationFn: (file: File) => uploadLeadDocument(lead.id, kind, file),
    onSuccess: async () => {
      if (picker.current) picker.current.value = "";
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ["document-library"] }),
      ]);
      toast.success("Document uploaded");
    },
    onError: () => toast.error("Upload failed. PDF, Word or an image, up to 20 MB."),
  });

  return (
    <div className="flex flex-col overflow-hidden rounded-panel border border-border bg-panel">
      <span className="flex items-baseline gap-2.5 border-b border-hairline px-4 pb-[11px] pt-[13px]">
        <span className="text-[13px] font-semibold tracking-[-0.02em]">Quotes and contracts</span>
        <span className="ml-auto text-[12px] text-caption vsp-nums">
          {isPending ? "…" : `${documents.length} ${documents.length === 1 ? "file" : "files"}`}
        </span>
      </span>
      {documents.map((document) => {
        const skin =
          document.category === "contract"
            ? { bg: "var(--vsp-good-bg)", ink: "var(--vsp-good)" }
            : { bg: "var(--vsp-accent-tint)", ink: "var(--vsp-accent-ink)" };
        return (
          <button
            key={document.id}
            type="button"
            onClick={async () => {
              const result = await openLeadDocument(document.path);
              if (!result.ok)
                toast.error(
                  result.reason === "popup_blocked"
                    ? "Allow pop-ups to open the document."
                    : "Could not open document.",
                );
            }}
            className="vsp-field flex items-center gap-[11px] border-b border-hairline px-4 py-[11px] text-left"
          >
            <span
              aria-hidden="true"
              className="flex size-[30px] shrink-0 items-center justify-center rounded-control"
              style={{ background: skin.bg, color: skin.ink }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13px] font-semibold text-ink">
                {documentTitle(document.name)}
              </span>
              <span className="text-[11px] text-caption">
                {[
                  document.created_at ? lastTouch(document.created_at).text.toLowerCase() : null,
                  documentSize(document.metadata?.["size"] as number | undefined),
                ]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </span>
            <span
              className="shrink-0 rounded-chip px-[9px] py-0.5 text-[11px] font-semibold"
              style={{ background: skin.bg, color: skin.ink }}
            >
              {document.category === "contract" ? "Contract" : "Quote"}
            </span>
          </button>
        );
      })}
      <span className="flex flex-wrap items-center gap-[11px] px-4 py-3">
        <select
          aria-label="What kind of document"
          value={kind}
          onChange={(e) => setKind(e.target.value as DocumentKind)}
          className="min-h-10 rounded-control border border-border-control bg-panel px-3 text-[13px]"
        >
          <option value="quote">Quote</option>
          <option value="contract">Contract</option>
        </select>
        <input
          ref={picker}
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          className="sr-only"
          id={`upload-${lead.id}`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload.mutate(file);
          }}
        />
        <label
          htmlFor={`upload-${lead.id}`}
          className="flex min-h-10 cursor-pointer items-center gap-2 rounded-control border border-border-control bg-panel px-3.5 py-2.5 text-[13px] font-semibold text-ink"
          aria-disabled={!canEdit}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 19V7M7 12l5-5 5 5" />
            <path d="M4 21h16" />
          </svg>
          {upload.isPending ? "Uploading…" : "Upload a file"}
        </label>
        <span className="text-[11px] text-caption">
          PDF or Word. It shows up on the Quotes and contracts page too.
        </span>
      </span>
    </div>
  );
}

/* ── Everything that happened ─────────────────────────────────────────────── */

function History({ lead, nameOf }: { lead: Lead; nameOf: (id: string | null) => string | null }) {
  const [all, setAll] = useState(false);
  const { data: activities = [] } = useQuery({
    queryKey: ["activities", lead.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("lead_id", lead.id)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const shown = all ? activities : activities.slice(0, 5);
  const rest = activities.length - shown.length;
  const oldest = activities[activities.length - 1]?.occurred_at;

  return (
    <div className="flex flex-col overflow-hidden rounded-panel border border-border bg-panel">
      <span className="flex items-baseline gap-2.5 border-b border-hairline px-4 pb-[11px] pt-[13px]">
        <span className="text-[13px] font-semibold tracking-[-0.02em]">
          Everything that happened
        </span>
        <span className="ml-auto text-[12px] text-caption">
          {activities.length === 0
            ? "nothing logged yet"
            : `${activities.length} ${activities.length === 1 ? "contact" : "contacts"}${
                oldest
                  ? ` since ${new Date(oldest).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                    })}`
                  : ""
              }`}
        </span>
      </span>

      {activities.length === 0 && (
        <span className="px-4 py-4 text-[12px] leading-[1.55] text-caption">
          Your move. Log the first call, email or note above and it starts here.
        </span>
      )}

      {shown.map((activity) => {
        const skin = KIND_SKIN[activity.channel] ?? KIND_SKIN["note"]!;
        const who = nameOf(activity.user_id);
        return (
          <div
            key={activity.id}
            className="flex items-start gap-3 border-b border-hairline px-4 py-3"
          >
            <span
              aria-hidden="true"
              className="mt-px flex size-7 shrink-0 items-center justify-center rounded-[9px]"
              style={{ background: skin.bg, color: skin.ink }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={KIND_ICON[activity.channel as Channel] ?? KIND_ICON.note} />
              </svg>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex flex-wrap items-baseline gap-2">
                <span className="text-[13px] font-semibold text-ink">
                  {labelFor(CHANNELS, activity.channel)}
                </span>
                <span className="ml-auto text-[11px] text-caption">
                  {lastTouch(activity.occurred_at).text}
                  {who ? `, ${who.split(" ")[0]}` : ""}
                </span>
              </span>
              {activity.body && (
                <span className="text-[12px] leading-[1.55] text-body">{activity.body}</span>
              )}
            </span>
          </div>
        );
      })}

      {rest > 0 && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="bg-panel-quiet px-4 py-3 text-left text-[12px] font-semibold text-accent-ink"
        >
          Show the other {rest}
        </button>
      )}
    </div>
  );
}
