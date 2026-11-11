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
  { ok: true; id: string } | { ok: false; reason: "not_enabled" | "failed"; message: string };

/**
 * Create the workspace the self-serve flow has been collecting.
 *
 * One call, one place to change. `create_crm_company` is currently reserved
 * to Verkoop Studio's own administrators, so for anyone else this reports
 * `not_enabled` rather than failing somewhere deep in the last step: the
 * account exists, nothing was charged, and a person has to open the company.
 * Switching self-serve on is a database policy decision, not a screen.
 */
export async function createWorkspace(name: string): Promise<WorkspaceResult> {
  const { data, error } = await supabase.rpc("create_crm_company", { _name: name });
  if (error) {
    const notAllowed = /administrator/i.test(error.message);
    return {
      ok: false,
      reason: notAllowed ? "not_enabled" : "failed",
      message: error.message,
    };
  }
  return { ok: true, id: data as string };
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
