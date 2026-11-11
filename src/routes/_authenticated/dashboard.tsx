import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { addWeeks, format, startOfWeek } from "date-fns";
import { usePipelineLeads, type Lead } from "@/hooks/use-pipeline-leads";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PIPELINE_STEPS, STAGE_META } from "@/lib/sales";
import { Panel, Segmented, daysSince, euro } from "@/components/sales-ui";
import { FirstRun } from "@/components/FirstRun";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard | Sales" }] }),
  component: Dashboard,
});

type Who = "all" | "mine";

/*
 * The dashboard the canvas draws: four figures in one panel, the weekly
 * inflow, where the open prospects are standing, and a dark panel that names
 * the three things worth doing today.
 *
 * The Everyone/Mine control at the top is not decoration. Every figure under
 * it — the four cells, the bars, the stage list and the three suggestions —
 * is computed from the same filtered set, so switching it changes the numbers
 * and not just which chip looks pressed.
 */
function Dashboard() {
  const [who, setWho] = useState<Who>("all");
  const { data: me } = useCurrentUser();
  const {
    data: allLeads = [],
    isPending,
    isError,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = usePipelineLeads();

  const leads = who === "mine" && me ? allLeads.filter((l) => l.owner_id === me.id) : allLeads;

  if (isPending) {
    return (
      <p role="status" className="py-10 text-[13px] text-body-quiet">
        Loading dashboard…
      </p>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="panel p-6 text-[13px]">
        Could not load data.{" "}
        <button type="button" className="font-semibold text-link" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  // Nothing in the workspace at all: the first-run screen, not four empty cells.
  if (allLeads.length === 0) return <FirstRun />;

  const now = Date.now();
  const monday = startOfWeek(new Date(now), { weekStartsOn: 1 });
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = addWeeks(monday, i - 7);
    const end = addWeeks(start, 1);
    return {
      start,
      count: leads.filter((lead) => {
        const created = new Date(lead.created_at).getTime();
        return created >= start.getTime() && created < end.getTime() && created <= now;
      }).length,
    };
  });
  const thisWeek = weeks[7]?.count ?? 0;
  const lastWeek = weeks[6]?.count ?? 0;
  const peak = Math.max(1, ...weeks.map((w) => w.count));

  const open = leads.filter((l) => l.stage !== "won" && l.stage !== "lost");
  const won = leads.filter((l) => l.stage === "won");
  const closed = leads.filter((l) => l.stage === "won" || l.stage === "lost");
  const unvalued = open.filter((l) => l.value_estimate == null);
  const pipeline = open.reduce((sum, l) => sum + (l.value_estimate ?? 0), 0);
  const stale = open.filter((l) => isStale(l, now));

  const stages = PIPELINE_STEPS.map((step) => ({
    step,
    label: STAGE_META[step].short,
    count: open.filter((lead) => lead.stage === step).length,
  }));
  const stagePeak = Math.max(1, ...stages.map((s) => s.count));

  const todos = [
    {
      key: "first-contact",
      title: "Make first contact",
      note: "5+ days in New, nobody reached out",
      count: open.filter(
        (l) => l.stage === "new" && !l.last_touch_at && (daysSince(l.created_at, now) ?? 0) >= 5,
      ).length,
      search: { stage: "new" as const },
      icon: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z",
    },
    {
      key: "no-value",
      title: "Add an estimated value",
      note: "open prospects with no amount",
      count: unvalued.length,
      search: { valued: "no" as const },
      icon: "M12 2v20M17 6.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 2.8 5 3.5 5 1.6 5 3.5-2.2 3-5 3-5-1.1-5-3",
    },
    {
      key: "closing-quiet",
      title: "Follow up on the proposal",
      note: "in Closing, quiet for a week",
      count: open.filter((l) => l.stage === "proposal" && isStale(l, now)).length,
      search: { stage: "proposal" as const },
      icon: "M3 3v18h18M7 14l4-4 3 3 5-6",
    },
  ];

  const refreshedMinutes = Math.max(0, Math.round((now - dataUpdatedAt) / 60_000));

  return (
    <div className="flex flex-col gap-3.5">
      {/*
       * The canvas gives this screen no visible title — it opens straight on
       * its controls — but a page still needs a heading to be navigable by
       * anything other than sight. Hidden, so the drawing is unchanged and
       * the document still has a top to it.
       */}
      <h1 className="sr-only">Dashboard</h1>
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Segmented<Who>
          label="Which leads"
          value={who}
          onChange={setWho}
          options={[
            { value: "all", label: "Everyone" },
            { value: "mine", label: "Mine" },
          ]}
        />
        <button
          type="button"
          disabled={isFetching}
          onClick={() => refetch()}
          className="flex min-h-10 items-center gap-2 rounded-control border border-border bg-panel px-[13px] py-2.5 text-[13px] font-medium text-body disabled:opacity-60"
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
            <path d="M20 11A8 8 0 0 0 6.3 6.3L3 9.5" />
            <path d="M3 4v5.5h5.5" />
            <path d="M4 13a8 8 0 0 0 13.7 4.7L21 14.5" />
            <path d="M21 20v-5.5h-5.5" />
          </svg>
          {isFetching
            ? "Refreshing…"
            : refreshedMinutes < 1
              ? "Refreshed just now"
              : `Refreshed ${refreshedMinutes} min ago`}
        </button>
        <Link
          to="/leads"
          className="ml-auto flex min-h-10 items-center gap-2 rounded-control bg-accent px-[15px] py-2.5 text-[13px] font-semibold text-white no-underline shadow-raised hover:bg-accent hover:text-white"
          style={{ background: "var(--vsp-accent)" }}
        >
          Manage leads
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h13M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>

      {/* The four numbers. One panel, hairlines instead of gaps. */}
      <Panel className="flex flex-wrap">
        <Kpi label="New this week" value={String(thisWeek)} note={`${lastWeek} last full week`} />
        <Kpi
          label="Open pipeline (estimated)"
          value={euro(pipeline)}
          note={`${open.length} active · ${unvalued.length} not yet valued`}
        />
        <Kpi
          label="Win rate"
          value={closed.length ? `${Math.round((won.length / closed.length) * 100)}%` : "—"}
          note={`${won.length} won / ${closed.length} closed`}
          ink="var(--vsp-good)"
        />
        <Kpi
          label="Needs follow-up"
          value={String(stale.length)}
          note="7+ days without contact"
          ink="var(--vsp-bad-ink)"
        />
      </Panel>

      {/* Inflow and where they are standing */}
      <div className="flex flex-wrap items-stretch gap-3.5">
        <Panel className="flex min-w-0 flex-[1_1_420px] flex-col">
          <span className="flex flex-wrap items-baseline gap-2.5 px-[18px] pb-2.5 pt-4">
            <span className="text-[15px] font-semibold tracking-[-0.025em]">
              New leads per week
            </span>
            <span className="ml-auto text-[12px] text-caption">last 8 weeks</span>
          </span>

          <div className="flex min-h-[180px] flex-1 items-end gap-2.5 px-[18px] pt-1.5">
            {weeks.map((week, i) => {
              const last = i === weeks.length - 1;
              return (
                <span
                  key={week.start.toISOString()}
                  className="flex min-w-0 flex-1 flex-col items-center gap-[7px]"
                >
                  <span
                    className="text-[12px] font-semibold vsp-nums"
                    style={{ color: last ? "var(--vsp-accent-ink)" : "var(--vsp-text)" }}
                  >
                    {week.count}
                  </span>
                  <span
                    aria-hidden="true"
                    className="w-full rounded-t-[5px]"
                    style={{
                      height: `${Math.round(26 + (week.count / peak) * 118)}px`,
                      background: last ? "var(--vsp-bar-peak)" : "var(--vsp-bar-low)",
                    }}
                  />
                </span>
              );
            })}
          </div>
          <div className="flex gap-2.5 px-[18px] pt-[7px]">
            {weeks.map((week, i) => (
              <span
                key={week.start.toISOString()}
                className="min-w-0 flex-1 text-center text-[11px] text-caption"
              >
                {/*
                 * The month is named once and then only when it changes, the
                 * way the canvas writes this axis: "15 Sep, 22, 29, 6 Oct".
                 * Eight labels all carrying "Sep" is three times the ink for
                 * the same information, and at a narrow width they collide.
                 */}
                {format(
                  week.start,
                  i === 0 || weeks[i - 1]?.start.getMonth() !== week.start.getMonth()
                    ? "d MMM"
                    : "d",
                )}
              </span>
            ))}
          </div>
          <span className="mt-auto border-t border-hairline bg-panel-quiet px-[18px] py-3 text-[12px] text-body-quiet">
            {`${thisWeek} this week, against ${lastWeek} the last full week.`}
          </span>
        </Panel>

        <Panel className="flex min-w-0 flex-[1_1_320px] flex-col">
          <span className="flex flex-wrap items-baseline gap-2.5 px-[18px] pb-3 pt-4">
            <span className="text-[15px] font-semibold tracking-[-0.025em]">
              Where are your prospects?
            </span>
            <span className="ml-auto text-[12px] text-caption vsp-nums">{open.length} open</span>
          </span>
          {stages.map(({ step, label, count }, i) => (
            <Link
              key={step}
              to="/prospectflow"
              className="vsp-row flex items-center gap-3 border-t border-hairline px-[18px] py-2.5 no-underline"
            >
              <span className="w-[120px] shrink-0 truncate text-[13px] text-ink">{label}</span>
              <span
                aria-hidden="true"
                className="h-2 min-w-0 flex-1 overflow-hidden rounded-[4px] bg-chip"
              >
                <span
                  className="block h-full rounded-[4px]"
                  style={{
                    width: `${Math.round((count / stagePeak) * 100)}%`,
                    background:
                      i === 4
                        ? "var(--vsp-stage-closing)"
                        : i === 3
                          ? "var(--vsp-accent-soft)"
                          : "var(--vsp-stage-bar)",
                  }}
                />
              </span>
              <span className="w-[26px] shrink-0 text-right text-[13px] font-semibold text-ink vsp-nums">
                {count}
              </span>
            </Link>
          ))}
          <span className="mt-auto border-t border-hairline bg-panel-quiet px-[18px] py-3 text-[12px] text-body-quiet">
            Won and lost are not counted here.
          </span>
        </Panel>
      </div>

      {/* Next step */}
      <div className="flex flex-wrap overflow-hidden rounded-panel bg-dark">
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-[9px] px-[22px] py-5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-dark-muted">
            Next step
          </span>
          <h2 className="m-0 text-balance text-[20px] font-bold tracking-[-0.04em] text-white">
            Keep things moving.
          </h2>
          <p className="m-0 text-[13px] leading-[1.6] text-dark-text">
            Suggested from last contact, stage and value. None of it happens on its own: it is what
            you could do today.
          </p>
        </div>
        <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-[7px] p-4">
          {todos.map((todo) => (
            <Link
              key={todo.key}
              to="/leads"
              search={{ ...todo.search, owner: who === "mine" ? "mine" : undefined }}
              className="flex items-center gap-3 rounded-raised bg-dark-raised px-[13px] py-[11px] no-underline"
            >
              <span
                aria-hidden="true"
                className="flex size-[26px] shrink-0 items-center justify-center rounded-control bg-dark-raised-2"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--vsp-dark-bright)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={todo.icon} />
                </svg>
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-semibold text-white">{todo.title}</span>
                <span className="truncate text-[11px] text-dark-muted">{todo.note}</span>
              </span>
              <span className="shrink-0 rounded-full bg-dark-raised-2 px-[9px] py-[3px] text-[12px] font-semibold text-white vsp-nums">
                {todo.count}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function isStale(lead: Lead, now: number) {
  const days = daysSince(lead.last_touch_at ?? lead.created_at, now);
  return days == null || days >= 7;
}

function Kpi({
  label,
  value,
  note,
  ink = "var(--vsp-ink)",
}: {
  label: string;
  value: string;
  note: string;
  ink?: string;
}) {
  return (
    <div className="flex min-h-24 min-w-0 flex-[1_1_200px] flex-col gap-[5px] border-b border-hairline px-[18px] py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <span className="truncate text-[12px] text-body-quiet">{label}</span>
      <span className="text-[24px] font-bold tracking-[-0.045em] vsp-nums" style={{ color: ink }}>
        {value}
      </span>
      <span className="text-[11px] text-caption">{note}</span>
    </div>
  );
}
