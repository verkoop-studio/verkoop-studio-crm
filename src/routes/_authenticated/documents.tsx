import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePipelineLeads } from "@/hooks/use-pipeline-leads";
import {
  documentSize,
  documentTitle,
  listLeadDocuments,
  listLeadsWithDocuments,
  openLeadDocument,
} from "@/lib/lead-documents";
import { STAGE_META, type Stage } from "@/lib/sales";
import { CompanyTile, Panel, Segmented, euro, lastTouch } from "@/components/sales-ui";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Quotes and contracts | Sales" }] }),
  component: DocumentsPage,
});

type Kind = "all" | "quotes" | "contracts";

const GROUPS_SHOWN = 8;

/*
 * Quotes and contracts, grouped by company rather than listed flat.
 *
 * A document belongs to a lead, not to this page: it is uploaded on the lead
 * and appears here, so there is no second filing system to keep in step. Each
 * group therefore names its lead, its stage and its value, and links back.
 */
function DocumentsPage() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [ascending, setAscending] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const { data: leads = [] } = usePipelineLeads();
  const ids = leads.map((lead) => lead.id).sort();

  const { data: me } = useQuery({
    queryKey: ["profiles", "me"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const {
    data = [],
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["document-library", ids],
    queryFn: async () => {
      // Keep a few storage requests in flight at once, but still cover every lead.
      // Ask once which leads have a folder at all, then only read those.
      const withFiles = new Set(await listLeadsWithDocuments());
      const wanted = ids.filter((id) => withFiles.has(id));
      const results: { id: string; documents: Awaited<ReturnType<typeof listLeadDocuments>> }[] =
        [];
      let next = 0;
      await Promise.all(
        Array.from({ length: Math.min(4, wanted.length) }, async () => {
          while (next < wanted.length) {
            const id = wanted[next++];
            if (id) results.push({ id, documents: await listLeadDocuments(id) });
          }
        }),
      );
      return results;
    },
    /*
     * No polling here, deliberately.
     *
     * There is no single "list the documents" call: the bucket is read one
     * folder at a time, and listLeadDocuments asks for two per lead (quotes
     * and contracts). At 184 leads that is 368 storage requests, and on a
     * thirty-second timer it was 368 requests every thirty seconds for as
     * long as the tab stayed open — enough to keep the browser busy and make
     * everything else on the page feel sticky.
     *
     * Nothing here changes on its own. Uploading a file invalidates this key
     * from the lead sheet, which is the only way a document appears, so the
     * page is still correct the moment it matters.
     */
    staleTime: 5 * 60_000,
  });

  /*
   * Who filed it.
   *
   * The canvas writes each row as "Tanguy, 3 days ago, 412 kB", and the name
   * was coming out blank: storage's list() carries no `owner` on this version,
   * so there was nothing to look up and the row silently lost its first field.
   *
   * It is the signed-in user, always. `lead-documents` is readable only where
   * `owner_id = auth.uid()` (supabase/migrations/20260930160000_lead_documents
   * .sql), so every document this page can see is one you uploaded yourself.
   * That also means this page cannot show a colleague's paperwork the way the
   * canvas draws it; widening the policy is a decision about who may read whose
   * documents, and it belongs to whoever owns that call, not to this screen.
   */
  const uploader = () => me?.full_name?.split(" ")[0] ?? me?.email?.split("@")[0] ?? null;

  const term = query.trim().toLowerCase();
  const wanted = kind === "all" ? null : kind === "quotes" ? "quote" : "contract";

  const groups = data
    .map((group) => {
      const lead = leads.find((item) => item.id === group.id);
      return {
        id: group.id,
        company: lead?.company ?? "—",
        stage: lead?.stage ?? "new",
        value: lead?.value_estimate ?? null,
        documents: group.documents.filter(
          (document) =>
            (!wanted || document.category === wanted) &&
            (!term ||
              (lead?.company ?? "").toLowerCase().includes(term) ||
              documentTitle(document.name).toLowerCase().includes(term)),
        ),
      };
    })
    .filter((group) => group.documents.length > 0)
    .sort(
      (a, b) =>
        (ascending ? 1 : -1) *
          a.company.localeCompare(b.company, "en", { sensitivity: "base", numeric: true }) ||
        a.id.localeCompare(b.id),
    );

  const everything = data.flatMap((group) => group.documents);
  const quotes = everything.filter((document) => document.category === "quote").length;
  const contracts = everything.filter((document) => document.category === "contract").length;
  const withPaperwork = data.filter((group) => group.documents.length > 0).length;
  const shownGroups = showAll ? groups : groups.slice(0, GROUPS_SHOWN);
  const restGroups = groups.length - shownGroups.length;
  const shownFiles = groups.reduce((sum, group) => sum + group.documents.length, 0);

  const open = async (path: string) => {
    const result = await openLeadDocument(path);
    if (!result.ok)
      toast.error(
        result.reason === "popup_blocked"
          ? "Allow pop-ups to open the document."
          : "Could not open document.",
      );
  };

  return (
    <div className="flex flex-col gap-3.5">
      {/*
       * The canvas gives this screen no visible title — it opens straight on
       * its controls — but a page still needs a heading to be navigable by
       * anything other than sight. Hidden, so the drawing is unchanged and
       * the document still has a top to it.
       */}
      <h1 className="sr-only">Quotes and contracts</h1>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="relative flex min-w-[190px] flex-[0_1_300px]">
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
          <label htmlFor="doc-search" className="sr-only">
            Search company or document
          </label>
          <input
            id="doc-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company or document"
            className="min-h-10 w-full rounded-control border border-border bg-panel py-2.5 pl-[34px] pr-[13px] text-[13px] text-ink"
          />
        </span>

        <Segmented<Kind>
          label="Document type"
          value={kind}
          onChange={setKind}
          options={[
            { value: "all", label: "Everything" },
            { value: "quotes", label: "Quotes" },
            { value: "contracts", label: "Contracts" },
          ]}
        />

        <button
          type="button"
          onClick={() => setAscending(!ascending)}
          aria-pressed={!ascending}
          className="flex min-h-10 items-center gap-2 rounded-control border border-border bg-panel px-[13px] py-2.5 text-[13px] font-medium text-body"
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
            style={{ transform: ascending ? "none" : "scaleY(-1)" }}
          >
            <path d="M4 7h10M4 12h7M4 17h4" />
            <path d="M17 5v14M14 16l3 3 3-3" />
          </svg>
          {ascending ? "Company A to Z" : "Company Z to A"}
        </button>

        <Link
          to="/leads"
          className="ml-auto flex min-h-10 items-center gap-2 rounded-control px-[15px] py-2.5 text-[13px] font-semibold text-white no-underline shadow-raised"
          style={{ background: "var(--vsp-accent)" }}
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
          Upload to a lead
        </Link>
      </div>

      {/* Counts */}
      <Panel className="flex flex-wrap">
        <Count
          label="Companies with paperwork"
          value={isPending || isError ? "—" : String(withPaperwork)}
          note={`of ${leads.length} leads`}
        />
        <Count
          label="Quotes"
          value={isPending || isError ? "—" : String(quotes)}
          note="sent, across every stage"
          ink="var(--vsp-accent-ink)"
        />
        <Count
          label="Contracts"
          value={isPending || isError ? "—" : String(contracts)}
          note={
            isPending || isError
              ? "signed and unsigned"
              : `on ${data.filter((g) => g.documents.some((d) => d.category === "contract")).length} companies`
          }
          ink="var(--vsp-good)"
        />
      </Panel>

      {/* The library */}
      <Panel className="flex flex-col">
        <span className="flex flex-wrap items-baseline gap-2.5 border-b border-hairline px-[18px] pb-3 pt-[15px]">
          <span className="text-[15px] font-semibold tracking-[-0.025em]">
            Everything, by company
          </span>
          {/*
           * While the library is still being read this said "0 files across 0
           * companies", which is a statement, not a placeholder — and on a
           * slow connection it is a wrong one sitting next to a spinner.
           */}
          <span className="ml-auto text-[12px] text-caption vsp-nums">
            {isPending || isError
              ? "\u00a0"
              : kind === "all"
                ? `${everything.length} files across ${withPaperwork} companies`
                : `${shownFiles} shown, filtered to ${kind}`}
          </span>
        </span>

        {isPending && (
          <span role="status" className="px-[18px] py-8 text-[13px] text-body-quiet">
            Loading documents…
          </span>
        )}
        {isError && (
          <span role="alert" className="px-[18px] py-8 text-[13px]">
            The document library could not be loaded in full.{" "}
            <button type="button" className="font-semibold text-link" onClick={() => refetch()}>
              Retry
            </button>
          </span>
        )}
        {/*
         * Three different empty libraries, and the way out of each. A
         * workspace with no leads cannot have paperwork at all, so sending
         * someone to "open a lead and upload its quote" would be a dead end.
         */}
        {!isPending && !isError && groups.length === 0 && (
          <span className="flex flex-wrap items-center gap-2 px-[18px] py-10 text-[13px] leading-[1.6] text-body-quiet">
            {leads.length === 0 ? (
              <>
                No leads in this workspace yet, so there is nothing to file against.{" "}
                <Link to="/import" className="font-semibold text-accent-ink underline">
                  Import a list
                </Link>
              </>
            ) : everything.length === 0 ? (
              "Your move: nothing is filed yet. Open a lead and upload its quote, and it appears here."
            ) : query.trim() ? (
              <>
                <span>
                  Nothing matches <span className="font-semibold text-ink">{query.trim()}</span>.
                </span>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="font-semibold text-accent-ink underline"
                >
                  Clear the search
                </button>
              </>
            ) : (
              <>
                <span>No {kind === "quotes" ? "quotes" : "contracts"} filed yet.</span>
                <button
                  type="button"
                  onClick={() => setKind("all")}
                  className="font-semibold text-accent-ink underline"
                >
                  Show everything
                </button>
              </>
            )}
          </span>
        )}

        {shownGroups.map((group) => {
          const quoteCount = group.documents.filter((d) => d.category === "quote").length;
          const contractCount = group.documents.length - quoteCount;
          const summary = [
            quoteCount ? `${quoteCount} ${quoteCount === 1 ? "quote" : "quotes"}` : null,
            contractCount
              ? `${contractCount} ${contractCount === 1 ? "contract" : "contracts"}`
              : null,
          ]
            .filter(Boolean)
            .join(" and ");
          const won = group.stage === "won";

          return (
            <div key={group.id} className="border-b border-hairline">
              <div className="flex items-center gap-[11px] px-[18px] pb-2.5 pt-3">
                <CompanyTile company={group.company} />
                <Link
                  to="/leads"
                  search={{ lead: group.id }}
                  translate="no"
                  className="text-[13px] font-semibold text-ink no-underline hover:underline"
                >
                  {group.company}
                </Link>
                <span
                  className="text-[11px]"
                  style={{ color: won ? "var(--vsp-good)" : "var(--vsp-caption)" }}
                >
                  {STAGE_META[group.stage as Stage]?.short ?? group.stage}
                  {group.value != null ? ` · ${euro(group.value)}` : ""}
                </span>
                <span className="ml-auto text-[11px] text-caption">{summary}</span>
              </div>

              {group.documents.map((document) => {
                const skin =
                  document.category === "contract"
                    ? { bg: "var(--vsp-good-bg)", ink: "var(--vsp-good)" }
                    : { bg: "var(--vsp-accent-tint)", ink: "var(--vsp-accent-ink)" };
                const by = uploader();
                return (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => void open(document.path)}
                    className="vsp-doc flex w-full items-center gap-3 py-2.5 pl-[18px] pr-[18px] text-left sm:pl-[57px]"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-7 shrink-0 items-center justify-center rounded-control"
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
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                      </svg>
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span translate="no" className="truncate text-[13px] text-ink">
                        {documentTitle(document.name)}
                      </span>
                      <span className="text-[11px] text-caption">
                        {[
                          by,
                          document.created_at
                            ? lastTouch(document.created_at).text.toLowerCase()
                            : null,
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
                    <span
                      aria-hidden="true"
                      className="vsp-open flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-accent-ink"
                    >
                      Open
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 4h6v6" />
                        <path d="M20 4 10 14" />
                        <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
                      </svg>
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}

        <div className="flex flex-wrap items-center gap-3 bg-sunken px-[18px] py-3">
          {restGroups > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="rounded-[7px] border border-border bg-panel px-[13px] py-2 text-[12px] font-semibold text-ink"
            >
              Show the other {restGroups} companies
            </button>
          )}
          <span className="min-w-0 flex-[1_1_280px] text-[11px] leading-[1.6] text-caption">
            A document belongs to a lead, not to this page. Upload it on the lead and it appears
            here; there is no second filing system to keep in step.
          </span>
        </div>
      </Panel>
    </div>
  );
}

function Count({
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
    <div className="flex min-h-[90px] min-w-0 flex-[1_1_200px] flex-col gap-1 border-b border-hairline px-[18px] py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <span className="text-[12px] text-body-quiet">{label}</span>
      <span className="text-[24px] font-bold tracking-[-0.045em] vsp-nums" style={{ color: ink }}>
        {value}
      </span>
      <span className="text-[11px] text-caption">{note}</span>
    </div>
  );
}
