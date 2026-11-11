import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCompanyId, switchCompany } from "@/lib/company-context";
import { resetCompanyContext } from "@/lib/company-context";
import { useCompanies } from "@/hooks/use-companies";
import { useCurrentUser } from "@/hooks/use-current-user";
import { labelFor, ROLES } from "@/lib/sales";
import { Mark } from "@/components/brand";
import { DashboardIcon, LeadsIcon, FlowIcon, DocumentsIcon } from "@/components/nav-icons";
import { initialsOf } from "@/components/sales-ui";

/*
 * The left column of every screen on the canvas.
 *
 * Four sections, not five: Settings left the navigation and lives in the
 * profile menu at the bottom, together with the company list, signing out and
 * the badge for people waiting for an account. There is no language picker in
 * the chrome any more — language is a field in Settings, and it is yours only.
 */
const NAV = [
  { to: "/dashboard", label: "Dashboard", Icon: DashboardIcon, counted: false },
  { to: "/leads", label: "Leads", Icon: LeadsIcon, counted: true },
  { to: "/prospectflow", label: "Prospectflow", Icon: FlowIcon, counted: false },
  { to: "/documents", label: "Quotes and contracts", Icon: DocumentsIcon, counted: false },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const leadCount = useLeadCount();

  return (
    <div className="flex min-h-screen flex-wrap bg-page text-ink">
      {/*
       * The rail is the height of the window, and stays there.
       *
       * As a plain flex child it stretched to the height of whatever was in
       * <main>, because that is what align-items: stretch does. On a short
       * page nobody noticed. On a long one — Leads, with a full table — the
       * rail grew to the height of the document and `mt-auto` dutifully parked
       * the company menu at the bottom of *that*: a thousand pixels below the
       * fold, under a column of empty white. h-screen and sticky give mt-auto
       * the window to measure against instead, and overflow-y-auto lets the
       * rail scroll inside itself on a very short window rather than pushing
       * the menu out again.
       */}
      <aside
        aria-label="Sidebar"
        className="hidden w-[var(--vsp-sidebar-w)] shrink-0 flex-col gap-[26px] overflow-y-auto border-r border-border bg-panel px-4 pb-6 pt-7 md:sticky md:top-0 md:flex md:h-screen"
      >
        <Link
          to="/dashboard"
          aria-label="Verkoop Studio Sales"
          className="flex items-center gap-[11px] px-2"
        >
          <Mark size={32} />
          <span className="text-[19px] font-semibold tracking-[-0.045em] text-ink">Sales</span>
        </Link>

        <nav className="vsp-nav flex flex-col gap-0.5" aria-label="Sections">
          {NAV.map(({ to, label, Icon, counted }) => (
            <Link
              key={to}
              to={to}
              className="flex min-h-[var(--vsp-nav-h)] items-center gap-2.5 rounded-control px-[11px] py-2.5 font-medium text-body no-underline [&.active]:bg-accent-tint [&.active]:font-semibold [&.active]:text-accent-ink"
            >
              <Icon />
              <span className="min-w-0 flex-1">{label}</span>
              {counted && leadCount != null && (
                <span className="rounded-full bg-chip px-[7px] py-px text-[11px] font-semibold text-body vsp-nums">
                  {leadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="mt-auto">
          <ProfileMenu />
        </div>
      </aside>

      <MobileChrome leadCount={leadCount} />

      <main className="min-w-0 flex-[999_1_560px] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 md:px-6 md:pb-9">
        {children}
      </main>
    </div>
  );
}

/** The badge beside Leads. A count, not a page of rows. */
function useLeadCount() {
  const { data } = useQuery({
    queryKey: ["leads", "count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });
  return data ?? null;
}

function usePendingRequests() {
  const { data: user } = useCurrentUser();
  const isAdmin = user?.roles.includes("admin") ?? false;
  const { data = 0 } = useQuery({
    queryKey: ["account-requests", "count"],
    enabled: isAdmin,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("account_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  });
  return data;
}

/**
 * The widget at the foot of the sidebar is a menu now, not a label: the
 * company list, Settings and Sign out all open from it.
 */
function ProfileMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const { data: companies = [] } = useCompanies();
  const pending = usePendingRequests();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const currentId = getCompanyId();
  const current = companies.find((company) => company.id === currentId);
  const firstName = (user?.fullName ?? user?.email ?? "").split(/[\s@]/)[0] || "You";
  const role = user?.roles[0] ? labelFor(ROLES, user.roles[0]).toLowerCase() : "sales rep";

  const signOut = async () => {
    await supabase.auth.signOut();
    resetCompanyContext();
    queryClient.clear();
    navigate({ to: "/auth" });
  };

  return (
    <div className="relative" ref={wrap}>
      {open && (
        <div
          className="absolute bottom-full left-0 right-0 z-20 mb-[7px] rounded-card border border-border bg-panel p-1.5 shadow-menu"
          style={{ minWidth: compact ? 232 : undefined }}
        >
          <span className="block px-[9px] pb-[5px] pt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-caption">
            Switch company
          </span>
          {companies.map((company) => {
            const on = company.id === currentId;
            return (
              <button
                key={company.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (user && !on) switchCompany(user.id, company.id);
                }}
                className="flex w-full items-center gap-2 rounded-control py-[7px] text-left text-[13px] hover:bg-wash"
                style={{
                  paddingLeft: on ? 9 : 30,
                  paddingRight: 9,
                  background: on ? "var(--vsp-accent-tint)" : "none",
                  color: on ? "var(--vsp-accent-ink)" : "var(--vsp-text)",
                  fontWeight: on ? 600 : 400,
                }}
              >
                {on && (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="shrink-0"
                  >
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                )}
                <span translate="no" className="truncate">
                  {company.name}
                </span>
              </button>
            );
          })}
          <span aria-hidden="true" className="mx-[3px] my-[5px] block h-px bg-hairline" />
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-[9px] rounded-control px-[9px] py-[7px] text-left text-[13px] text-body no-underline hover:bg-wash"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              aria-hidden="true"
              className="shrink-0"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
              <circle cx="9" cy="7" r="2.1" fill="currentColor" stroke="none" />
              <circle cx="15" cy="12" r="2.1" fill="currentColor" stroke="none" />
              <circle cx="11" cy="17" r="2.1" fill="currentColor" stroke="none" />
            </svg>
            Settings
            {pending > 0 && (
              <span className="ml-auto rounded-full bg-warn-bg px-2 py-px text-[11px] font-semibold text-warn vsp-nums">
                {pending}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-[9px] rounded-control px-[9px] py-[7px] text-left text-[13px] text-body hover:bg-wash"
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
              <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
              <path d="m16 16 4-4-4-4M20 12H9" />
            </svg>
            Sign out
          </button>
        </div>
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(!open)}
        className="flex min-h-12 w-full items-center gap-2.5 rounded-card border border-border px-2.5 py-2 text-left"
        style={{ background: open ? "var(--vsp-wash)" : "var(--vsp-panel)" }}
      >
        {/*
         * People waiting for an account are marked on the tile, not beside the
         * name. A count in the row costs about thirty pixels, which is the
         * difference between a company name reading in full and reading
         * "Hanssens K…" — and the name is the one thing this button exists to
         * say. The number itself is in the menu, next to Settings, where the
         * requests are actually handled.
         */}
        <span className="relative flex size-7 shrink-0">
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-control bg-chip text-[11px] font-bold text-accent-ink"
          >
            {initialsOf(current?.name ?? user?.fullName, "VS")}
          </span>
          {pending > 0 && !open && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-panel"
              style={{ background: "var(--vsp-warn-dot)" }}
            />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span translate="no" className="truncate text-[13px] font-semibold text-ink">
            {current?.name ?? "Loading…"}
          </span>
          <span className="truncate text-[11px] text-body-quiet">
            <span translate="no">{firstName}</span> · {role}
          </span>
        </span>
        {pending > 0 && !open && (
          <span className="sr-only">
            {pending === 1
              ? "1 person is waiting for an account"
              : `${pending} people are waiting for an account`}
          </span>
        )}
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--vsp-text-quiet)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0"
          style={{ transform: open ? "rotate(0deg)" : "rotate(180deg)" }}
        >
          <path d="m6 15 6-6 6 6" />
        </svg>
      </button>
    </div>
  );
}

/** The same four sections and the same menu, on a phone. */
function MobileChrome({ leadCount }: { leadCount: number | null }) {
  return (
    <>
      <header
        className="flex w-full items-center justify-between gap-3 border-b border-border bg-panel px-4 py-3 md:hidden"
        style={{ paddingTop: "max(.75rem, env(safe-area-inset-top))" }}
      >
        <Link
          to="/dashboard"
          className="flex min-h-11 items-center gap-2.5"
          aria-label="Verkoop Studio Sales"
        >
          <Mark size={28} />
          <span className="text-[17px] font-semibold tracking-[-0.045em] text-ink">Sales</span>
        </Link>
        <div className="w-56">
          <ProfileMenu compact />
        </div>
      </header>
      <nav
        aria-label="Sections"
        className="vsp-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-panel md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV.map(({ to, label, Icon, counted }) => (
          <Link
            key={to}
            to={to}
            className="relative flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] text-body no-underline [&.active]:font-semibold [&.active]:text-accent-ink"
          >
            <Icon size={20} />
            <span className="truncate">{label === "Quotes and contracts" ? "Quotes" : label}</span>
            {counted && leadCount != null && (
              <span className="absolute right-2 top-2 rounded-full bg-chip px-1.5 text-[10px] font-semibold text-body vsp-nums">
                {leadCount}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </>
  );
}
