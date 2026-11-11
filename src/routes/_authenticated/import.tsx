import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Panel } from "@/components/sales-ui";
import {
  DELIMITER_NAME,
  IMPORT_FIELDS,
  PIPELINE_STEPS,
  STAGE_META,
  detectDelimiter,
  guessColumnMapping,
  parseCsv,
  planLeadImport,
  type ImportFieldKey,
  type Stage,
} from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({
    meta: [
      { title: "Import a list | Sales" },
      {
        name: "description",
        content:
          "Map a CSV once — company, contact, email — and we remember the mapping for the next list.",
      },
    ],
  }),
  component: ImportPage,
});

const MAPPING_KEY = "sales-import-mapping";
const UNDO_DAYS = 30;

type Owner = "split" | "nobody" | string;

async function loadImportCandidates() {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from("leads")
      .select("id, company, contact_name, email, linkedin_url")
      .order("id")
      .range(offset, offset + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}

/*
 * Import a list.
 *
 * The mapping table runs the way the canvas draws it: one row per column in
 * the file, each saying what that column becomes, with "Leave it out" as a
 * real choice. Mapping it once is enough — the mapping is remembered against
 * the file's own header line, so the next export from the same tool arrives
 * already mapped.
 *
 * Nothing here overwrites an existing lead, and an import can be undone for
 * thirty days: every row it creates carries its batch, and undoing the batch
 * puts those leads in the bin with their history intact.
 */
function ImportPage() {
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();
  const picker = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<{ name: string; delimiter: string } | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<(ImportFieldKey | "")[]>([]);
  const [owner, setOwner] = useState<Owner>("split");
  const [stage, setStage] = useState<Stage>("new");
  const [campaign, setCampaign] = useState("");
  const [dedupe, setDedupe] = useState(true);

  const { data: existing = [] } = useQuery({
    queryKey: ["leads-dedupe"],
    queryFn: loadImportCandidates,
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email");
      if (error) throw error;
      return data;
    },
  });
  const { data: batches = [] } = useQuery({
    queryKey: ["import-batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("import_batches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  /* The mapping is remembered against the header line it was made for. */
  const signature = headers.join("|");
  useEffect(() => {
    if (!signature) return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(MAPPING_KEY) ?? "{}") as Record<
        string,
        (ImportFieldKey | "")[]
      >;
      const remembered = saved[signature];
      if (remembered && remembered.length === headers.length) setMapping(remembered);
    } catch {
      /* A remembered mapping is a convenience, never a requirement. */
    }
  }, [signature, headers.length]);

  const remember = (next: (ImportFieldKey | "")[]) => {
    setMapping(next);
    if (!signature) return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(MAPPING_KEY) ?? "{}") as Record<
        string,
        unknown
      >;
      saved[signature] = next;
      window.localStorage.setItem(MAPPING_KEY, JSON.stringify(saved));
    } catch {
      /* Nothing to remember when storage is blocked. */
    }
  };

  const onFile = async (chosen: File) => {
    const text = await chosen.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      toast.error("That file has no data rows.");
      return;
    }
    const [head, ...body] = parsed;
    setFile({ name: chosen.name, delimiter: detectDelimiter(text) });
    setHeaders(head!);
    setRows(body);
    setMapping(guessColumnMapping(head!));
  };

  const buildRows = useCallback(() => {
    const indexOf = (key: ImportFieldKey) => mapping.indexOf(key);
    const cell = (row: string[], key: ImportFieldKey) => {
      const index = indexOf(key);
      const value = index >= 0 ? row[index] : "";
      return value && value.length > 0 ? value : null;
    };
    return rows
      .map((row) => {
        const company = cell(row, "company");
        if (!company) return null;
        return {
          company,
          contact_name: cell(row, "contact_name"),
          job_title: cell(row, "job_title"),
          email: cell(row, "email"),
          phone: cell(row, "phone"),
          linkedin_url: cell(row, "linkedin_url"),
          website: cell(row, "website"),
          city: cell(row, "city"),
          country: cell(row, "country"),
          campaign: cell(row, "campaign") ?? (campaign || null),
          notes: cell(row, "notes"),
          source: "csv" as const,
          stage,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [rows, mapping, campaign, stage]);

  const split = useMemo(() => {
    if (!mapping.includes("company")) {
      return { fresh: [] as ReturnType<typeof buildRows>, dupes: [] as { existingId: string }[] };
    }
    return planLeadImport(buildRows(), existing, () => crypto.randomUUID());
  }, [mapping, buildRows, existing]);

  const willCreate = dedupe ? split.fresh.length : split.fresh.length + split.dupes.length;
  const missingCompany = rows.length - (split.fresh.length + split.dupes.length);
  const mapped = mapping.filter(Boolean).length;
  const left = mapping.length - mapped;

  const members = profiles.filter((profile) => profile.id);

  const run = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error("Not signed in");
      if (!mapping.includes("company")) throw new Error("Say which column is the company first.");

      // Re-read immediately before writing, including after a failed attempt.
      const { fresh, dupes } = planLeadImport(buildRows(), await loadImportCandidates(), () =>
        crypto.randomUUID(),
      );
      const create = dedupe ? fresh : [...fresh, ...dupes.map((item) => item.row)];
      if (create.length === 0) throw new Error("Nothing new to import.");

      // The batch is written first, so every lead can carry it and the import
      // can be undone as one thing.
      const { data: batch, error: batchError } = await supabase
        .from("import_batches")
        .insert({
          file_name: file?.name ?? "list.csv",
          source: "csv",
          campaign: campaign || null,
          row_count: rows.length,
          imported_count: create.length,
          skipped_count: rows.length - create.length,
          created_by: me.id,
        })
        .select("id")
        .single();
      if (batchError || !batch) throw batchError ?? new Error("Could not start the import");

      const owners =
        owner === "split"
          ? members.map((member) => member.id)
          : owner === "nobody"
            ? [null]
            : [owner];

      const { error } = await supabase.from("leads").insert(
        create.map((row, index) => ({
          ...row,
          import_batch_id: batch.id,
          owner_id: owners.length ? (owners[index % owners.length] ?? null) : null,
          created_by: me.id,
        })),
      );
      if (error) throw error;
      return { created: create.length, batchId: batch.id };
    },
    onSuccess: (result) => {
      toast.success(`${result.created} leads imported. You can undo this for ${UNDO_DAYS} days.`);
      setFile(null);
      setHeaders([]);
      setRows([]);
      setMapping([]);
      if (picker.current) picker.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-dedupe"] });
      queryClient.invalidateQueries({ queryKey: ["import-batches"] });
    },
    onError: (error: Error) =>
      toast.error(
        `Import stopped: ${error.message} Nothing was overwritten; trying again checks for duplicates once more.`,
      ),
  });

  const undo = useMutation({
    mutationFn: async (batchId: string) => {
      const { data, error } = await supabase
        .from("leads")
        .update({ deleted_at: new Date().toISOString() })
        .eq("import_batch_id", batchId)
        .is("deleted_at", null)
        .select("id");
      if (error) throw error;
      return data.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} leads moved to the bin. Their history went with them.`);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-dedupe"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="flex flex-col gap-3.5">
      {/* Head */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/leads"
          aria-label="Back to leads"
          className="flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-panel text-body no-underline"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H6M11 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-px">
          <h1 className="m-0 text-[20px] font-bold tracking-[-0.045em] text-ink-strong">
            Import a list
          </h1>
          <span className="text-[12px] text-body-quiet">
            A CSV from a trade show, LinkedIn or a scraper. Map it once and we remember the mapping
            for next time.
          </span>
        </div>
      </div>

      {/* The file */}
      <div className="flex flex-wrap items-center gap-3.5 rounded-panel border border-border bg-panel px-[18px] py-[15px]">
        <span
          aria-hidden="true"
          className="flex size-[38px] shrink-0 items-center justify-center rounded-[11px]"
          style={{
            background: file ? "var(--vsp-good-bg)" : "var(--vsp-chip-quiet)",
            color: file ? "var(--vsp-good)" : "var(--vsp-caption)",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M8 13h8M8 17h5" />
          </svg>
        </span>
        <span className="flex min-w-0 flex-[1_1_240px] flex-col">
          <span translate="no" className="truncate text-[14px] font-semibold text-ink">
            {file?.name ?? "No file chosen yet"}
          </span>
          <span className="text-[12px] text-caption vsp-nums">
            {file
              ? `${rows.length} rows, ${headers.length} columns, separated by ${
                  DELIMITER_NAME[file.delimiter] ?? "commas"
                }`
              : "A CSV export, up to a few thousand rows at a time."}
          </span>
        </span>
        <input
          ref={picker}
          id="csv"
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => {
            const chosen = event.target.files?.[0];
            if (chosen) void onFile(chosen);
          }}
        />
        <label
          htmlFor="csv"
          className="min-h-10 cursor-pointer rounded-control border border-border-control bg-panel px-3.5 py-2.5 text-[13px] font-semibold text-ink"
        >
          {file ? "Choose another file" : "Choose a file"}
        </label>
      </div>

      {headers.length > 0 && (
        <>
          {/* Which column is what */}
          <Panel className="flex flex-col">
            <span className="flex flex-wrap items-baseline gap-2.5 border-b border-hairline px-[18px] pb-3 pt-[15px]">
              <span className="text-[15px] font-semibold tracking-[-0.025em]">
                Which column is what
              </span>
              <span className="ml-auto text-[12px] text-caption vsp-nums">
                {mapped} of {mapping.length} columns mapped
                {left > 0 ? `, ${left} left out` : ""}
              </span>
            </span>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr className="bg-sunken">
                    <th
                      scope="col"
                      className="border-b border-hairline px-[18px] py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-caption"
                    >
                      Column in your file
                    </th>
                    <th
                      scope="col"
                      className="border-b border-hairline px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-caption"
                    >
                      First row says
                    </th>
                    <th
                      scope="col"
                      className="border-b border-hairline py-2.5 pl-3.5 pr-[18px] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-caption"
                    >
                      Goes into
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((header, index) => {
                    const field = mapping[index] ?? "";
                    const out = field !== "";
                    const required = field === "company";
                    const taken = (key: ImportFieldKey) =>
                      mapping.some((value, other) => other !== index && value === key);
                    return (
                      <tr key={`${header}-${index}`} className="vsp-row">
                        <td className="border-b border-hairline px-[18px] py-2.5">
                          <span className="flex items-center gap-2.5">
                            <span
                              translate="no"
                              className="text-[13px] font-semibold"
                              style={{
                                color: out ? "var(--vsp-ink)" : "var(--vsp-disabled)",
                              }}
                            >
                              {header || `Column ${index + 1}`}
                            </span>
                            {required && (
                              <span className="rounded-chip bg-accent-tint px-[7px] py-0.5 text-[10px] font-semibold text-accent-ink">
                                needed
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="border-b border-hairline px-3.5 py-2.5">
                          <span
                            translate="no"
                            className="block max-w-[260px] truncate text-[12px] text-caption"
                          >
                            {rows[0]?.[index] || "—"}
                          </span>
                        </td>
                        <td className="border-b border-hairline py-2.5 pl-3.5 pr-[18px]">
                          <label htmlFor={`map-${index}`} className="sr-only">
                            What {header} becomes
                          </label>
                          <select
                            id={`map-${index}`}
                            value={field}
                            onChange={(event) => {
                              const next = [...mapping];
                              next[index] = event.target.value as ImportFieldKey | "";
                              remember(next);
                            }}
                            className="min-h-[38px] w-full max-w-[230px] rounded-control border bg-panel pl-[11px] pr-9 text-[13px]"
                            style={{
                              borderColor: required
                                ? "var(--vsp-accent)"
                                : "var(--vsp-border-control)",
                              color: out ? "var(--vsp-ink)" : "var(--vsp-disabled)",
                              fontWeight: required ? 600 : 500,
                            }}
                          >
                            <option value="">Leave it out</option>
                            {IMPORT_FIELDS.map((item) => (
                              <option
                                key={item.key}
                                value={item.key}
                                disabled={taken(item.key) && field !== item.key}
                              >
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* What happens to them, and the summary */}
          <div className="flex flex-wrap items-stretch gap-3.5">
            <Panel className="flex min-w-0 flex-[1_1_400px] flex-col">
              <span className="block border-b border-hairline px-[18px] pb-3 pt-[15px] text-[15px] font-semibold tracking-[-0.025em]">
                What happens to them
              </span>

              <SettingRow title="Who owns them" note="one person, or split evenly across the team">
                <label htmlFor="im-owner" className="sr-only">
                  Owner
                </label>
                <select
                  id="im-owner"
                  value={owner}
                  onChange={(event) => setOwner(event.target.value)}
                  className="min-h-10 flex-[0_1_200px] rounded-control border border-border-control bg-panel pl-3 pr-9 text-[13px]"
                >
                  <option value="split">Split across the team</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name ?? member.email}
                    </option>
                  ))}
                  <option value="nobody">Nobody yet</option>
                </select>
              </SettingRow>

              <SettingRow
                title="Where they land"
                note="every imported lead starts in the same stage"
              >
                <label htmlFor="im-stage" className="sr-only">
                  Stage
                </label>
                <select
                  id="im-stage"
                  value={stage}
                  onChange={(event) => setStage(event.target.value as Stage)}
                  className="min-h-10 flex-[0_1_200px] rounded-control border border-border-control bg-panel pl-3 pr-9 text-[13px]"
                >
                  {PIPELINE_STEPS.slice(0, 2).map((step) => (
                    <option key={step} value={step}>
                      {STAGE_META[step].short}
                    </option>
                  ))}
                </select>
              </SettingRow>

              <SettingRow
                title="Call the list something"
                note="it becomes their campaign, so you can filter on it later"
              >
                <label htmlFor="im-campaign" className="sr-only">
                  Campaign
                </label>
                <input
                  id="im-campaign"
                  value={campaign}
                  onChange={(event) => setCampaign(event.target.value)}
                  placeholder={file?.name.replace(/\.[^.]+$/, "") ?? "Trade show list"}
                  className="min-h-10 flex-[0_1_200px] rounded-control border border-border-control bg-panel px-3 text-[13px]"
                />
              </SettingRow>

              <button
                type="button"
                aria-pressed={dedupe}
                onClick={() => setDedupe(!dedupe)}
                className="flex flex-wrap items-center gap-3.5 px-[18px] py-3 text-left"
              >
                <span
                  aria-hidden="true"
                  className="flex size-[19px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px]"
                  style={{
                    borderColor: dedupe ? "var(--vsp-accent)" : "#c4cbe2",
                    background: dedupe ? "var(--vsp-accent)" : "var(--vsp-panel)",
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ opacity: dedupe ? 1 : 0 }}
                  >
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[13px] font-semibold text-ink">
                    Skip the ones you already have
                  </span>
                  <span className="text-[11px] text-caption">
                    matched on email first, then on LinkedIn, then on company and contact
                  </span>
                </span>
              </button>
            </Panel>

            <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-3.5 rounded-panel bg-dark px-[22px] py-5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-dark-muted">
                Before you press it
              </span>
              <span className="flex items-baseline gap-[9px]">
                <span className="text-[34px] font-bold tracking-[-0.05em] text-white vsp-nums">
                  {willCreate}
                </span>
                <span className="text-[13px] text-dark-text">new leads</span>
              </span>
              <span aria-hidden="true" className="h-px bg-dark-line" />
              <SummaryLine label="Rows in the file" value={String(rows.length)} />
              <SummaryLine
                label="Already in your leads"
                value={
                  dedupe ? `${split.dupes.length} skipped` : `${split.dupes.length} imported again`
                }
                ink={dedupe ? "var(--vsp-good-bright)" : "#f0b67f"}
              />
              <SummaryLine label="Missing a company name" value={String(missingCompany)} />
              <span className="mt-auto flex flex-col gap-2.5">
                <button
                  type="button"
                  disabled={run.isPending || willCreate === 0}
                  onClick={() => run.mutate()}
                  className="min-h-12 rounded-control px-[18px] py-[13px] text-[14px] font-semibold text-white disabled:opacity-50"
                  style={{ background: "var(--vsp-accent)", boxShadow: "0 4px 12px #13182b40" }}
                >
                  {run.isPending ? "Importing…" : `Import ${willCreate} leads`}
                </button>
                <span className="text-[11px] leading-[1.6] text-dark-muted">
                  Nothing is overwritten. An import you regret can be undone from the import history
                  for {UNDO_DAYS} days.
                </span>
              </span>
            </div>
          </div>
        </>
      )}

      {/* Import history, which is what makes the undo line true */}
      {batches.length > 0 && (
        <Panel className="flex flex-col">
          <span className="block border-b border-hairline px-[18px] pb-3 pt-[15px] text-[15px] font-semibold tracking-[-0.025em]">
            What you imported before
          </span>
          {batches.map((batch) => {
            const age = Math.floor((Date.now() - Date.parse(batch.created_at)) / 86_400_000);
            const undoable = age <= UNDO_DAYS;
            return (
              <div
                key={batch.id}
                className="flex flex-wrap items-center gap-3 border-b border-hairline px-[18px] py-3 last:border-b-0"
              >
                <span className="flex min-w-0 flex-[1_1_240px] flex-col">
                  <span translate="no" className="truncate text-[13px] font-semibold text-ink">
                    {batch.file_name}
                  </span>
                  <span className="text-[11px] text-caption vsp-nums">
                    {batch.imported_count} imported
                    {batch.campaign ? ` · ${batch.campaign}` : ""} ·{" "}
                    {age === 0 ? "today" : age === 1 ? "yesterday" : `${age} days ago`}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={!undoable || undo.isPending}
                  onClick={() => undo.mutate(batch.id)}
                  className="min-h-10 rounded-control border border-border-control bg-panel px-3.5 text-[12px] font-semibold text-ink disabled:cursor-not-allowed disabled:text-disabled"
                  title={
                    undoable
                      ? "Move every lead this import created to the bin"
                      : `Older than ${UNDO_DAYS} days, so it can no longer be undone here`
                  }
                >
                  {undo.isPending ? "Undoing…" : "Undo this import"}
                </button>
              </div>
            );
          })}
        </Panel>
      )}
    </div>
  );
}

function SettingRow({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3.5 border-b border-hairline px-[18px] py-3">
      <span className="flex min-w-0 flex-[1_1_180px] flex-col">
        <span className="text-[13px] font-semibold text-ink">{title}</span>
        <span className="text-[11px] text-caption">{note}</span>
      </span>
      {children}
    </div>
  );
}

function SummaryLine({
  label,
  value,
  ink = "#ffffff",
}: {
  label: string;
  value: string;
  ink?: string;
}) {
  return (
    <span className="flex items-baseline gap-2.5 text-[13px]">
      <span className="text-dark-text">{label}</span>
      <span className="ml-auto font-semibold vsp-nums" style={{ color: ink }}>
        {value}
      </span>
    </span>
  );
}
