/*
 * What the Sales CRM costs, behind one interface.
 *
 * The price is a function of one number: how many leads are in the contact
 * base. Nothing is charged until the workspace crosses the free ceiling, so a
 * new workspace is opened without a card and without a trial — there is no
 * trial, and no day on which anything stops working.
 *
 * No payment processor is wired up yet. When keys exist, the upgrade goes
 * through this module and nowhere else, so there is exactly one place to
 * replace.
 *
 * The figures below are the studio's own decision. They are not published on
 * the public website, and nothing here invents a number.
 */

/** Ceiling of the tier, and what it costs per month for the whole company. */
export type Tier = {
  /** Highest lead count still on this tier; null is the top tier. */
  upTo: number | null;
  monthlyExclVat: number;
  /** What this tier is called in a sentence. */
  name: string;
};

export const PLAN = {
  currency: "EUR",
  vatRate: 0.21,
  /** One price for the whole company, never per seat. */
  tiers: [
    { upTo: 500, monthlyExclVat: 0, name: "Free" },
    { upTo: 5_000, monthlyExclVat: 14.99, name: "Growing" },
    { upTo: null, monthlyExclVat: 39.99, name: "Full" },
  ] as const satisfies readonly Tier[],
} as const;

export const FREE_LEADS = PLAN.tiers[0].upTo;

/** True once a publishable key is configured for the browser build. */
export const isBillingConfigured = Boolean(
  typeof import.meta !== "undefined" && import.meta.env?.["VITE_STRIPE_PUBLISHABLE_KEY"],
);

/** The tier a workspace with this many leads is on. */
export function tierFor(leads: number): Tier {
  return PLAN.tiers.find((tier) => tier.upTo === null || leads <= tier.upTo) ?? PLAN.tiers.at(-1)!;
}

/** The tier after this one, or null at the top. */
export function nextTier(leads: number): Tier | null {
  const index = PLAN.tiers.indexOf(tierFor(leads) as (typeof PLAN.tiers)[number]);
  return PLAN.tiers[index + 1] ?? null;
}

/** How many leads are left before the price changes, or null at the top tier. */
export function leadsLeftOnTier(leads: number): number | null {
  const { upTo } = tierFor(leads);
  return upTo === null ? null : Math.max(0, upTo - leads);
}

export function withVat(amountExclVat: number) {
  return Math.round(amountExclVat * (1 + PLAN.vatRate) * 100) / 100;
}

export function vatOn(amountExclVat: number) {
  return Math.round(amountExclVat * PLAN.vatRate * 100) / 100;
}

/*
 * TODO — not built, because nothing charges yet: the upgrade itself. When a
 * workspace crosses FREE_LEADS it moves to the paid tier, and that is the one
 * moment a card is asked for. Put the Stripe call here, next to the tiers it
 * reads, and the prompt on the Plan panel in Settings. Nothing else in this
 * product locks, degrades or goes read-only, deliberately.
 */

/** "25 November", the way the canvas writes a billing date. */
export function billingDate(date: Date, language: "nl" | "en" = "en") {
  return date.toLocaleDateString(language === "nl" ? "nl-BE" : "en-GB", {
    day: "numeric",
    month: "long",
  });
}
