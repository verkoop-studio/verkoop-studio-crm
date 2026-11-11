import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { pipelineQueryKey, usePipelineLeads, type Lead } from "@/hooks/use-pipeline-leads";
import { LeadCategoryFilter } from "@/components/LeadCategories";
import { matchesLeadCategory, type LeadCategoryFilterValue } from "@/lib/lead-categories";
import { PIPELINE_STEPS, STAGE_META, type Stage } from "@/lib/sales";
import { ChannelGlyph, OwnerAvatar, Segmented, euro, lastTouch } from "@/components/sales-ui";

export const Route = createFileRoute("/_authenticated/prospectflow")({
  head: () => ({ meta: [{ title: "Prospect flow | Sales" }] }),
  component: ProspectFlow,
});

type Who = "all" | "mine";

const COLUMN_DOT: Record<Stage, string> = {
  new: "var(--vsp-stage-new)",
  contacted: "var(--vsp-stage-contacted)",
  engaged: "var(--vsp-stage-engaged)",
  meeting: "var(--vsp-stage-meeting)",
  proposal: "var(--vsp-stage-closing)",
  won: "var(--vsp-good)",
  lost: "var(--vsp-bad)",
};

const SHOWN_PER_COLUMN = 6;

/*
 * Five columns, and no more.
 *
 * Won and lost are not columns here: they sit in a strip under the board,
 * because a finished deal is an outcome, not a column you drag through. The
 * Everyone/Mine control rewrites the column headers as well as the cards —
 * the count becomes "11 of 28", and the value and the unvalued line follow —
 * so the header never describes a set that is no longer on screen.
 */
function ProspectFlow() {
  const { company } = Route.useRouteContext();
  const { data: me } = useCurrentUser();
  const client = useQueryClient();
  const [who, setWho] = useState<Who>("all");
  const [category, setCategory] = useState<LeadCategoryFilterValue>("all");
  const [expanded, setExpanded] = useState<Set<Stage>>(new Set());
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email");
      if (error) throw error;
      return data;
    },
  });
  const nameOf = (id: string | null) =>
    profiles.find((p) => p.id === id)?.full_name ??
    profiles.find((p) => p.id === id)?.email ??
    null;

  const { data: all = [], isPending, isError, refetch } = usePipelineLeads();
  const scoped = all.filter((lead) => matchesLeadCategory(lead, category));
  const leads = who === "mine" && me ? scoped.filter((l) => l.owner_id === me.id) : scoped;

  const move = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: Stage }) => {
      const { data, error } = await supabase
        .from("leads")
        .update({ stage })
        .eq("id", id)
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("Update failed");
    },
    onMutate: async ({ id, stage }) => {
      await client.cancelQueries({ queryKey: pipelineQueryKey });
      const previous = client.getQueryData<Lead[]>(pipelineQueryKey);
      client.setQueryData<Lead[]>(pipelineQueryKey, (rows) =>
        rows?.map((row) => (row.id === id ? { ...row, stage } : row)),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) client.setQueryData(pipelineQueryKey, context.previous);
      toast.error("Move failed. Please try again.");
    },
    onSuccess: (_data, { stage }) => toast.success(`Moved to ${STAGE_META[stage].short}`),
    onSettled: () => client.invalidateQueries({ queryKey: ["leads"] }),
  });

  if (isPending) {
    return (
      <p role="status" className="py-10 text-[13px] text-body-quiet">
        Loading prospects…
      </p>
    );
  }
  if (isError) {
    return (
      <div role="alert" className="panel p-6 text-[13px]">
        Loading failed.{" "}
        <button type="button" className="font-semibold text-link" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const open = leads.filter((lead) => PIPELINE_STEPS.includes(lead.stage as Stage));
  const openValue = open.reduce((sum, lead) => sum + (lead.value_estimate ?? 0), 0);
  const allOpen = scoped.filter((lead) => PIPELINE_STEPS.includes(lead.stage as Stage));

  const won = leads.filter((lead) => lead.stage === "won");
  const lost = leads.filter((lead) => lead.stage === "lost");
  const closed = won.length + lost.length;

  return (
    <div className="flex flex-col gap-3.5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex flex-col gap-px">
          <h1 className="m-0 text-[20px] font-bold tracking-[-0.045em] text-ink-strong">
            Prospect flow
          </h1>
          <span className="text-[12px] text-body-quiet">
            {who === "all"
              ? `${open.length} open prospects, ${euro(openValue)} estimated. Drag a card to move it.`
              : `${open.length} of your own, ${euro(openValue)} estimated. Drag a card to move it.`}
          </span>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <Segmented<Who>
            label="Show"
            value={who}
            onChange={setWho}
            options={[
              { value: "all", label: "Everyone" },
              { value: "mine", label: "Mine" },
            ]}
          />
          <Link
            to="/leads"
            className="flex min-h-10 items-center gap-2 rounded-control border border-border bg-panel px-[13px] py-2.5 text-[13px] font-semibold text-ink no-underline"
          >
            See them as a list
          </Link>
        </div>
      </div>

      <LeadCategoryFilter
        companyId={company.id}
        leads={all}
        value={category}
        onChange={setCategory}
      />

      {/* The board */}
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-[1060px] items-start gap-3">
          {PIPELINE_STEPS.map((step) => {
            const cards = open
              .filter((lead) => lead.stage === step)
              .sort(
                (a, b) =>
                  Date.parse(b.last_touch_at ?? b.created_at) -
                  Date.parse(a.last_touch_at ?? a.created_at),
              );
            const everyone = allOpen.filter((lead) => lead.stage === step);
            const value = cards.reduce((sum, lead) => sum + (lead.value_estimate ?? 0), 0);
            const blank = cards.filter((lead) => lead.value_estimate == null).length;
            const isOpen = expanded.has(step);
            const shown = isOpen ? cards : cards.slice(0, SHOWN_PER_COLUMN);
            const more = cards.length - shown.length;
            const closing = step === "proposal";

            return (
              <section
                key={step}
                aria-label={STAGE_META[step].short}
                onDragOver={(event) => {
                  if (!dragging || move.isPending) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setOver(step);
                }}
                onDragLeave={() => setOver((current) => (current === step ? null : current))}
                onDrop={(event) => {
                  event.preventDefault();
                  const id = event.dataTransfer.getData("text/plain");
                  setOver(null);
                  setDragging(null);
                  const lead = leads.find((l) => l.id === id);
                  if (lead && lead.stage !== step) move.mutate({ id, stage: step });
                }}
                className="flex min-w-0 flex-1 flex-col rounded-panel border bg-panel"
                style={{
                  borderColor:
                    over === step
                      ? "var(--vsp-accent)"
                      : closing
                        ? "var(--vsp-good-line)"
                        : "var(--vsp-border)",
                  boxShadow: closing ? "0 0 0 1px var(--vsp-good-line)" : "none",
                }}
              >
                <div className="flex flex-col gap-[3px] border-b border-hairline px-3.5 pb-3 pt-3.5">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-[7px] rounded-full"
                      style={{ background: COLUMN_DOT[step] }}
                    />
                    <span
                      className="min-w-0 flex-1 text-[13px] font-bold tracking-[-0.02em]"
                      style={closing ? { color: "var(--vsp-good)" } : undefined}
                    >
                      {STAGE_META[step].short}
                    </span>
                    <span
                      className="text-[12px] font-semibold vsp-nums"
                      style={{ color: closing ? "var(--vsp-good)" : "var(--vsp-text)" }}
                    >
                      {who === "mine" ? `${cards.length} of ${everyone.length}` : cards.length}
                    </span>
                  </span>
                  <span className="pl-[15px] text-[11px] text-caption vsp-nums">
                    {euro(value)} · {blank === 0 ? "all valued" : `${blank} not valued`}
                  </span>
                </div>

                <div className="flex flex-col gap-2 p-2.5">
                  {shown.map((lead) => {
                    const touch = lastTouch(lead.last_touch_at ?? lead.created_at);
                    return (
                      <Link
                        key={lead.id}
                        to="/leads"
                        search={{ lead: lead.id }}
                        draggable={!move.isPending}
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", lead.id);
                          event.dataTransfer.effectAllowed = "move";
                          setDragging(lead.id);
                        }}
                        onDragEnd={() => {
                          setDragging(null);
                          setOver(null);
                        }}
                        className="vsp-card flex cursor-grab flex-col gap-2 rounded-card border bg-panel px-3 py-[11px] no-underline active:cursor-grabbing"
                        style={{
                          borderColor: touch.stale ? "var(--vsp-bad-line)" : "#e6e9f5",
                          opacity: dragging === lead.id ? 0.4 : 1,
                        }}
                      >
                        <span className="flex items-start gap-2">
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span
                              translate="no"
                              className="truncate text-[13px] font-semibold text-ink"
                            >
                              {lead.company}
                            </span>
                            <span className="truncate text-[11px] text-caption">
                              {lead.contact_name ? (
                                <span translate="no">{lead.contact_name}</span>
                              ) : (
                                "No contact yet"
                              )}
                            </span>
                          </span>
                          <span
                            aria-hidden="true"
                            className="shrink-0"
                            style={{ color: "#c4cbe2" }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="9" cy="6" r="1.6" />
                              <circle cx="15" cy="6" r="1.6" />
                              <circle cx="9" cy="12" r="1.6" />
                              <circle cx="15" cy="12" r="1.6" />
                              <circle cx="9" cy="18" r="1.6" />
                              <circle cx="15" cy="18" r="1.6" />
                            </svg>
                          </span>
                        </span>

                        <span className="flex items-center gap-2">
                          <ChannelGlyph source={lead.source} />
                          <span
                            className="min-w-0 flex-1 text-[12px] vsp-nums"
                            style={{
                              color:
                                lead.value_estimate == null
                                  ? "var(--vsp-caption)"
                                  : "var(--vsp-ink)",
                              fontWeight: lead.value_estimate == null ? 400 : 600,
                            }}
                          >
                            {lead.value_estimate == null ? "Not valued" : euro(lead.value_estimate)}
                          </span>
                          <OwnerAvatar id={lead.owner_id} name={nameOf(lead.owner_id)} size={22} />
                        </span>

                        <span
                          className="flex items-center gap-1.5 pt-[7px]"
                          style={{ borderTop: "1px solid #f2f3fa" }}
                        >
                          {touch.stale && (
                            <span
                              aria-hidden="true"
                              className="size-1.5 shrink-0 rounded-full"
                              style={{ background: "var(--vsp-bad)" }}
                            />
                          )}
                          <span
                            className="text-[11px]"
                            style={{
                              color: touch.stale ? "var(--vsp-bad-ink)" : "var(--vsp-caption)",
                            }}
                          >
                            {touch.text}
                          </span>
                        </span>
                      </Link>
                    );
                  })}

                  {more > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpanded(new Set([...expanded, step]))}
                      className="rounded-panel-inner border border-dashed px-2 py-2.5 text-[12px] font-semibold text-body-quiet"
                      style={{ background: "#fbfbfe", borderColor: "#dfe3f1" }}
                    >
                      {more} more in {STAGE_META[step].short}
                    </button>
                  )}

                  {cards.length === 0 && (
                    <span
                      className="rounded-panel-inner border border-dashed px-2 py-5 text-center text-[11px] text-caption"
                      style={{ borderColor: "#dfe3f1" }}
                    >
                      Nothing here. Drop a card in, or move one along from the left.
                    </span>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Outcomes, outside the flow */}
      <div className="flex flex-wrap items-center gap-[18px] rounded-panel border border-border bg-panel px-[18px] py-3.5">
        <span className="flex min-w-0 flex-[0_1_230px] flex-col gap-px">
          <span className="text-[13px] font-bold tracking-[-0.02em] text-ink-strong">
            Won and lost sit outside the flow
          </span>
          <span className="text-[12px] text-body-quiet">
            a finished deal is an outcome, not a column you drag through
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-3.5 vsp-nums">
          <span className="flex items-center gap-[9px] rounded-panel-inner bg-good-wash px-[13px] py-2">
            <span
              aria-hidden="true"
              className="size-[7px] rounded-full"
              style={{ background: "var(--vsp-good)" }}
            />
            <span className="text-[12px] text-good">Won</span>
            <strong className="text-[14px] font-bold text-good">{won.length}</strong>
            <span className="text-[12px] text-good">
              {euro(won.reduce((sum, lead) => sum + (lead.value_estimate ?? 0), 0))}
            </span>
          </span>
          <span className="flex items-center gap-[9px] rounded-panel-inner bg-bad-bg px-[13px] py-2">
            <span
              aria-hidden="true"
              className="size-[7px] rounded-full"
              style={{ background: "var(--vsp-bad)" }}
            />
            <span className="text-[12px] text-bad-ink">Lost</span>
            <strong className="text-[14px] font-bold text-bad-ink">{lost.length}</strong>
          </span>
          <span className="flex items-center gap-[9px] rounded-panel-inner bg-wash px-[13px] py-2">
            <span className="text-[12px] text-body-quiet">Win rate</span>
            <strong className="text-[14px] font-bold text-ink">
              {closed ? `${Math.round((won.length / closed) * 100)}%` : "—"}
            </strong>
          </span>
        </span>
        <Link
          to="/dashboard"
          className="ml-auto inline-flex items-center text-[12px] font-semibold no-underline"
        >
          Back to the dashboard
        </Link>
      </div>
    </div>
  );
}
