import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Mark } from "@/components/brand";
import { OwnerAvatar } from "@/components/sales-ui";

type OAuthNamespace = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{
    data: { redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
  denyAuthorization: (id: string) => Promise<{
    data: { redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
};

type AuthorizationDetails = {
  client?: { name?: string } | null;
  redirect_url?: string;
  redirect_to?: string;
};

function oauth(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export const Route = createFileRoute("/oauth/consent")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    authorization_id:
      typeof search["authorization_id"] === "string" ? search["authorization_id"] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="flex min-h-screen items-center justify-center bg-page p-8">
      <div className="panel max-w-md p-8 text-[13px] leading-[1.6] text-body">
        Could not load this authorization request: {String((error as Error)?.message ?? error)}
      </div>
    </main>
  ),
});

/*
 * Letting an assistant in.
 *
 * Two deliberate differences from the canvas, both because the drawing
 * promises something the authorization server cannot do yet:
 *
 *  · what it may do is a list, not a row of switches. The grant has one fixed
 *    scope; switches would offer a choice nothing could honour.
 *  · which company is a statement, not a picker. The company is decided by
 *    the connection address the assistant was given, in Settings — the grant
 *    itself carries no company.
 *
 * What it can never do, Allow and Not now are the canvas's.
 */
function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = details?.client?.name ?? "This assistant";

  const { data: me } = useQuery({
    queryKey: ["consent", "me"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });
  const { data: companies = [] } = useQuery({
    queryKey: ["my-companies"],
    queryFn: async () => {
      const { data, error: companyError } = await supabase.rpc("list_my_companies");
      if (companyError) throw companyError;
      return data;
    },
  });

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error: decisionError } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (decisionError) {
      setBusy(false);
      setError(decisionError.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const may = [
    {
      label: "Read your leads",
      tag: "always on",
      note: "Company, contact, stage, value and the outreach history, for one company only.",
    },
    {
      label: "Add leads and move them along",
      tag: "included",
      note: "Create a lead, change a stage, log a call. Everything it writes lands in the lead's history.",
    },
    {
      label: "Open quotes and contracts",
      tag: "included",
      note: "Read the files attached to a lead, because it signs in with your own access to them.",
    },
    {
      label: "See who is on your team",
      tag: "included",
      note: "Names and roles, so it can tell you who owns a lead.",
    },
  ];

  const never = [
    companies.length > 1
      ? `Reach your other companies — it only sees the one whose address you gave it`
      : "Reach a company you were not given access to",
    "Delete a lead, a document or a company",
    "Invite anyone, change a role, or sign in as you anywhere else",
  ];

  return (
    <div className="flex min-h-screen flex-col bg-page text-ink">
      <div className="flex flex-wrap items-center gap-4 border-b border-border bg-panel px-7 py-[18px]">
        <span className="flex items-center gap-2.5">
          <Mark size={27} />
          <span className="text-[16px] font-semibold tracking-[-0.04em] text-ink">Sales</span>
        </span>
        <span className="ml-auto flex items-center gap-[9px] text-[12px] text-body-quiet">
          {/*
           * The tile wants the person's initials, so give it their name. Fed
           * the email address it produced a single letter, where the canvas
           * draws two — every account that reaches this screen was created
           * with a full name in its metadata.
           */}
          <OwnerAvatar
            id={me?.id ?? null}
            name={
              (typeof me?.user_metadata?.["full_name"] === "string"
                ? me.user_metadata["full_name"]
                : null) ??
              me?.email ??
              null
            }
            size={22}
          />
          {`Signed in as ${me?.email ?? "…"}`}
        </span>
      </div>

      <div className="flex flex-1 justify-center px-7 pb-11 pt-10">
        <div className="flex w-full max-w-[560px] flex-col gap-4">
          <div className="flex items-center justify-center gap-4">
            <span
              aria-hidden="true"
              className="flex size-[54px] shrink-0 items-center justify-center rounded-panel text-white"
              style={{ background: "var(--vsp-ink)" }}
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="4" y="7" width="16" height="12" rx="3" />
                <path d="M12 7V4" />
                <circle cx="9" cy="13" r="1.3" fill="currentColor" />
                <circle cx="15" cy="13" r="1.3" fill="currentColor" />
              </svg>
            </span>
            <span
              aria-hidden="true"
              className="flex items-center gap-1"
              style={{ color: "#c4cbe2" }}
            >
              <span className="size-[5px] rounded-full bg-current" />
              <span className="size-[5px] rounded-full bg-current" />
              <span className="size-[5px] rounded-full bg-current" />
            </span>
            <Mark size={54} />
          </div>

          <div className="flex flex-col gap-[7px] text-center">
            <h1 className="m-0 text-balance text-[25px] font-bold tracking-[-0.05em] text-ink-strong">
              {`${client} wants to work with your leads`}
            </h1>
            <p className="m-0 text-[14px] text-body-quiet">
              It will act as you, inside one company, and only within what this page lists.
            </p>
          </div>

          <div className="flex flex-col overflow-hidden rounded-panel border border-border bg-panel">
            <div className="flex flex-wrap items-center gap-3.5 border-b border-hairline px-[18px] py-[15px]">
              <span className="flex min-w-0 flex-[1_1_200px] flex-col">
                <span className="text-[13px] font-semibold text-ink">Which company</span>
                <span className="text-[11px] text-caption">
                  {companies.length > 2
                    ? `the one whose connection address you gave it — never the other ${companies.length - 1}`
                    : companies.length === 2
                      ? "the one whose connection address you gave it — never the other one"
                      : "the one whose connection address you gave it"}
                </span>
              </span>
              <span className="flex flex-wrap gap-1.5">
                {companies.map((company) => (
                  <span
                    key={company.id}
                    translate="no"
                    className="rounded-pill bg-chip-quiet px-2.5 py-1 text-[12px] text-body"
                  >
                    {company.name}
                  </span>
                ))}
              </span>
            </div>

            <span className="px-[18px] pb-2 pt-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-caption">
              What it may do
            </span>

            {may.map((item) => (
              <div
                key={item.label}
                className="flex w-full items-start gap-3 border-t border-hairline px-[18px] py-[11px]"
              >
                <span
                  aria-hidden="true"
                  className="mt-px flex size-5 shrink-0 items-center justify-center rounded-chip"
                  style={{ background: "var(--vsp-accent)" }}
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
                  >
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold text-ink">{item.label}</span>
                    <span
                      className="rounded-chip px-[7px] py-0.5 text-[10px] font-semibold"
                      style={{
                        background:
                          item.tag === "always on"
                            ? "var(--vsp-chip-quiet)"
                            : "var(--vsp-accent-tint)",
                        color:
                          item.tag === "always on" ? "var(--vsp-text)" : "var(--vsp-accent-ink)",
                      }}
                    >
                      {item.tag}
                    </span>
                  </span>
                  <span className="text-[12px] leading-[1.55] text-body-quiet">{item.note}</span>
                </span>
              </div>
            ))}

            <span className="border-t border-hairline bg-panel-quiet px-[18px] pb-2 pt-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-caption">
              What it can never do
            </span>
            <div className="flex flex-col gap-[7px] bg-panel-quiet px-[18px] pb-3.5">
              {never.map((line) => (
                <span key={line} className="flex items-center gap-2.5 text-[12px] text-body">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--vsp-bad)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    aria-hidden="true"
                    className="shrink-0"
                  >
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                  {line}
                </span>
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" className="m-0 text-[13px] text-bad-ink">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => decide(false)}
              className="min-h-[50px] flex-[1_1_160px] rounded-control border border-border-control bg-panel px-[18px] text-[14px] font-semibold text-ink disabled:opacity-60"
            >
              Not now
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => decide(true)}
              className="min-h-[50px] flex-[2_1_220px] rounded-control px-[18px] text-[14px] font-semibold text-white shadow-raised disabled:opacity-60"
              style={{ background: "var(--vsp-accent)" }}
            >
              {busy ? "One moment…" : `Allow ${client} in`}
            </button>
          </div>

          <span className="text-center text-[11px] leading-[1.6] text-caption">
            An assistant signs in as you, so everything it does is saved under your name and stays
            in the lead&rsquo;s history where you can see it and undo it. Signing out of {client},
            or changing your password, ends its access.
          </span>
        </div>
      </div>
    </div>
  );
}
