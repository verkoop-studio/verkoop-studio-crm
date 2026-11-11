import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePipelineLeads } from "@/hooks/use-pipeline-leads";
import { LeadSheet } from "@/components/LeadSheet";
import { LeadCategoryFilter } from "@/components/LeadCategories";
import { matchesLeadCategory, type LeadCategoryFilterValue } from "@/lib/lead-categories";
import {
  ChannelIcon,
  CompanyTile,
  LastTouch,
  OwnerAvatar,
  StageBadge,
  euro,
} from "@/components/sales-ui";
import {
  PIPELINE_STEPS,
  SOURCES,
  STAGES,
  STAGE_META,
  downloadCsv,
  formatDate,
  labelFor,
  priorityLabel,
  toCsv,
  todayIso,
  type Source,
  type Stage,
} from "@/lib/sales";

const PAGE_SIZE = 25;

type Search = {
  lead?: string | undefined;
  new?: boolean | undefined;
  stage?: string | undefined;
  owner?: string | undefined;
  valued?: "no" | undefined;
  bin?: boolean | undefined;
};

export const Route = createFileRoute("/_authenticated/leads")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const out: Search = {};
    if (typeof search["lead"] === "string") out.lead = search["lead"];
    if (search["new"] === true || search["new"] === "true") out.new = true;
    if (typeof search["stage"] === "string") out.stage = search["stage"];
    if (typeof search["owner"] === "string") out.owner = search["owner"];
    if (search["valued"] === "no") out.valued = "no";
    if (search["bin"] === true || search["bin"] === "true") out.bin = true;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Leads | Sales" },
      {
        name: "description",
        content:
          "Every lead, with the three fields the rest of the product reads: value, owner and stage.",
      },
    ],
  }),
  component: LeadsPage,
});

/*
 * The leads table, in the shape the canvas settled on.
 *
 * Value, owner and stage are in the table rather than one level down, because
 * they are the three fields every other screen reads. A lead with no estimate
 * says "Not valued" in grey and is the same lead the dashboard leaves out of
 * the open-pipeline figure. A last touch older than a week goes red here and
 * on the board, from the same rule.
 */
function LeadsPage() {
  const { company } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();

  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [category, setCategory] = useState<LeadCategoryFilterValue>("all");

  const { data: everything = [], isPending, isError, refetch } = usePipelineLeads(true);

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

  const inBin = search.bin === true;
  const stage = search.stage ?? "all";
  const owner = search.owner ?? "all";

  const setSearch = (patch: Search) => {
    setPage(0);
    void navigate({ search: (old) => ({ ...old, ...patch }), replace: true });
  };

  /** Everything that is not in the bin, before the stage chips narrow it. */
  const live = useMemo(
    () =>
      everything.filter((lead) => {
        if (inBin ? !lead.deleted_at : Boolean(lead.deleted_at)) return false;
        if (owner === "mine" && lead.owner_id !== me?.id) return false;
        if (owner === "nobody" && lead.owner_id) return false;
        if (!["all", "mine", "nobody"].includes(owner) && lead.owner_id !== owner) return false;
        if (channel !== "all" && lead.source !== channel) return false;
        if (search.valued === "no" && lead.value_estimate != null) return false;
        if (!matchesLeadCategory(lead, category)) return false;
        const term = query.trim().toLowerCase();
        if (!term) return true;
        return [lead.company, lead.contact_name, lead.email, lead.city, lead.campaign]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      }),
    [everything, inBin, owner, channel, query, category, search.valued, me?.id],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: live.length };
    for (const option of STAGES) map[option.value] = 0;
    for (const lead of live) map[lead.stage] = (map[lead.stage] ?? 0) + 1;
    return map;
  }, [live]);

  const filtered = useMemo(
    () =>
      live
        .filter((lead) => stage === "all" || lead.stage === stage)
        .sort(
          (a, b) =>
            Date.parse(b.last_touch_at ?? b.created_at) -
            Date.parse(a.last_touch_at ?? a.created_at),
        ),
    [live, stage],
  );

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  /* Which of the four empty tables this is, and how to get out of it. */
  const emptyReason: "workspace" | "bin" | "search" | "filters" =
    everything.length === 0
      ? "workspace"
      : inBin && live.length === 0 && !query.trim()
        ? "bin"
        : query.trim()
          ? "search"
          : "filters";
  const clearNarrowing = () => {
    setQuery("");
    setChannel("all");
    setCategory("all");
    setSearch({ stage: undefined, owner: undefined, valued: undefined });
  };

  const binCount = everything.filter((lead) => lead.deleted_at).length;
  const openLead = everything.find((lead) => lead.id === search.lead) ?? null;

  const bulk = useMutation({
    mutationFn: async (patch: { stage?: Stage; owner_id?: string | null }) => {
      const ids = [...selected];
      const { error } = await supabase.from("leads").update(patch).in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} leads updated`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const exportSelected = () => {
    const chosen = filtered.filter((lead) => selected.has(lead.id));
    const list = chosen.length ? chosen : filtered;
    const headers = [
      "Company",
      "City",
      "Contact",
      "Job title",
      "Email",
      "Phone",
      "LinkedIn",
      "Website",
      "Country",
      "Via",
      "Campaign",
      "Stage",
      "Value",
      "Importance",
      "Owner",
      "Last touch",
    ];
    downloadCsv(
      `sales-leads-${todayIso()}.csv`,
      toCsv(
        headers,
        list.map((lead) => [
          lead.company,
          lead.city,
          lead.contact_name,
          lead.job_title,
          lead.email,
          lead.phone,
          lead.linkedin_url,
          lead.website,
          lead.country,
          labelFor(SOURCES, lead.source),
          lead.campaign,
          STAGE_META[lead.stage as Stage].short,
          lead.value_estimate ?? "",
          priorityLabel(lead.priority),
          nameOf(lead.owner_id) ?? "",
          lead.last_touch_at ? formatDate(lead.last_touch_at) : "",
        ]),
      ),
    );
    toast.success(`${list.length} leads exported`);
  };

  const stageTabs = [
    { value: "all", label: inBin ? "Everything in the bin" : "All open and closed" },
    ...STAGES.map((option) => ({ value: option.value, label: STAGE_META[option.value].short })),
  ];

  return (
    <div className="flex flex-col gap-3.5">
      {/*
       * The canvas gives this screen no visible title — it opens straight on
       * its controls — but a page still needs a heading to be navigable by
       * anything other than sight. Hidden, so the drawing is unchanged and
       * the document still has a top to it.
       */}
      <h1 className="sr-only">Leads</h1>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="relative flex min-w-[180px] flex-[0_1_280px]">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--vsp-caption)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
          </svg>
          <label htmlFor="lead-search" className="sr-only">
            Search leads
          </label>
          <input
            id="lead-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Company, contact or email"
            className="min-h-10 w-full rounded-control border border-border bg-panel py-2.5 pl-[34px] pr-[13px] text-[13px] text-ink"
          />
        </span>

        <label htmlFor="lead-owner" className="sr-only">
          Owner
        </label>
        <select
          id="lead-owner"
          value={owner}
          onChange={(e) => setSearch({ owner: e.target.value })}
          className="min-h-10 rounded-control border border-border bg-panel pl-[13px] pr-9 text-[13px] font-medium text-body"
        >
          <option value="all">Owner: everyone</option>
          <option value="mine">Owner: me</option>
          <option value="nobody">Owner: nobody yet</option>
          {profiles
            .filter((p) => p.id !== me?.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                Owner: {p.full_name ?? p.email}
              </option>
            ))}
        </select>

        <label htmlFor="lead-channel" className="sr-only">
          Channel
        </label>
        <select
          id="lead-channel"
          value={channel}
          onChange={(e) => {
            setChannel(e.target.value);
            setPage(0);
          }}
          className="min-h-10 rounded-control border border-border bg-panel pl-[13px] pr-9 text-[13px] font-medium text-body"
        >
          <option value="all">All channels</option>
          {SOURCES.map((source) => (
            <option key={source.value} value={source.value}>
              {source.label}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2.5">
          <Link
            to="/import"
            className="flex min-h-10 items-center gap-2 rounded-control border border-border bg-panel px-[13px] py-2.5 text-[13px] font-semibold text-ink no-underline"
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
              <path d="M12 3v12M8 11l4 4 4-4" />
              <path d="M4 19h16" />
            </svg>
            Import a list
          </Link>
          <button
            type="button"
            onClick={() => setSearch({ new: true })}
            className="flex min-h-10 items-center gap-2 rounded-control px-[15px] py-2.5 text-[13px] font-semibold text-white shadow-raised"
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
          </button>
        </div>
      </div>

      {/* Stage chips, with the count each one actually holds */}
      <div role="group" aria-label="Stage" className="flex flex-wrap gap-[7px]">
        {stageTabs.map((tab) => {
          const on = stage === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              aria-pressed={on}
              onClick={() => setSearch({ stage: tab.value === "all" ? undefined : tab.value })}
              className="flex min-h-[38px] items-center gap-2 rounded-pill border px-[13px] py-[7px] text-[13px]"
              style={{
                background: on ? "var(--vsp-accent-tint)" : "var(--vsp-panel)",
                borderColor: on ? "var(--vsp-accent)" : "var(--vsp-border)",
                color: on ? "var(--vsp-accent-ink)" : "var(--vsp-text)",
                fontWeight: on ? 600 : 500,
              }}
            >
              {tab.label}
              <span
                className="text-[12px] font-semibold vsp-nums"
                style={{ color: on ? "var(--vsp-accent-ink)" : "var(--vsp-caption)" }}
              >
                {counts[tab.value] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <LeadCategoryFilter
        companyId={company.id}
        leads={everything.filter((lead) => (inBin ? lead.deleted_at : !lead.deleted_at))}
        value={category}
        onChange={(value) => {
          setCategory(value);
          setPage(0);
        }}
      />

      {/* The table */}
      <div className="flex flex-col overflow-hidden rounded-panel border border-border bg-panel">
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 border-b border-accent-tint-line bg-accent-tint px-[18px] py-[11px]">
            <span className="text-[13px] font-semibold text-accent-ink vsp-nums">
              {selected.size} selected
            </span>
            <label htmlFor="bulk-stage" className="sr-only">
              Move stage
            </label>
            <select
              id="bulk-stage"
              value=""
              disabled={bulk.isPending}
              onChange={(e) => e.target.value && bulk.mutate({ stage: e.target.value as Stage })}
              className="rounded-[7px] border border-accent-tint-line bg-panel pl-3 pr-9 py-[7px] text-[12px] font-semibold text-accent-ink"
            >
              <option value="">Move stage</option>
              {STAGES.map((option) => (
                <option key={option.value} value={option.value}>
                  {STAGE_META[option.value].short}
                </option>
              ))}
            </select>
            <label htmlFor="bulk-owner" className="sr-only">
              Assign owner
            </label>
            <select
              id="bulk-owner"
              value=""
              disabled={bulk.isPending}
              onChange={(e) =>
                e.target.value &&
                bulk.mutate({ owner_id: e.target.value === "none" ? null : e.target.value })
              }
              className="rounded-[7px] border border-accent-tint-line bg-panel pl-3 pr-9 py-[7px] text-[12px] font-semibold text-accent-ink"
            >
              <option value="">Assign owner</option>
              <option value="none">Nobody</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name ?? p.email}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={exportSelected}
              className="rounded-[7px] border border-accent-tint-line bg-panel px-3 py-[7px] text-[12px] font-semibold text-accent-ink"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set(filtered.map((lead) => lead.id)))}
              className="rounded-[7px] border border-accent-tint-line bg-panel px-3 py-[7px] text-[12px] font-semibold text-accent-ink"
            >
              Select all {filtered.length}
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="ml-auto px-3 py-[7px] text-[12px] font-semibold text-accent-ink"
            >
              Clear
            </button>
          </div>
        )}

        {/*
         * A phone gets the same seven facts as a card, not a seven-column
         * table squeezed into 375px. Same order, same rules: the value is
         * muted when there is none, the last touch is red when it is stale.
         */}
        <div className="flex flex-col md:hidden">
          {rows.map((lead) => {
            const on = selected.has(lead.id);
            return (
              <div
                key={lead.id}
                className="flex flex-col gap-2.5 border-b border-hairline px-4 py-3.5 last:border-b-0"
                style={{ background: on ? "var(--vsp-accent-tint-quiet)" : "transparent" }}
              >
                <span className="flex items-start gap-3">
                  <label htmlFor={`m-sel-${lead.id}`} className="sr-only">
                    Select {lead.company}
                  </label>
                  <input
                    id={`m-sel-${lead.id}`}
                    type="checkbox"
                    className="mt-1.5 size-4 shrink-0"
                    style={{ accentColor: "var(--vsp-accent)" }}
                    checked={on}
                    onChange={() => toggle(lead.id)}
                  />
                  <button
                    type="button"
                    onClick={() => setSearch({ lead: lead.id })}
                    className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                  >
                    <CompanyTile company={lead.company} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span translate="no" className="truncate text-[14px] font-semibold text-ink">
                        {lead.company}
                      </span>
                      <span translate="no" className="truncate text-[12px] text-caption">
                        {[lead.city, lead.contact_name].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </span>
                    <ChannelIcon source={lead.source} />
                  </button>
                </span>
                <span className="flex flex-wrap items-center gap-2.5 pl-7">
                  <StageBadge stage={lead.stage} />
                  <span
                    className="text-[13px] vsp-nums"
                    style={{
                      color: lead.value_estimate == null ? "var(--vsp-disabled)" : "var(--vsp-ink)",
                      fontWeight: lead.value_estimate == null ? 400 : 600,
                    }}
                  >
                    {lead.value_estimate == null ? "Not valued" : euro(lead.value_estimate)}
                  </span>
                  <span className="ml-auto flex items-center gap-2.5">
                    <LastTouch at={lead.last_touch_at ?? lead.created_at} />
                    <OwnerAvatar id={lead.owner_id} name={nameOf(lead.owner_id)} size={22} />
                  </span>
                </span>
              </div>
            );
          })}

          {isPending && (
            <span role="status" className="px-4 py-8 text-[13px] text-body-quiet">
              Loading leads…
            </span>
          )}
          {isError && (
            <span role="alert" className="px-4 py-8 text-[13px]">
              Could not load leads.{" "}
              <button type="button" className="font-semibold text-link" onClick={() => refetch()}>
                Retry
              </button>
            </span>
          )}
          {!isPending && !isError && rows.length === 0 && (
            <span className="block px-4 py-10 text-center">
              <NothingHere reason={emptyReason} term={query.trim()} onClear={clearNarrowing} />
            </span>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse vsp-nums">
            <thead>
              <tr className="bg-sunken">
                <th scope="col" className="w-[42px] border-b border-hairline py-[11px] pl-[18px]">
                  <label htmlFor="sel-all" className="sr-only">
                    Select all
                  </label>
                  <input
                    id="sel-all"
                    type="checkbox"
                    className="m-0 size-4"
                    style={{ accentColor: "var(--vsp-accent)" }}
                    checked={rows.length > 0 && rows.every((lead) => selected.has(lead.id))}
                    onChange={(e) =>
                      setSelected(e.target.checked ? new Set(rows.map((l) => l.id)) : new Set())
                    }
                  />
                </th>
                <Th>Company</Th>
                <Th>Contact</Th>
                <Th className="w-[52px]">Via</Th>
                <Th>Stage</Th>
                <Th align="right">Value</Th>
                <Th>Last touch</Th>
                <Th align="right" className="pl-3.5 pr-[18px]">
                  Owner
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((lead) => {
                const on = selected.has(lead.id);
                return (
                  <tr
                    key={lead.id}
                    className="vsp-tr cursor-pointer"
                    style={{ background: on ? "var(--vsp-accent-tint-quiet)" : "transparent" }}
                    onClick={() => setSearch({ lead: lead.id })}
                  >
                    <td
                      className="border-b border-hairline py-3 pl-[18px] align-middle"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <label htmlFor={`sel-${lead.id}`} className="sr-only">
                        Select {lead.company}
                      </label>
                      <input
                        id={`sel-${lead.id}`}
                        type="checkbox"
                        className="m-0 size-4"
                        style={{ accentColor: "var(--vsp-accent)" }}
                        checked={on}
                        onChange={() => toggle(lead.id)}
                      />
                    </td>
                    <td className="border-b border-hairline px-3 py-3">
                      {/*
                       * The cap is what makes `truncate` mean anything here. A
                       * table lays its columns out to fit their contents, so
                       * without a ceiling one long name — and this country is
                       * full of them — widened the whole column until the
                       * table scrolled sideways on a 1400px screen and the
                       * value column fell off the end. Capping the content,
                       * not the cell, works in both table and card layouts.
                       */}
                      <span className="flex max-w-[280px] items-center gap-2.5">
                        <CompanyTile company={lead.company} />
                        <span className="flex min-w-0 flex-col">
                          <span
                            translate="no"
                            title={lead.company}
                            className="truncate text-[13px] font-semibold text-ink"
                          >
                            {lead.company}
                          </span>
                          <span translate="no" className="truncate text-[11px] text-caption">
                            {lead.city ?? "—"}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="border-b border-hairline px-3 py-3">
                      <span
                        translate="no"
                        title={lead.contact_name ?? undefined}
                        className="block max-w-[220px] truncate text-[13px] text-ink"
                      >
                        {lead.contact_name ?? "—"}
                      </span>
                    </td>
                    <td className="border-b border-hairline px-3 py-3">
                      <ChannelIcon source={lead.source} />
                    </td>
                    <td className="border-b border-hairline px-3 py-3">
                      <StageBadge stage={lead.stage} />
                    </td>
                    <td className="border-b border-hairline px-3 py-3 text-right">
                      <span
                        className="text-[13px]"
                        style={{
                          color:
                            lead.value_estimate == null ? "var(--vsp-disabled)" : "var(--vsp-ink)",
                          fontWeight: lead.value_estimate == null ? 400 : 600,
                        }}
                      >
                        {lead.value_estimate == null ? "Not valued" : euro(lead.value_estimate)}
                      </span>
                    </td>
                    <td className="border-b border-hairline px-3 py-3">
                      <LastTouch at={lead.last_touch_at ?? lead.created_at} />
                    </td>
                    <td
                      className="border-b border-hairline py-3 pl-3.5 pr-[18px] text-right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="vsp-act inline-flex gap-1">
                          <button
                            type="button"
                            aria-label={`Log a call with ${lead.company}`}
                            title="Log a call"
                            onClick={() => setSearch({ lead: lead.id })}
                            className="flex size-7 items-center justify-center rounded-[7px] border border-border bg-panel text-body"
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.9"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            aria-label={`Open ${lead.company}`}
                            title="Open the lead"
                            onClick={() => setSearch({ lead: lead.id })}
                            className="flex size-7 items-center justify-center rounded-[7px] border border-border bg-panel text-body"
                          >
                            <svg
                              width="13"
                              height="13"
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
                          </button>
                        </span>
                        <OwnerAvatar id={lead.owner_id} name={nameOf(lead.owner_id)} />
                      </span>
                    </td>
                  </tr>
                );
              })}

              {isPending && (
                <tr>
                  <td
                    colSpan={8}
                    role="status"
                    className="px-[18px] py-8 text-[13px] text-body-quiet"
                  >
                    Loading leads…
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={8} role="alert" className="px-[18px] py-8 text-[13px]">
                    Could not load leads.{" "}
                    <button
                      type="button"
                      className="font-semibold text-link"
                      onClick={() => refetch()}
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              )}
              {!isPending && !isError && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-[18px] py-10 text-center">
                    <NothingHere
                      reason={emptyReason}
                      term={query.trim()}
                      onClear={clearNarrowing}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-hairline bg-sunken px-[18px] py-3">
          <span className="text-[12px] text-body-quiet">
            {`Showing ${rows.length} of ${filtered.length} ${
              stage === "all" ? "leads" : `in ${STAGE_META[stage as Stage]?.short ?? stage}`
            }, newest touch first`}
          </span>
          <span className="ml-auto flex items-center gap-[7px]">
            <button
              type="button"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
              className="rounded-[7px] border border-border bg-panel px-3 py-[7px] text-[12px] font-semibold text-ink disabled:cursor-not-allowed disabled:text-disabled"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={current >= pages - 1}
              onClick={() => setPage(current + 1)}
              className="rounded-[7px] border border-border bg-panel px-3 py-[7px] text-[12px] font-semibold text-ink disabled:cursor-not-allowed disabled:text-disabled"
            >
              Next
            </button>
          </span>
        </div>
      </div>

      <span className="flex flex-wrap items-center gap-2 text-[11px] leading-[1.6] text-caption">
        A lead with no estimated value is not counted in the open pipeline figure on the dashboard.
        Value, owner and stage are the three fields the rest of the product reads, so they sit in
        the table rather than one level down.
        {binCount > 0 && (
          <button
            type="button"
            onClick={() => setSearch({ bin: inBin ? undefined : true, stage: undefined })}
            className="font-semibold text-accent-ink underline"
          >
            {inBin ? "Back to the live leads" : `The bin holds ${binCount}`}
          </button>
        )}
      </span>

      {openLead && (
        <LeadSheet
          key={openLead.id}
          lead={openLead}
          profiles={profiles}
          onClose={() => setSearch({ lead: undefined })}
        />
      )}

      {search.new && <NewLead onClose={() => setSearch({ new: undefined })} />}
    </div>
  );
}

/*
 * An empty table has three different reasons behind it, and saying "nothing
 * matches these filters" when the cause is a typo in the search box sends
 * people to the wrong control. So name the reason, and put the way out of it
 * in the same sentence.
 */
function NothingHere({
  reason,
  term,
  onClear,
}: {
  reason: "workspace" | "bin" | "search" | "filters";
  term: string;
  onClear: () => void;
}) {
  if (reason === "workspace")
    return (
      <span className="text-[13px] text-body-quiet">
        Your move: no leads yet. Import a list or add the first one.
      </span>
    );
  if (reason === "bin")
    return <span className="text-[13px] text-body-quiet">The bin is empty.</span>;
  return (
    <span className="flex flex-wrap items-center justify-center gap-2 text-[13px] text-body-quiet">
      {reason === "search" ? (
        <span>
          Nothing matches <span className="font-semibold text-ink">{term}</span>.
        </span>
      ) : (
        <span>Nothing matches these filters.</span>
      )}
      <button type="button" onClick={onClear} className="font-semibold text-accent-ink underline">
        {reason === "search" ? "Clear the search" : "Clear the filters"}
      </button>
    </span>
  );
}

function Th({
  children,
  align = "left",
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`border-b border-hairline px-3 py-[11px] text-[11px] font-semibold uppercase tracking-[0.06em] text-caption ${className}`}
      style={{ textAlign: align }}
    >
      {children}
    </th>
  );
}

/* ── New lead ─────────────────────────────────────────────────────────────── */

const EMPTY = {
  company: "",
  contact_name: "",
  job_title: "",
  email: "",
  phone: "",
  city: "",
  campaign: "",
  source: "email" as Source,
  stage: "new" as Stage,
};

function NewLead({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();
  const [form, setForm] = useState(EMPTY);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", escape);
    dialog.current?.focus();
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);

  const create = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error("Not signed in");
      const { error } = await supabase.from("leads").insert({
        company: form.company,
        contact_name: form.contact_name || null,
        job_title: form.job_title || null,
        email: form.email || null,
        phone: form.phone || null,
        city: form.city || null,
        campaign: form.campaign || null,
        source: form.source,
        stage: form.stage,
        owner_id: me.id,
        created_by: me.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead added");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{ background: "#0b0f1c4d" }}
      />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="New lead"
        tabIndex={-1}
        className="relative flex max-h-[85vh] w-full max-w-[520px] flex-col overflow-y-auto rounded-panel border border-border bg-panel p-[22px] shadow-dialog outline-none"
      >
        <h2 className="m-0 text-[20px] font-bold tracking-[-0.045em] text-ink-strong">New lead</h2>
        <p className="mb-4 mt-1 text-[13px] text-body-quiet">
          A company from any channel. You become the owner.
        </p>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (form.company.trim()) create.mutate();
          }}
        >
          <div className="flex flex-wrap gap-3">
            <NewField label="Company" required basis="100%">
              <input
                required
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="min-h-[42px] w-full rounded-control border border-border-control bg-panel px-3 text-[14px]"
              />
            </NewField>
            <NewField label="Contact name">
              <input
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                className="min-h-[42px] w-full rounded-control border border-border-control bg-panel px-3 text-[14px]"
              />
            </NewField>
            <NewField label="Job title">
              <input
                value={form.job_title}
                onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                className="min-h-[42px] w-full rounded-control border border-border-control bg-panel px-3 text-[14px]"
              />
            </NewField>
            <NewField label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="min-h-[42px] w-full rounded-control border border-border-control bg-panel px-3 text-[14px]"
              />
            </NewField>
            <NewField label="Phone">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="min-h-[42px] w-full rounded-control border border-border-control bg-panel px-3 text-[14px]"
              />
            </NewField>
            <NewField label="City">
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="min-h-[42px] w-full rounded-control border border-border-control bg-panel px-3 text-[14px]"
              />
            </NewField>
            <NewField label="Campaign">
              <input
                value={form.campaign}
                onChange={(e) => setForm({ ...form, campaign: e.target.value })}
                className="min-h-[42px] w-full rounded-control border border-border-control bg-panel px-3 text-[14px]"
              />
            </NewField>
            <NewField label="Via">
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value as Source })}
                className="min-h-[42px] w-full rounded-control border border-border-control bg-panel pl-3 pr-9 text-[14px]"
              >
                {SOURCES.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </select>
            </NewField>
            <NewField label="Where it lands">
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value as Stage })}
                className="min-h-[42px] w-full rounded-control border border-border-control bg-panel pl-3 pr-9 text-[14px]"
              >
                {PIPELINE_STEPS.map((step) => (
                  <option key={step} value={step}>
                    {STAGE_META[step].short}
                  </option>
                ))}
              </select>
            </NewField>
          </div>
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="submit"
              disabled={!form.company.trim() || create.isPending}
              className="min-h-11 rounded-control px-4 text-[14px] font-semibold text-white shadow-raised disabled:opacity-50"
              style={{ background: "var(--vsp-accent)" }}
            >
              {create.isPending ? "Saving…" : "Save lead"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-control border border-border-control bg-panel px-4 text-[14px] font-semibold text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewField({
  label,
  children,
  required = false,
  basis = "200px",
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  basis?: string;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5" style={{ flexBasis: basis }}>
      <span className="text-[12px] font-semibold text-body">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
