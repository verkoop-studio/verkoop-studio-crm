/*
 * Billing, behind one interface.
 *
 * Nothing about billing existed in this product before the redesign, and no
 * payment processor is wired up yet. Everything that would talk to Stripe goes
 * through this module, so there is exactly one place to replace when keys
 * exist. With no keys configured it degrades the way `isDatabaseConfigured`
 * does: the screens still work, the call returns a `stub` result and says so,
 * and nothing is charged because nothing is sent.
 *
 * The figures below are the ones the redesign canvas fixed. They are not
 * published anywhere public and nothing here invents a number.
 */

export const PLAN = {
  currency: "EUR",
  /** One price for the whole company, not per seat. */
  monthlyExclVat: 14.99,
  vatRate: 0.21,
  vatAmount: 3.15,
  monthlyInclVat: 18.14,
  dueToday: 0,
  trialDays: 14,
} as const;

/** True once a publishable key is configured for the browser build. */
export const isBillingConfigured = Boolean(
  typeof import.meta !== "undefined" && import.meta.env?.["VITE_STRIPE_PUBLISHABLE_KEY"],
);

export type PaymentMethod =
  | "apple_pay"
  | "google_pay"
  | "link"
  | "card"
  | "bancontact"
  | "ideal"
  | "sepa_debit";

export type BillingAddress = {
  fullName: string;
  street: string;
  extra?: string;
  postcode: string;
  city: string;
  country: string;
};

export type BusinessDetails = {
  companyName: string;
  vatNumber: string;
};

export type SubscriptionIntent = {
  method: PaymentMethod;
  address: BillingAddress;
  business?: BusinessDetails | undefined;
};

export type SubscriptionResult =
  | { status: "started"; trialEndsOn: Date; firstChargeOn: Date }
  | { status: "stub"; trialEndsOn: Date; firstChargeOn: Date; reason: string };

/**
 * Start the subscription with its 14 free days.
 *
 * Replace the body — not the callers — when Stripe keys exist: create the
 * customer, attach the payment method, open the subscription with
 * `trial_period_days: PLAN.trialDays`, and return `status: "started"`.
 */
export async function startSubscription(intent: SubscriptionIntent): Promise<SubscriptionResult> {
  const schedule = trialSchedule(new Date());
  if (!isBillingConfigured) {
    return {
      status: "stub",
      trialEndsOn: schedule.endsOn,
      firstChargeOn: schedule.firstChargeOn,
      reason:
        "No payment keys are configured, so nothing was sent to a payment provider and no card was stored.",
    };
  }
  // Unreachable until a key exists; kept so the signature is the real one.
  throw new Error(`Payments are configured but not implemented yet (method: ${intent.method}).`);
}

export type TrialSchedule = {
  startedOn: Date;
  /** Day 1 on the day you sign up, counting up to PLAN.trialDays. */
  dayOfTrial: number;
  endsOn: Date;
  firstChargeOn: Date;
  /** We warn three days before the first charge. */
  reminderOn: Date;
  daysLeft: number;
  expired: boolean;
};

export function trialSchedule(startedAt: Date | string, now: Date = new Date()): TrialSchedule {
  const startedOn = typeof startedAt === "string" ? new Date(startedAt) : startedAt;
  const dayMs = 86_400_000;
  const elapsed = Math.floor((startOfDay(now) - startOfDay(startedOn)) / dayMs);
  const dayOfTrial = Math.min(PLAN.trialDays, Math.max(1, elapsed + 1));
  const endsOn = addDays(startedOn, PLAN.trialDays);
  return {
    startedOn,
    dayOfTrial,
    endsOn,
    firstChargeOn: addDays(startedOn, PLAN.trialDays),
    reminderOn: addDays(startedOn, PLAN.trialDays - 3),
    daysLeft: Math.max(0, PLAN.trialDays - elapsed),
    expired: elapsed >= PLAN.trialDays,
  };
}

/*
 * TODO — not decided, so not built: what happens on day 15 when a trial ends
 * and no payment method works. There is no lock, no read-only mode and no
 * degrade anywhere in this product, deliberately. Whoever decides that should
 * add it here and in the route guard, not scattered through the screens.
 */

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** "25 November", the way the canvas writes a billing date. */
export function billingDate(date: Date, language: "nl" | "en" = "en") {
  return date.toLocaleDateString(language === "nl" ? "nl-BE" : "en-GB", {
    day: "numeric",
    month: "long",
  });
}
