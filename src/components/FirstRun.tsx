import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCompanyId } from "@/lib/company-context";
import { useCompanies } from "@/hooks/use-companies";
import { readDraft } from "@/lib/onboarding";
import { PLAN, trialSchedule } from "@/lib/billing";
import { Panel } from "@/components/sales-ui";

/*
 * Day one: a workspace with nothing in it.
 *
 * The rule the canvas set for this screen is that an empty panel has to say
 * which of three kinds of empty it is — your move, a matter of time, or
 * nothing to do — because a screen that says "no data" four times teaches
 * nobody anything. Each cell below carries its reason, and only the two that
 * are actually your move carry a button.
 */
export function FirstRun() {
  const { data: companies = [] } = useCompanies();
  const companyId = getCompanyId();
  const company = companies.find((c) => c.id === companyId);
  const draft = readDraft();

  const { data: facts } = useQuery({
    queryKey: ["first-run", companyId],
    queryFn: async () => {
      const [members, imports, created] = await Promise.all([
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }),
        supabase.from("import_batches").select("id", { count: "exact", head: true }),
        supabase
          .from("companies")
          .select("created_at")
          .eq("id", companyId ?? "")
          .maybeSingle(),
      ]);
      return {
        members: members.count ?? 1,
        imports: imports.count ?? 0,
        createdAt: created.data?.created_at ?? null,
      };
    },
  });

  const trial = facts?.createdAt ? trialSchedule(facts.createdAt) : null;

  const setup = [
    {
      key: "workspace",
      name: "Workspace created",
      unlocks: company ? `${company.name}, you are the admin` : "you are the admin",
      done: true,
      cta: "",
      to: "/settings" as const,
      icon: "m5 13 4 4L19 7",
    },
    {
      key: "import",
      name: "Import your list",
      unlocks:
        draft.fillWith === "csv"
          ? "the list you said you had when you signed up"
          : "a CSV from a trade show, LinkedIn or your old spreadsheet",
      done: (facts?.imports ?? 0) > 0,
      cta: "Import",
      to: "/import" as const,
      icon: "M12 19V7M7 12l5-5 5 5M4 21h16",
    },
    {
      key: "team",
      name: "Invite your team",
      unlocks: "everyone is included in the price, so this costs nothing",
      done: (facts?.members ?? 1) > 1,
      cta: "Invite",
      to: "/settings" as const,
      icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M19 8v6M22 11h-6",
    },
    {
      key: "form",
      name: "Put the form on your site",
      unlocks: "leads that arrive while you sleep",
      done: false,
      cta: "Get it",
      to: "/settings" as const,
      icon: "m9 18-6-6 6-6M15 6l6 6-6 6",
    },
  ];
  const doneCount = setup.filter((step) => step.done).length;

  const kpis = [
    {
      label: "New this week",
      why: "Nothing has come in yet. Add one and this starts counting.",
      kind: "yours" as const,
      cta: "Add a lead",
    },
    {
      label: "Open pipeline",
      why: "Needs leads with a value on them. The value is yours to estimate, not ours.",
      kind: "yours" as const,
      cta: "Add a lead",
    },
    {
      label: "Win rate",
      why: "Only means something once you have won or lost a few. Weeks away, not minutes.",
      kind: "time" as const,
      cta: "",
    },
    {
      label: "Needs follow-up",
      why: "Nobody is waiting on you. That is the good kind of empty.",
      kind: "fine" as const,
      cta: "",
    },
  ];

  const ways = [
    {
      name: "Import your list",
      note: "CSV or Excel, map it once",
      to: "/import" as const,
      first: draft.fillWith === "csv" || draft.fillWith == null,
      icon: "M12 19V7M7 12l5-5 5 5M4 21h16",
    },
    {
      name: "Add one by hand",
      note: "about thirty seconds",
      to: "/leads" as const,
      first: draft.fillWith === "hand",
      icon: "M12 5v14M5 12h14",
    },
    {
      name: "Put a form on your site",
      note: "and they arrive on their own",
      to: "/settings" as const,
      first: draft.fillWith === "form",
      icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M2 12h20M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",
    },
  ].sort((a, b) => Number(b.first) - Number(a.first));

  return (
    <div className="flex flex-col gap-3.5">
      {/* Top bar: how far the set-up is, and the trial it is running inside */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex min-h-10 items-center gap-2.5 rounded-control border border-border bg-panel px-[13px] py-2">
          <span
            aria-hidden="true"
            className="h-[5px] w-[74px] overflow-hidden rounded-[3px] bg-chip"
          >
            <span
              className="block h-full rounded-[3px] bg-accent"
              style={{
                width: `${(doneCount / setup.length) * 100}%`,
                background: "var(--vsp-accent)",
              }}
            />
          </span>
          <span className="text-[12px] text-body">
            Set-up{" "}
            <strong className="font-semibold text-ink vsp-nums">
              {`${doneCount} of ${setup.length}`}
            </strong>
          </span>
        </span>

        {trial && (
          <span className="flex min-h-10 items-center gap-2 rounded-control border border-good-line bg-good-wash px-[13px] py-2 text-[12px] font-medium text-good">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            {`Day ${trial.dayOfTrial} of ${PLAN.trialDays} free`}
          </span>
        )}

        <Link
          to="/leads"
          search={{ new: true }}
          className="ml-auto flex min-h-10 items-center gap-2 rounded-control px-[15px] py-2.5 text-[13px] font-semibold text-white no-underline shadow-raised"
          style={{ background: "var(--vsp-accent)" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          New lead
        </Link>
      </div>

      {/* Set-up */}
      <div className="flex flex-wrap overflow-hidden rounded-panel bg-dark">
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-2.5 px-[22px] py-5">
          <span className="flex items-center gap-[9px]">
            <span
              className="vsp-live relative size-2 rounded-full"
              aria-hidden="true"
              style={{ background: "var(--vsp-good-bright)", color: "var(--vsp-good-bright)" }}
            />
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-dark-muted">
              Workspace is live
            </span>
          </span>
          <h2 className="m-0 text-balance text-[20px] font-bold tracking-[-0.04em] text-white">
            Empty, which is exactly how it should look right now.
          </h2>
          <p className="m-0 text-[13px] leading-[1.6] text-dark-text">
            Three things turn this into something you open every morning. The first one takes thirty
            seconds.
          </p>
        </div>
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-[7px] p-4">
          {setup.map((step) => (
            <span
              key={step.key}
              className="flex items-center gap-3 rounded-panel-inner px-[13px] py-2.5"
              style={{
                background: step.done ? "var(--vsp-dark-raised)" : "var(--vsp-dark-raised-2)",
              }}
            >
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-control bg-white"
                style={{ color: step.done ? "var(--vsp-good)" : "var(--vsp-accent-ink)" }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={step.icon} />
                </svg>
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-semibold text-white">{step.name}</span>
                <span className="truncate text-[11px] text-dark-muted">{step.unlocks}</span>
              </span>
              {step.done ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--vsp-good-bright)"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-label="Done"
                  role="img"
                  className="shrink-0"
                >
                  <path d="m5 13 4 4L19 7" />
                </svg>
              ) : (
                <Link
                  to={step.to}
                  className="shrink-0 rounded-chip px-3 py-[7px] text-[12px] font-semibold text-white no-underline"
                  style={{ background: "var(--vsp-accent-soft)" }}
                >
                  {step.cta}
                </Link>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* The four numbers, all empty, for three different reasons */}
      <Panel className="flex flex-wrap">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="flex min-h-[108px] min-w-0 flex-[1_1_210px] flex-col gap-1.5 border-r border-hairline px-[18px] py-4 last:border-r-0"
          >
            <span className="truncate text-[12px] text-body-quiet">{kpi.label}</span>
            <span
              className="text-[12px] leading-[1.5]"
              style={{
                color: kpi.kind === "fine" ? "var(--vsp-good)" : "var(--vsp-caption)",
              }}
            >
              {kpi.why}
            </span>
            {kpi.kind === "yours" && (
              <Link
                to="/leads"
                search={{ new: true }}
                className="mt-auto flex items-center gap-1.5 self-start rounded-chip bg-accent-tint px-2.5 py-1.5 text-[12px] font-semibold text-accent-ink no-underline"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {kpi.cta}
              </Link>
            )}
            {kpi.kind === "fine" && (
              <span className="mt-auto inline-flex items-center gap-1.5 self-start rounded-chip bg-good-wash px-2.5 py-1.5 text-[12px] font-semibold text-good">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 13 4 4L19 7" />
                </svg>
                Nothing to do
              </span>
            )}
          </div>
        ))}
      </Panel>

      {/* The empty list */}
      <Panel className="flex flex-col">
        <span className="flex flex-wrap items-baseline gap-2.5 border-b border-hairline px-[18px] pb-3 pt-4">
          <span className="text-[15px] font-semibold tracking-[-0.025em]">Your leads</span>
          <span className="ml-auto text-[12px] text-caption">none yet</span>
        </span>
        <div className="flex flex-wrap items-center gap-6 px-[22px] pb-6 pt-[26px]">
          <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2">
            <span className="text-[16px] font-semibold tracking-[-0.03em] text-ink">
              Three ways to fill this, in order of effort.
            </span>
            <span className="text-[13px] leading-[1.6] text-body-quiet">
              Typing one in is the fastest way to see how it works. Importing is the fastest way to
              get your real work in here. The form is the one that keeps working after you close the
              laptop.
            </span>
            {draft.fillWith && (
              <span className="pt-1 text-[11px] text-caption">
                You picked{" "}
                {draft.fillWith === "csv"
                  ? "importing a list"
                  : draft.fillWith === "form"
                    ? "a form on your website"
                    : "adding them yourself"}{" "}
                when you signed up, so that one is first.
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-2.5">
            {ways.map((way) => (
              <Link
                key={way.name}
                to={way.to}
                className="flex items-center gap-3 rounded-card border px-[15px] py-[13px] no-underline"
                style={{
                  background: way.first ? "var(--vsp-accent-tint-quiet)" : "var(--vsp-panel)",
                  borderColor: way.first ? "var(--vsp-accent-tint-line)" : "var(--vsp-border)",
                }}
              >
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-[9px]"
                  style={{
                    background: way.first ? "var(--vsp-accent-tint)" : "var(--vsp-chip-quiet)",
                    color: way.first ? "var(--vsp-accent-ink)" : "var(--vsp-text)",
                  }}
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
                  >
                    <path d={way.icon} />
                  </svg>
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[13px] font-semibold text-ink">{way.name}</span>
                  <span className="text-[11px] text-caption">{way.note}</span>
                </span>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--vsp-caption)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="shrink-0"
                >
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </Panel>

      <span className="text-[11px] leading-[1.6] text-caption">
        Every empty panel here says which of the three it is: your move, a matter of time, or
        nothing to do. A screen that says &ldquo;no data&rdquo; four times teaches nobody anything.
      </span>
    </div>
  );
}
