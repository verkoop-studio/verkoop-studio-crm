import { supabase } from "@/integrations/supabase/client";

/*
 * What the self-serve sign-up remembers between its steps.
 *
 * This is a draft, not a record: it lives in this browser only, it is cleared
 * when the workspace is created, and nothing here is a source of truth for the
 * company, the team or the billing. No schema was added for it.
 */
const KEY = "sales-onboarding";

export type FillWith = "csv" | "form" | "hand";

export type Invite = { email: string; role: "admin" | "team_leader" | "rep" };

export type SellingAnswers = {
  /** How many deals are open at once. One answer. */
  size?: string;
  /** What usually kills a deal. Several answers. */
  kills: string[];
  /** What would make this worth keeping. Several answers. */
  want: string[];
};

export type OnboardingDraft = {
  fullName?: string;
  email?: string;
  companyName?: string;
  country?: string;
  fillWith?: FillWith;
  invites?: Invite[];
  answers?: SellingAnswers;
  startedAt?: string;
  checkout?: { status: "started" | "stub"; at: string };
};

const EMPTY: OnboardingDraft = {};

export function readDraft(): OnboardingDraft {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as OnboardingDraft) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function writeDraft(patch: OnboardingDraft): OnboardingDraft {
  const next = { ...readDraft(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* A draft is a convenience. Blocked storage must not stop the sign-up. */
  }
  return next;
}

export function clearDraft() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* Nothing to clean up when storage is blocked. */
  }
}

export type WorkspaceResult =
  { ok: true; id: string } | { ok: false; reason: "failed" | "signed-out"; message: string };

/**
 * Create the workspace the self-serve flow has been collecting.
 *
 * One call, one place to change. Anyone signed in may open a workspace and
 * becomes its administrator, with no limit on how many — so the only way this
 * fails now is the database being unreachable or refusing the name.
 */
export async function createWorkspace(name: string): Promise<WorkspaceResult> {
  /*
   * Check the session before asking, because without one this call goes out as
   * `anon`, the migration revokes `create_crm_company` from `anon`, and
   * Postgres answers "permission denied for function create_crm_company".
   * That is a true sentence about a grant and a useless one about what the
   * reader should do, and it arrives on the last screen of the flow.
   */
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) {
    return {
      ok: false,
      reason: "signed-out",
      message: "You are not signed in any more, so the workspace was not opened.",
    };
  }
  const { data, error } = await supabase.rpc("create_crm_company", { _name: name });
  if (error) return { ok: false, reason: "failed", message: error.message };
  return { ok: true, id: data as string };
}

/**
 * Where a signed-in person with no workspace belongs.
 *
 * Two kinds of people arrive here with nothing behind their account. Someone
 * who asked an administrator at their company for access is genuinely waiting
 * on another human, and /pending is their screen. Someone who started the
 * self-serve sign-up is waiting on nobody: they are one step into building
 * their own workspace and confirming their e-mail address interrupted them.
 * Sending that person to /pending tells them to wait for an administrator who
 * does not exist, and the authenticated guard files an access request in their
 * name on the way past.
 *
 * The sign-up form writes `self_signup` into user_metadata, so this answer
 * travels with the account rather than with the browser — the confirmation
 * mail is often opened on a phone. An account created before that form started
 * writing the flag has none, and keeps the behaviour it has today.
 */
export function routeWithoutWorkspace(
  user: { user_metadata?: Record<string, unknown> | null } | null | undefined,
): "/onboarding/company" | "/pending" {
  return user?.user_metadata?.["self_signup"] === true ? "/onboarding/company" : "/pending";
}

/**
 * The answers decide the landing screen, which is the whole reason step 4
 * exists. A lot of open deals, or losing track of them, means the board; a
 * short list means the list.
 */
export function landingRoute(answers: SellingAnswers | undefined): "/prospectflow" | "/leads" {
  if (!answers) return "/leads";
  if (answers.size === "lots" || answers.size === "200") return "/prospectflow";
  return "/leads";
}

/** The line under the three questions, which changes with the answers. */
export function sellingOutcome(answers: SellingAnswers): string {
  if (answers.want.includes("worth")) {
    return "Open pipeline goes to the top of your dashboard, and we will keep asking for a value on leads that do not have one, because an unvalued deal makes that number a lie.";
  }
  if (answers.kills.includes("slow") || answers.kills.includes("forget")) {
    return 'We will put "needs follow-up" at the top and count anything untouched for seven days, which is the one number that moves when you fix this.';
  }
  if (answers.want.includes("channel")) {
    return "Your dashboard leads with where leads come from, and winning a deal sends its value back to Performance so the ad that started it gets the credit.";
  }
  if (answers.size === "lots" || answers.size === "200") {
    return "At that volume you will live on the Prospectflow board rather than the list, so we will make that your landing screen.";
  }
  return "Under fifty open deals, the list is faster than a board, so we will start you on Leads and leave the board a click away.";
}
