import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getCompanyId } from "@/lib/company-context";
import { useCompanies } from "@/hooks/use-companies";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePipelineLeads } from "@/hooks/use-pipeline-leads";
import { useLanguage } from "@/hooks/use-language";
import { OwnerAvatar, euro } from "@/components/sales-ui";
import { SIBLING_PRODUCT } from "@/components/brand";
import { CURRENT_EXPORT_PATH } from "@/lib/current-export";
import { getInboundToken, rotateInboundToken } from "@/lib/inbound-token.functions";
import {
  getCurrentExportToken,
  rotateCurrentExportToken,
} from "@/lib/current-export-token.functions";
import {
  approveAccountRequest,
  createTeamInvitation,
  declineAccountRequest,
  removeTeamMember,
} from "@/lib/team.functions";
import { OPEN_STAGES, ROLES, labelFor, type Role, type Stage } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings and team | Sales" },
      {
        name: "description",
        content: "Everything about this company, in one list. Nothing is hidden behind a tab.",
      },
    ],
  }),
  component: SettingsPage,
});

/*
 * Settings is one list again.
 *
 * It used to be three tabs with Team on a page of its own. The canvas put it
 * back into a single scrollable list in three groups — Company, People,
 * Assistants — with the one irreversible thing at the bottom in red. /team
 * still redirects here, as it did before.
 */
function SettingsPage() {
  const { data: me } = useCurrentUser();
  const isAdmin = me?.roles.includes("admin") ?? false;
  const { data: companies = [] } = useCompanies();
  const company = companies.find((item) => item.id === getCompanyId());

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["account-requests", "pending"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_requests")
        .select("id, user_id, full_name, email, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-0.5">
          <h1 className="m-0 text-[20px] font-bold tracking-[-0.045em] text-ink-strong">
            Settings and team
          </h1>
          <span className="text-[12px] text-body-quiet">
            {`Everything about ${
              company?.name ?? "this company"
            }, in one list. Nothing is hidden behind a tab.`}
          </span>
        </div>
        {pendingRequests.length > 0 && (
          <span className="flex items-center gap-[7px] rounded-control border border-warn-line bg-warn-bg px-3 py-[7px] text-[12px] text-warn">
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
              <path d="M12 9v4M12 17h.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            {`${pendingRequests.length} ${
              pendingRequests.length === 1 ? "person is" : "people are"
            } waiting for an account`}
          </span>
        )}
      </div>

      <div className="flex flex-col overflow-hidden rounded-panel border border-border bg-panel">
        <GroupLabel first>Company</GroupLabel>
        <CompanyNameRow name={company?.name ?? ""} isAdmin={isAdmin} />
        <LanguageRow />
        <WebsiteFormRow isAdmin={isAdmin} />
        <PerformanceRow isAdmin={isAdmin} />

        <GroupLabel>People</GroupLabel>
        <RolesRow />
        <PeopleRows isAdmin={isAdmin} meId={me?.id ?? null} />
        {isAdmin && pendingRequests.length > 0 && <PendingRow requests={pendingRequests} />}
        {isAdmin && <InviteRow />}
        {isAdmin && <OpenInvitationsRow />}

        <GroupLabel>Assistants</GroupLabel>
        <AssistantsRow />
        <ScopesRow />

        <RemoveCompanyRow companyName={company?.name ?? "this company"} isAdmin={isAdmin} />
      </div>

      <span className="text-[11px] leading-[1.6] text-caption">
        Team used to be its own page. It is one group in this list now, because a company with three
        people does not need a second screen to manage them, and the app still redirects the old
        link here.
      </span>
    </div>
  );
}

/* ── The list's furniture ─────────────────────────────────────────────────── */

function GroupLabel({ children, first = false }: { children: ReactNode; first?: boolean }) {
  return (
    <span
      className={`px-[18px] pb-[9px] text-[11px] font-semibold uppercase tracking-[0.08em] text-caption ${
        first ? "pt-[13px]" : "border-t border-hairline bg-sunken pt-4"
      }`}
    >
      {children}
    </span>
  );
}

function Row({
  title,
  note,
  children,
  tone,
}: {
  title: ReactNode;
  note: ReactNode;
  children?: ReactNode;
  tone?: "warn";
}) {
  return (
    <div
      className="vsp-set flex flex-wrap items-center gap-3.5 border-t border-hairline px-[18px] py-3"
      style={tone === "warn" ? { background: "var(--vsp-panel-warm)" } : undefined}
    >
      <span className="flex min-w-0 flex-[1_1_220px] flex-col">
        <span className="text-[13px] font-semibold text-ink">{title}</span>
        <span className="text-[11px] text-caption">{note}</span>
      </span>
      {children}
    </div>
  );
}

const control =
  "min-h-10 rounded-control border border-border-control bg-panel px-3 text-[13px] text-ink";
const quietButton =
  "min-h-10 rounded-control border border-border-control bg-panel px-[13px] text-[12px] font-semibold text-ink";

/* ── Company ──────────────────────────────────────────────────────────────── */

function CompanyNameRow({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);

  const rename = useMutation({
    mutationFn: async (next: string) => {
      const { error } = await supabase.rpc("rename_crm_company", { _name: next });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Company name saved");
      queryClient.invalidateQueries({ queryKey: ["my-companies"] });
    },
    onError: (error: Error) => {
      setDraft(name);
      toast.error(error.message);
    },
  });

  return (
    <Row title="Company name" note="shown on quotes, invites and the website form">
      <label htmlFor="st-name" className="sr-only">
        Company name
      </label>
      <input
        id="st-name"
        value={draft}
        disabled={!isAdmin || rename.isPending}
        maxLength={200}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const next = draft.trim();
          if (next && next !== name) rename.mutate(next);
          else setDraft(name);
        }}
        className={`${control} flex-[0_1_260px]`}
      />
    </Row>
  );
}

function LanguageRow() {
  const { language, setLanguage } = useLanguage();
  return (
    <Row title="Language" note="yours only, it does not change what your team sees">
      <label htmlFor="st-lang" className="sr-only">
        Language
      </label>
      <select
        id="st-lang"
        value={language}
        onChange={(event) => setLanguage(event.target.value as "nl" | "en")}
        className={`${control} flex-[0_1_260px]`}
      >
        <option value="nl">Nederlands</option>
        <option value="en">English</option>
      </select>
    </Row>
  );
}

function WebsiteFormRow({ isAdmin }: { isAdmin: boolean }) {
  const [origin, setOrigin] = useState("");
  const [shown, setShown] = useState(false);
  const queryClient = useQueryClient();
  useEffect(() => setOrigin(window.location.origin), []);

  const fetchToken = useServerFn(getInboundToken);
  const rotate = useServerFn(rotateInboundToken);
  const { data: tokenInfo } = useQuery({
    queryKey: ["inbound-token"],
    enabled: isAdmin,
    queryFn: () => fetchToken({ data: undefined }),
  });
  const rotateToken = useMutation({
    mutationFn: () => rotate({ data: undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbound-token"] });
      toast.success("New token created");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const endpoint = origin ? `${origin}/api/public/inbound-lead` : "";
  const token = tokenInfo?.token ?? null;
  const snippet = `<form id="vs-lead">
  <input name="company" placeholder="Company" required>
  <input name="contactName" placeholder="Your name">
  <input name="email" type="email" placeholder="Email" required>
  <textarea name="notes" placeholder="What do you need?"></textarea>
  <button>Send</button>
</form>
<script>
document.getElementById('vs-lead').addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.target));
  await fetch(${JSON.stringify(endpoint)}, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-inbound-token': ${JSON.stringify(token ?? "YOUR_TOKEN")} },
    body: JSON.stringify({ ...body, campaign: location.hostname })
  });
  event.target.reset();
});
</script>`;

  return (
    <>
      <Row title="Website request form" note="a form on your site that drops straight into New">
        <span className="flex flex-wrap items-center gap-2.5">
          <code className="rounded-[7px] bg-wash px-[11px] py-[7px] font-mono text-[12px] text-body">
            {endpoint || "…"}
          </code>
          <button
            type="button"
            disabled={!endpoint}
            onClick={async () => {
              await navigator.clipboard.writeText(snippet);
              toast.success("Snippet copied");
            }}
            className={quietButton}
          >
            Copy the snippet
          </button>
          {isAdmin && (
            <button type="button" onClick={() => setShown(!shown)} className={quietButton}>
              {shown ? "Hide the token" : "Show the token"}
            </button>
          )}
        </span>
      </Row>
      {shown && isAdmin && (
        <div className="flex flex-wrap items-center gap-2.5 border-t border-hairline bg-sunken px-[18px] py-3">
          <code className="min-w-0 flex-1 break-all rounded-[7px] bg-panel px-[11px] py-[7px] font-mono text-[12px] text-body">
            {token ?? "No token yet"}
          </code>
          <button
            type="button"
            disabled={rotateToken.isPending}
            onClick={() => rotateToken.mutate()}
            className={quietButton}
          >
            {rotateToken.isPending ? "Rotating…" : "Rotate it"}
          </button>
          <span className="w-full text-[11px] text-caption">
            The token goes in the snippet&rsquo;s header. Rotating it stops the old one working, so
            replace the snippet on your site at the same time.
          </span>
        </div>
      )}
    </>
  );
}

function PerformanceRow({ isAdmin }: { isAdmin: boolean }) {
  const [origin, setOrigin] = useState("");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  useEffect(() => setOrigin(window.location.origin), []);

  const fetchToken = useServerFn(getCurrentExportToken);
  const rotate = useServerFn(rotateCurrentExportToken);
  const { data: tokenInfo } = useQuery({
    queryKey: ["current-export-token"],
    enabled: isAdmin,
    queryFn: () => fetchToken({ data: undefined }),
  });
  const rotateToken = useMutation({
    mutationFn: () => rotate({ data: undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-export-token"] });
      toast.success("New reporting token created");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const connected = Boolean(tokenInfo?.token);

  return (
    <>
      <Row
        title={SIBLING_PRODUCT}
        note="won deal values go back to the ad reports, so a lead becomes revenue there"
      >
        <span className="flex items-center gap-2.5">
          <span
            className="flex items-center gap-[7px] rounded-pill px-[11px] py-[5px] text-[12px] font-semibold"
            style={{
              background: connected ? "var(--vsp-good-bg)" : "var(--vsp-chip-quiet)",
              color: connected ? "var(--vsp-good)" : "var(--vsp-caption)",
            }}
          >
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full"
              style={{ background: connected ? "var(--vsp-good)" : "var(--vsp-caption)" }}
            />
            {connected ? "Connected" : "Not connected"}
          </span>
          {isAdmin && (
            <button type="button" onClick={() => setOpen(!open)} className={quietButton}>
              {open ? "Close" : "Manage"}
            </button>
          )}
        </span>
      </Row>
      {open && isAdmin && (
        <div className="flex flex-col gap-2.5 border-t border-hairline bg-sunken px-[18px] py-3">
          <span className="text-[11px] text-caption">
            Paste these two into {SIBLING_PRODUCT}. The address is the feed it reads; the token is
            what proves it is yours.
          </span>
          <code className="break-all rounded-[7px] bg-panel px-[11px] py-[7px] font-mono text-[12px] text-body">
            {origin ? `${origin}${CURRENT_EXPORT_PATH}` : "…"}
          </code>
          <span className="flex flex-wrap items-center gap-2.5">
            <code className="min-w-0 flex-1 break-all rounded-[7px] bg-panel px-[11px] py-[7px] font-mono text-[12px] text-body">
              {tokenInfo?.token ?? "No token yet"}
            </code>
            <button
              type="button"
              disabled={rotateToken.isPending}
              onClick={() => rotateToken.mutate()}
              className={quietButton}
            >
              {rotateToken.isPending ? "Rotating…" : "Rotate it"}
            </button>
          </span>
        </div>
      )}
    </>
  );
}

/* ── People ───────────────────────────────────────────────────────────────── */

const ROLE_DUTIES: Record<Role, string> = {
  admin: "Everything, including roles, imports, the website form and removing the company.",
  team_leader: "Sees and edits the whole team's leads, assigns owners, imports lists.",
  rep: "Works their own leads, and can read the rest without changing them.",
};

function RolesRow() {
  return (
    <div className="flex flex-col gap-2 border-t border-hairline px-[18px] py-3">
      {ROLES.map((role) => (
        <span key={role.value} className="flex flex-wrap items-baseline gap-3">
          <span className="w-24 shrink-0 text-[13px] font-semibold text-ink">{role.label}</span>
          <span className="min-w-0 flex-[1_1_300px] text-[12px] leading-[1.55] text-body-quiet">
            {ROLE_DUTIES[role.value]}
          </span>
        </span>
      ))}
      <span className="text-[11px] leading-[1.6] text-caption">
        A role is not a wall between people. Everyone sees the same pipeline; the role decides who
        can change a stage on someone else&rsquo;s lead, invite people, and import a list.
      </span>
    </div>
  );
}

function PeopleRows({ isAdmin, meId }: { isAdmin: boolean; meId: string | null }) {
  const queryClient = useQueryClient();
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email");
      if (error) throw error;
      return data;
    },
  });
  const { data: roleRows = [] } = useQuery({
    queryKey: ["user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role, team");
      if (error) throw error;
      return data;
    },
  });
  const { data: leads = [] } = usePipelineLeads();

  const members = useMemo(
    () =>
      profiles
        .filter((profile) => roleRows.some((row) => row.user_id === profile.id))
        .map((profile) => {
          const owned = leads.filter((lead) => lead.owner_id === profile.id);
          return {
            ...profile,
            role: (roleRows.find((r) => r.user_id === profile.id)?.role as Role) ?? "rep",
            owned: owned.length,
            open: owned.filter((lead) => OPEN_STAGES.includes(lead.stage as Stage)).length,
            value: owned
              .filter((lead) => OPEN_STAGES.includes(lead.stage as Stage))
              .reduce((sum, lead) => sum + (lead.value_estimate ?? 0), 0),
          };
        }),
    [profiles, roleRows, leads],
  );

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { error } = await supabase.rpc("set_company_member_role", {
        _user_id: userId,
        _role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeTeam = useServerFn(removeTeamMember);
  const remove = useMutation({
    mutationFn: (userId: string) => removeTeam({ data: { userId } }),
    onSuccess: () => {
      setRemoving(null);
      toast.success("Member removed from this company");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      {members.map((member) => {
        const you = member.id === meId;
        const name = member.full_name ?? member.email ?? "Team member";
        return (
          <div
            key={member.id}
            className="vsp-set flex flex-wrap items-center gap-3.5 border-t border-hairline px-[18px] py-3"
          >
            <OwnerAvatar id={member.id} name={name} size={32} />
            <span className="flex min-w-0 flex-[1_1_200px] flex-col">
              <span className="text-[13px] font-semibold text-ink">
                <span translate="no">{name}</span>
                {you ? " (you)" : ""}
              </span>
              <span translate="no" className="truncate text-[11px] text-caption">
                {member.email}
              </span>
            </span>
            <span className="text-[12px] text-body-quiet vsp-nums">
              {`${member.owned} ${member.owned === 1 ? "account" : "accounts"}${
                member.open > 0 ? ` · ${euro(member.value)} open` : ""
              }`}
            </span>
            <label htmlFor={`role-${member.id}`} className="sr-only">
              Role for {name}
            </label>
            <select
              id={`role-${member.id}`}
              value={member.role}
              disabled={!isAdmin || you || setRole.isPending}
              onChange={(e) => setRole.mutate({ userId: member.id, role: e.target.value as Role })}
              className={`${control} min-h-[38px] flex-[0_1_170px]`}
            >
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label={you ? "You cannot remove yourself" : `Remove ${name}`}
              title={you ? "You cannot remove yourself" : `Remove ${name}`}
              disabled={!isAdmin || you || remove.isPending}
              onClick={() => setRemoving({ id: member.id, name })}
              className="flex size-[34px] shrink-0 items-center justify-center rounded-control border bg-panel disabled:cursor-not-allowed"
              style={{
                borderColor: you ? "var(--vsp-hairline)" : "var(--vsp-bad-line)",
                color: you ? "#c4c8d6" : "var(--vsp-bad-ink)",
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
              >
                <path d="M4 7h16M10 11v6M14 11v6" />
                <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
                <path d="M9 7V4h6v3" />
              </svg>
            </button>
          </div>
        );
      })}

      {removing && (
        <Confirm
          title="Remove this person?"
          body={`${removing.name} loses access to this company. Their leads and the whole contact history stay; the leads become unassigned so you can give them to someone else.`}
          confirmLabel={remove.isPending ? "Removing…" : "Remove them"}
          onCancel={() => setRemoving(null)}
          onConfirm={() => remove.mutate(removing.id)}
        />
      )}
    </>
  );
}

type PendingRequest = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
};

function PendingRow({ requests }: { requests: PendingRequest[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [declineAll, setDeclineAll] = useState(false);

  const approve = useServerFn(approveAccountRequest);
  const decline = useServerFn(declineAccountRequest);

  const decide = useMutation({
    mutationFn: async ({
      requestId,
      userId,
      yes,
    }: {
      requestId: string;
      userId: string;
      yes: boolean;
    }) =>
      yes ? approve({ data: { requestId, userId } }) : decline({ data: { requestId, userId } }),
    onSuccess: (_result, variables) => {
      toast.success(variables.yes ? "Account approved" : "Account declined");
      queryClient.invalidateQueries({ queryKey: ["account-requests"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const declineEveryone = useMutation({
    mutationFn: async () => {
      for (const request of requests) {
        await decline({ data: { requestId: request.id, userId: request.user_id } });
      }
    },
    onSuccess: () => {
      setDeclineAll(false);
      toast.success("All requests declined");
      queryClient.invalidateQueries({ queryKey: ["account-requests"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const emails = requests.map((request) => request.email);

  return (
    <>
      <div
        className="vsp-set flex flex-wrap items-center gap-3.5 border-t border-hairline px-[18px] py-3"
        style={{ background: "var(--vsp-panel-warm)" }}
      >
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warn-bg text-warn"
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
            <circle cx="12" cy="8" r="3.4" />
            <path d="M5.6 20a6.6 6.6 0 0 1 12.8 0" />
          </svg>
        </span>
        <span className="flex min-w-0 flex-[1_1_220px] flex-col">
          <span className="text-[13px] font-semibold text-ink">
            {`${requests.length} ${
              requests.length === 1 ? "person" : "people"
            } asked for an account`}
          </span>
          <span className="truncate text-[11px] text-caption">
            <span translate="no">{emails.slice(0, 2).join(" and ")}</span>
            {emails.length > 2 ? ` and ${emails.length - 2} more` : ""}
          </span>
        </span>
        <span className="flex gap-2">
          <button
            type="button"
            onClick={() => setDeclineAll(true)}
            className={quietButton}
            style={{ color: "var(--vsp-text)" }}
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="min-h-10 rounded-control px-[13px] text-[12px] font-semibold text-white"
            style={{ background: "var(--vsp-good)" }}
          >
            {open ? "Close" : "Review them"}
          </button>
        </span>
      </div>

      {open &&
        requests.map((request) => (
          <div
            key={request.id}
            className="flex flex-wrap items-center gap-3.5 border-t border-hairline bg-sunken px-[18px] py-3"
          >
            <span className="flex min-w-0 flex-[1_1_220px] flex-col">
              <span className="text-[13px] text-ink">
                {request.full_name ? (
                  <span translate="no">{request.full_name}</span>
                ) : (
                  "Name not given"
                )}
              </span>
              <span translate="no" className="truncate text-[11px] text-caption">
                {request.email}
              </span>
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                disabled={decide.isPending}
                onClick={() =>
                  decide.mutate({ requestId: request.id, userId: request.user_id, yes: false })
                }
                className={quietButton}
              >
                Decline
              </button>
              <button
                type="button"
                disabled={decide.isPending}
                onClick={() =>
                  decide.mutate({ requestId: request.id, userId: request.user_id, yes: true })
                }
                className="min-h-10 rounded-control px-[13px] text-[12px] font-semibold text-white"
                style={{ background: "var(--vsp-good)" }}
              >
                Give them an account
              </button>
            </span>
          </div>
        ))}

      {declineAll && (
        <Confirm
          title={`Decline all ${requests.length}?`}
          body={`${emails.join(", ")} will be told they were not approved. They can ask again later, and nothing else about their account changes.`}
          confirmLabel={declineEveryone.isPending ? "Declining…" : "Decline them all"}
          onCancel={() => setDeclineAll(false)}
          onConfirm={() => declineEveryone.mutate()}
        />
      )}
    </>
  );
}

function InviteRow() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("rep");
  const [invitation, setInvitation] = useState<{
    email: string;
    url: string;
    delivery: { status: "sent" | "unconfirmed" };
  } | null>(null);

  const invite = useServerFn(createTeamInvitation);
  const send = useMutation({
    mutationFn: () =>
      invite({
        data: { fullName: fullName.trim() || email.trim(), email: email.trim(), role },
      }),
    onSuccess: (result) => {
      setInvitation(result);
      setEmail("");
      setFullName("");
      queryClient.invalidateQueries({ queryKey: ["company-invitations"] });
      if (result.delivery.status === "sent") toast.success("Invitation sent by email");
      else toast.error("Email sending could not be confirmed. Copy the link below instead.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <Row
        title="Invite someone"
        note="they get an email, or you copy the link and send it yourself"
      >
        <form
          className="flex flex-wrap items-center gap-[9px]"
          onSubmit={(event) => {
            event.preventDefault();
            if (email.trim() && !send.isPending) send.mutate();
          }}
        >
          <label htmlFor="st-invite-name" className="sr-only">
            Their name
          </label>
          <input
            id="st-invite-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Their name"
            className={`${control} flex-[0_1_160px]`}
          />
          <label htmlFor="st-invite" className="sr-only">
            Email address
          </label>
          <input
            id="st-invite"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@yourcompany.be"
            className={`${control} flex-[0_1_200px]`}
          />
          <label htmlFor="st-invite-role" className="sr-only">
            Their role
          </label>
          <select
            id="st-invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className={`${control} flex-[0_1_140px]`}
          >
            {ROLES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!email.trim() || send.isPending}
            className="min-h-10 rounded-control px-[15px] text-[13px] font-semibold text-white shadow-raised disabled:opacity-50"
            style={{ background: "var(--vsp-accent)" }}
          >
            {send.isPending ? "Sending…" : "Send the invite"}
          </button>
        </form>
      </Row>

      {invitation && (
        <div className="flex flex-wrap items-center gap-2.5 border-t border-hairline bg-sunken px-[18px] py-3">
          <span className="w-full text-[12px] text-body">
            {invitation.delivery.status === "sent"
              ? `Invitation emailed to ${invitation.email}.`
              : `Invitation created for ${invitation.email}, but the email could not be confirmed.`}{" "}
            You can also copy the link and send it yourself — only to them.
          </span>
          <label htmlFor="invite-url" className="sr-only">
            Invitation link
          </label>
          <input
            id="invite-url"
            readOnly
            value={invitation.url}
            onFocus={(event) => event.target.select()}
            className={`${control} min-w-0 flex-1 font-mono text-[12px]`}
          />
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(invitation.url);
                toast.success("Link copied");
              } catch {
                toast.error("Select and copy the link above.");
              }
            }}
            className={quietButton}
          >
            Copy the link
          </button>
        </div>
      )}
    </>
  );
}

/**
 * Invitations that were sent and not yet opened. Without this row there is no
 * way to take one back, which is the only reason it is here and not folded
 * into the invite row above.
 */
function OpenInvitationsRow() {
  const queryClient = useQueryClient();
  const { data: invitations = [] } = useQuery({
    queryKey: ["company-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_invitations")
        .select("id,email,role,expires_at")
        .is("accepted_at", null)
        .is("revoked_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("revoke_company_invitation", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invitation taken back");
      queryClient.invalidateQueries({ queryKey: ["company-invitations"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (invitations.length === 0) return null;

  return (
    <Row
      title={`${invitations.length} ${invitations.length === 1 ? "invitation" : "invitations"} still open`}
      note="nothing happens to them until they open the link"
    >
      <span className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
        {invitations.map((invitation) => {
          const expired = Date.parse(invitation.expires_at) <= Date.now();
          return (
            <span key={invitation.id} className="flex flex-wrap items-center gap-2.5">
              <span translate="no" className="min-w-0 flex-1 truncate text-[13px] text-ink">
                {invitation.email}
              </span>
              <span
                className="text-[11px]"
                style={{ color: expired ? "var(--vsp-bad-ink)" : "var(--vsp-caption)" }}
              >
                {labelFor(ROLES, invitation.role)} ·{" "}
                {expired
                  ? "expired, invite them again"
                  : `good until ${new Date(invitation.expires_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                    })}`}
              </span>
              <button
                type="button"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(invitation.id)}
                className={quietButton}
              >
                Take it back
              </button>
            </span>
          );
        })}
      </span>
    </Row>
  );
}

/* ── Assistants ───────────────────────────────────────────────────────────── */

function AssistantsRow() {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const companyId = getCompanyId();
  const address =
    origin && companyId ? `${origin}/mcp?company=${encodeURIComponent(companyId)}` : "";

  return (
    <Row
      title="ChatGPT, Claude and other clients"
      note="they can read and update leads for you, under your own permissions"
    >
      <span className="flex flex-wrap items-center gap-2.5">
        <code className="max-w-[320px] truncate rounded-[7px] bg-wash px-[11px] py-[7px] font-mono text-[12px] text-body">
          {address || "…"}
        </code>
        <button
          type="button"
          disabled={!address}
          onClick={async () => {
            await navigator.clipboard.writeText(address);
            toast.success("Address copied");
          }}
          className={quietButton}
        >
          Connect another
        </button>
      </span>
    </Row>
  );
}

function ScopesRow() {
  /*
   * The canvas drew these as switches. They are statements here, because the
   * authorization server grants one fixed scope per connection and nothing
   * stores a per-assistant choice — a switch would promise a choice the grant
   * cannot honour. Making them real needs a grant-scope table the MCP tools
   * read; see the pull request.
   */
  const allowed = ["Read leads", "Add and update leads", "Log what happened", "Open documents"];
  return (
    <Row
      title="What they are allowed to do"
      note="an assistant never gets more than the person who connected it"
    >
      <span className="flex flex-wrap gap-[7px]">
        {allowed.map((label) => (
          <span
            key={label}
            className="flex min-h-9 items-center gap-[7px] rounded-pill border border-accent px-3 py-[7px] text-[12px] font-semibold text-accent-ink"
            style={{ background: "var(--vsp-accent-tint)" }}
          >
            <span
              aria-hidden="true"
              className="flex size-3.5 shrink-0 items-center justify-center rounded-[4px]"
              style={{ background: "var(--vsp-accent)" }}
            >
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="3.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m5 13 4 4L19 7" />
              </svg>
            </span>
            {label}
          </span>
        ))}
      </span>
    </Row>
  );
}

/* ── The end of the list ──────────────────────────────────────────────────── */

function RemoveCompanyRow({ companyName, isAdmin }: { companyName: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const { data: leads = [] } = usePipelineLeads();

  return (
    <>
      <div
        className="flex flex-wrap items-center gap-3.5 border-t border-hairline px-[18px] py-3.5"
        style={{ background: "var(--vsp-bad-bg)" }}
      >
        <span className="flex min-w-0 flex-[1_1_260px] flex-col">
          <span className="text-[13px] font-semibold text-bad-ink">Remove this company</span>
          <span className="text-[11px] text-body">
            {`${leads.length} ${
              leads.length === 1 ? "lead" : "leads"
            }, every document and the whole outreach history go with it. This one cannot be undone.`}
          </span>
        </span>
        <button
          type="button"
          disabled={!isAdmin}
          onClick={() => setOpen(true)}
          className="min-h-10 rounded-control border bg-panel px-3.5 text-[13px] font-semibold text-bad-ink disabled:opacity-50"
          style={{ borderColor: "#e4b9b4" }}
        >
          Remove {companyName}
        </button>
      </div>

      {open && (
        <Confirm
          title={`Remove ${companyName}?`}
          body={`Everything in this workspace would go: ${leads.length} ${
            leads.length === 1 ? "lead" : "leads"
          }, every quote and contract, every logged call and every person's access. Nothing could bring it back.`}
          footer="Which is why no button in here does it. Removing a workspace is handled by Verkoop Studio, so a mistaken click cannot be the last step. Ask them and it is done the same day. Nothing has been deleted by opening this."
          explainOnly
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}

function Confirm({
  title,
  body,
  confirmLabel,
  footer,
  tone = "bad",
  explainOnly = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel?: string;
  footer?: string;
  tone?: "bad" | "good";
  explainOnly?: boolean;
  onCancel: () => void;
  onConfirm?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 cursor-default"
        style={{ background: "#0b0f1c4d" }}
      />
      <div
        role="alertdialog"
        aria-label={title}
        className="relative w-full max-w-[460px] rounded-panel border border-border bg-panel p-[22px] shadow-dialog"
      >
        <h2 className="m-0 text-[18px] font-bold tracking-[-0.04em] text-ink-strong">{title}</h2>
        <p className="mb-4 mt-2 text-[13px] leading-[1.6] text-body">{body}</p>
        {footer && <p className="mb-4 text-[12px] leading-[1.6] text-caption">{footer}</p>}
        <div className="flex flex-wrap gap-2.5">
          {!explainOnly && (
            <button
              type="button"
              onClick={onConfirm}
              className="min-h-11 rounded-control px-4 text-[13px] font-semibold text-white"
              style={{
                background: tone === "bad" ? "var(--vsp-bad)" : "var(--vsp-good)",
              }}
            >
              {confirmLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-control border border-border-control bg-panel px-4 text-[13px] font-semibold text-ink"
          >
            {explainOnly ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
