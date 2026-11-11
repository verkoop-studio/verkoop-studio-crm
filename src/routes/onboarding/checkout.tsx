import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Mark } from "@/components/brand";
import { Stepper } from "@/components/Onboarding";
import { Panel, euroCents } from "@/components/sales-ui";
import {
  PLAN,
  billingDate,
  isBillingConfigured,
  startSubscription,
  trialSchedule,
  type PaymentMethod,
} from "@/lib/billing";
import { clearDraft, createWorkspace, landingRoute, readDraft } from "@/lib/onboarding";

export const Route = createFileRoute("/onboarding/checkout")({
  head: () => ({ meta: [{ title: "Start your trial | Sales" }] }),
  component: Checkout,
});

const METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
  {
    key: "card",
    label: "Card",
    icon: "M3 7.5h18M3 10.5v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-11a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4",
  },
  { key: "bancontact", label: "Bancontact", icon: "M4 18V6h16v12zM8 10h8M8 14h4" },
  { key: "ideal", label: "iDEAL", icon: "M6 20V9l6-5 6 5v11zM10 20v-6h4v6" },
  {
    key: "sepa_debit",
    label: "SEPA debit",
    icon: "M3 9h18M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM7 14h4",
  },
];

const BANK_NOTE: Partial<Record<PaymentMethod, string>> = {
  bancontact:
    "Bancontact approves the mandate once. Nothing is taken now; the first payment is collected on",
  ideal: "iDEAL approves the mandate once. Nothing is taken now; the first payment is collected on",
  sepa_debit:
    "You authorise a direct debit now. Nothing leaves your account before the date below, and your bank can reverse it for 8 weeks after. First collection on",
};

const field =
  "min-h-[46px] w-full rounded-control border border-border-control bg-panel px-[13px] text-[14px] text-ink";
const label = "text-[12px] font-semibold text-body";

/*
 * Step 5, and last: the card.
 *
 * Express wallets first because that is how most people pay, then the local
 * methods this market actually uses. The billing address is always visible —
 * it decides the VAT line — and the summary on the right says the only two
 * figures that matter: nothing today, and what comes off on the first
 * charging day.
 *
 * Payments go through src/lib/billing.ts and nowhere else. With no keys
 * configured that call is a stub: it reports that nothing was sent and no
 * card was stored, the workspace is still opened, and the screen says so
 * rather than pretending a subscription exists.
 */
function Checkout() {
  const navigate = useNavigate();
  const draft = readDraft();
  const schedule = trialSchedule(draft.startedAt ?? new Date());
  const chargeOn = billingDate(schedule.firstChargeOn);
  const remindOn = billingDate(schedule.reminderOn);

  const [method, setMethod] = useState<PaymentMethod>("card");
  const [business, setBusiness] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const [address, setAddress] = useState({
    fullName: draft.fullName ?? "",
    street: "",
    extra: "",
    postcode: "",
    city: "",
    country: (draft.country ?? "Belgium").split(",")[0] ?? "Belgium",
  });
  const [vat, setVat] = useState("");
  const [companyName, setCompanyName] = useState(draft.companyName ?? "");

  const people = 1 + (draft.invites?.filter((invite) => invite.email.trim()).length ?? 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setResult(null);

    const subscription = await startSubscription({
      method,
      address,
      business: business ? { companyName, vatNumber: vat } : undefined,
    });

    const workspace = await createWorkspace(
      (draft.companyName ?? companyName ?? "").trim() || "My company",
    );

    setBusy(false);

    if (!workspace.ok) {
      setResult(
        workspace.reason === "not_enabled"
          ? "Your account exists and nothing was charged, but opening a new workspace is still reserved to Verkoop Studio. Ask them to open it and everything you filled in here is waiting."
          : `The workspace could not be opened: ${workspace.message}. Nothing was charged.`,
      );
      return;
    }

    if (subscription.status === "stub") {
      toast.success("Workspace opened. No payment was taken.");
    } else {
      toast.success("Workspace opened. Your trial has started.");
    }
    clearDraft();
    navigate({ to: landingRoute(draft.answers) });
  };

  return (
    <div className="flex min-h-screen flex-col bg-page text-ink">
      <div className="flex flex-wrap items-center gap-4 border-b border-border bg-panel px-7 py-[18px]">
        <span className="flex items-center gap-2.5">
          <Mark size={27} />
          <span className="text-[16px] font-semibold tracking-[-0.04em] text-ink">Sales</span>
        </span>
        <Stepper step={5} />
        <span className="ml-auto flex items-center gap-[7px] text-[12px] text-body-quiet">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--vsp-good)"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          Handled by Stripe. We never see your card.
        </span>
      </div>

      <div className="flex flex-1 justify-center px-7 pb-11 pt-8">
        <div className="flex w-full max-w-[940px] flex-col gap-[22px]">
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 text-[26px] font-bold tracking-[-0.055em] text-ink-strong">
              Your workspace is ready. Keep it for {PLAN.trialDays} days, on us.
            </h1>
            <p className="m-0 text-[14px] text-body-quiet">
              Nothing is charged today. We ask for a card so it does not stop working on day{" "}
              {PLAN.trialDays + 1}.
            </p>
          </div>

          {!isBillingConfigured && (
            <p className="m-0 rounded-panel-inner border border-warn-line bg-warn-bg px-[18px] py-3 text-[12px] leading-[1.6] text-warn">
              No payment keys are configured in this build, so this form collects your details and
              sends them nowhere. Nothing is stored, nothing is charged, and your workspace opens
              anyway.
            </p>
          )}

          <form onSubmit={submit} className="flex flex-wrap items-start gap-[18px]">
            {/* Paying */}
            <Panel className="flex min-w-0 flex-[1_1_440px] flex-col gap-[18px] p-[22px]">
              <div className="flex flex-col gap-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-caption">
                  Fastest
                </span>
                <div className="flex flex-wrap gap-2.5">
                  <Wallet
                    label="Set up with Apple Pay"
                    onClick={() => setMethod("apple_pay")}
                    style={{ background: "#000000" }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="#ffffff"
                      aria-hidden="true"
                    >
                      <path d="M16.1 12.6c0-2 1.6-3 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7s-1.6-.7-2.6-.7c-1.3 0-2.6.8-3.2 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2.1 2.5 2 1 0 1.4-.6 2.6-.6s1.5.6 2.6.6 1.7-1 2.4-1.9c.7-1.1 1-2.2 1-2.2s-2-.8-2.1-3.3M14.3 6c.5-.7.9-1.6.8-2.6-.8 0-1.8.5-2.4 1.2-.5.6-1 1.6-.8 2.5.9.1 1.8-.4 2.4-1.1" />
                    </svg>
                    <span className="text-[14px] font-semibold text-white">Pay</span>
                  </Wallet>
                  <Wallet
                    label="Set up with Google Pay"
                    onClick={() => setMethod("google_pay")}
                    style={{ background: "#ffffff", border: "1px solid #1f2328" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285f4"
                        d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4"
                      />
                      <path
                        fill="#34a853"
                        d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22"
                      />
                      <path
                        fill="#fbbc04"
                        d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z"
                      />
                      <path
                        fill="#ea4335"
                        d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1"
                      />
                    </svg>
                    <span className="text-[14px] font-semibold" style={{ color: "#1f2328" }}>
                      Pay
                    </span>
                  </Wallet>
                  <Wallet
                    label="Set up with Link"
                    onClick={() => setMethod("link")}
                    style={{ background: "#00d66f" }}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#011e0f"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M9.5 14.5 14.5 9.5" />
                      <path d="M11 6.5 13 4.5a4.2 4.2 0 0 1 6 6l-2 2" />
                      <path d="M13 17.5 11 19.5a4.2 4.2 0 0 1-6-6l2-2" />
                    </svg>
                    <span
                      className="text-[14px] font-bold tracking-[-0.02em]"
                      style={{ color: "#011e0f" }}
                    >
                      Link
                    </span>
                  </Wallet>
                </div>
                <span className="text-[11px] text-caption">
                  One tap. Stripe remembers the card, we never receive it.
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-caption">
                  or pay another way
                </span>
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
              </div>

              <div role="group" aria-label="Payment method" className="flex flex-wrap gap-2.5">
                {METHODS.map((option) => {
                  const on = method === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setMethod(option.key)}
                      className="flex min-h-[68px] flex-[1_1_110px] flex-col items-center justify-center gap-1.5 rounded-panel-inner border px-2.5 py-3"
                      style={{
                        background: on ? "var(--vsp-accent-tint)" : "var(--vsp-panel)",
                        borderColor: on ? "var(--vsp-accent)" : "var(--vsp-border-control)",
                        boxShadow: on ? "0 0 0 1px var(--vsp-accent)" : "none",
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={on ? "var(--vsp-accent-ink)" : "var(--vsp-text-quiet)"}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d={option.icon} />
                      </svg>
                      <span
                        className="text-[12px]"
                        style={{
                          color: on ? "var(--vsp-accent-ink)" : "var(--vsp-text-quiet)",
                          fontWeight: on ? 600 : 500,
                        }}
                      >
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {method === "card" && (
                <div className="flex flex-col gap-3">
                  <span className="flex flex-col gap-1.5">
                    <label htmlFor="ck-card" className={label}>
                      Card number
                    </label>
                    <span className="relative flex">
                      <input
                        id="ck-card"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        placeholder="1234 1234 1234 1234"
                        className={`${field} pr-[92px]`}
                      />
                      <span
                        aria-hidden="true"
                        className="absolute right-[11px] top-0 flex h-full items-center gap-1.5"
                      >
                        <span
                          className="flex h-[17px] w-[26px] items-center justify-center rounded-sm text-[8px] font-bold text-white"
                          style={{ background: "#1a1f71" }}
                        >
                          VISA
                        </span>
                        <span className="flex h-[17px] w-[26px] items-center justify-center rounded-sm bg-chip">
                          <span className="size-2 rounded-full" style={{ background: "#eb001b" }} />
                          <span
                            className="-ml-1 size-2 rounded-full"
                            style={{ background: "#f79e1b" }}
                          />
                        </span>
                        <span
                          className="flex h-[17px] w-[26px] items-center justify-center rounded-sm text-[7px] font-bold text-white"
                          style={{ background: "#006fcf" }}
                        >
                          AMEX
                        </span>
                      </span>
                    </span>
                  </span>
                  <div className="flex flex-wrap gap-3">
                    <span className="flex min-w-0 flex-[1_1_130px] flex-col gap-1.5">
                      <label htmlFor="ck-exp" className={label}>
                        Expiry
                      </label>
                      <input
                        id="ck-exp"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="MM / YY"
                        className={field}
                      />
                    </span>
                    <span className="flex min-w-0 flex-[1_1_110px] flex-col gap-1.5">
                      <label htmlFor="ck-cvc" className={label}>
                        CVC
                      </label>
                      <input
                        id="ck-cvc"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder="123"
                        className={field}
                      />
                    </span>
                  </div>
                </div>
              )}

              {BANK_NOTE[method] && (
                <div className="flex flex-col gap-3">
                  <span className="flex flex-col gap-1.5">
                    <label htmlFor="ck-bank" className={label}>
                      Your bank
                    </label>
                    <select id="ck-bank" className={field} defaultValue="">
                      <option value="">Choose your bank</option>
                      <option>KBC</option>
                      <option>BNP Paribas Fortis</option>
                      <option>ING</option>
                      <option>Belfius</option>
                      <option>Argenta</option>
                    </select>
                  </span>
                  <p className="m-0 rounded-control bg-wash px-[13px] py-[11px] text-[12px] leading-[1.6] text-body">
                    {BANK_NOTE[method]} {chargeOn}.
                  </p>
                </div>
              )}

              {/* Billing address, always visible */}
              <div className="flex flex-col gap-3 border-t border-hairline pt-4">
                <span className="flex flex-wrap items-baseline gap-2.5">
                  <span className={label}>Billing address</span>
                  <span className="text-[11px] text-caption">
                    it goes on the invoice, and it sets the VAT rate
                  </span>
                </span>

                <span className="flex flex-col gap-1.5">
                  <label htmlFor="ck-name" className={label}>
                    Full name
                  </label>
                  <input
                    id="ck-name"
                    autoComplete="name"
                    value={address.fullName}
                    onChange={(event) => setAddress({ ...address, fullName: event.target.value })}
                    className={field}
                  />
                </span>

                <div className="flex flex-wrap gap-3">
                  <span className="flex min-w-0 flex-[2_1_240px] flex-col gap-1.5">
                    <label htmlFor="ck-street" className={label}>
                      Street and number
                    </label>
                    <input
                      id="ck-street"
                      autoComplete="address-line1"
                      value={address.street}
                      onChange={(event) => setAddress({ ...address, street: event.target.value })}
                      className={field}
                    />
                  </span>
                  <span className="flex min-w-0 flex-[1_1_120px] flex-col gap-1.5">
                    <label htmlFor="ck-extra" className={label}>
                      Box <span className="font-normal text-caption">optional</span>
                    </label>
                    <input
                      id="ck-extra"
                      autoComplete="address-line2"
                      value={address.extra}
                      onChange={(event) => setAddress({ ...address, extra: event.target.value })}
                      className={field}
                    />
                  </span>
                </div>

                <div className="flex flex-wrap gap-3">
                  <span className="flex min-w-0 flex-[1_1_110px] flex-col gap-1.5">
                    <label htmlFor="ck-zip" className={label}>
                      Postcode
                    </label>
                    <input
                      id="ck-zip"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      value={address.postcode}
                      onChange={(event) => setAddress({ ...address, postcode: event.target.value })}
                      className={field}
                    />
                  </span>
                  <span className="flex min-w-0 flex-[2_1_160px] flex-col gap-1.5">
                    <label htmlFor="ck-city" className={label}>
                      City
                    </label>
                    <input
                      id="ck-city"
                      autoComplete="address-level2"
                      value={address.city}
                      onChange={(event) => setAddress({ ...address, city: event.target.value })}
                      className={field}
                    />
                  </span>
                  <span className="flex min-w-0 flex-[1_1_150px] flex-col gap-1.5">
                    <label htmlFor="ck-country" className={label}>
                      Country
                    </label>
                    <select
                      id="ck-country"
                      autoComplete="country"
                      value={address.country}
                      onChange={(event) => setAddress({ ...address, country: event.target.value })}
                      className={field}
                    >
                      {["Belgium", "Netherlands", "France", "Germany", "Luxembourg"].map(
                        (option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ),
                      )}
                    </select>
                  </span>
                </div>
              </div>

              {/* Buying as a business */}
              <div className="flex flex-col gap-3 border-t border-hairline pt-1">
                <button
                  type="button"
                  aria-pressed={business}
                  onClick={() => setBusiness(!business)}
                  className="flex min-h-10 items-center gap-2.5 py-2 text-left text-[13px] text-body"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-[17px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px]"
                    style={{
                      borderColor: business ? "var(--vsp-accent)" : "#cfd5e8",
                      background: business ? "var(--vsp-accent)" : "var(--vsp-panel)",
                    }}
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="3.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ opacity: business ? 1 : 0 }}
                    >
                      <path d="m5 13 4 4L19 7" />
                    </svg>
                  </span>
                  I am buying as a business
                </button>
                {business && (
                  <div className="flex flex-wrap gap-3">
                    <span className="flex min-w-0 flex-[1_1_180px] flex-col gap-1.5">
                      <label htmlFor="ck-company" className={label}>
                        Company name
                      </label>
                      <input
                        id="ck-company"
                        autoComplete="organization"
                        value={companyName}
                        onChange={(event) => setCompanyName(event.target.value)}
                        className={field}
                      />
                    </span>
                    <span className="flex min-w-0 flex-[1_1_160px] flex-col gap-1.5">
                      <label htmlFor="ck-vat" className={label}>
                        VAT number
                      </label>
                      <input
                        id="ck-vat"
                        value={vat}
                        onChange={(event) => setVat(event.target.value)}
                        placeholder="BE0123456789"
                        className={field}
                      />
                    </span>
                    <span className="flex-[1_1_100%] text-[11px] leading-[1.6] text-caption">
                      Registered in another EU country? Stripe validates the number and applies the
                      reverse charge where it applies, so the VAT line disappears from your invoice.
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={busy}
                className="flex min-h-[52px] items-center justify-center gap-2.5 rounded-control px-[18px] py-[15px] text-[15px] font-semibold text-white shadow-raised disabled:opacity-60"
                style={{ background: "var(--vsp-accent)" }}
              >
                {busy ? "Opening your workspace…" : `Start my ${PLAN.trialDays} days free`}
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
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </button>

              {result && (
                <p
                  role="alert"
                  className="m-0 rounded-panel-inner border border-warn-line bg-warn-bg px-[13px] py-[11px] text-[12px] leading-[1.6] text-warn"
                >
                  {result}
                </p>
              )}

              <span className="flex items-center justify-center gap-[7px] text-[11px] text-disabled">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                Secured and processed by Stripe
              </span>
            </Panel>

            {/* What it costs */}
            <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5">
              <Panel className="flex flex-col">
                <span className="flex items-center gap-[11px] px-[18px] pb-3.5 pt-4">
                  <Mark size={32} />
                  <span className="flex flex-col">
                    <span className="text-[14px] font-semibold tracking-[-0.02em]">Sales</span>
                    <span className="text-[12px] text-body-quiet">
                      {draft.companyName ?? "Your company"}, {people}{" "}
                      {people === 1 ? "person" : "people"}
                    </span>
                  </span>
                </span>
                <span className="flex items-baseline gap-3 border-t border-hairline px-[18px] py-[11px]">
                  <span className="text-[13px] text-body">The whole company, monthly</span>
                  <span className="ml-auto text-[13px] text-body vsp-nums">
                    {euroCents(PLAN.monthlyExclVat)}
                  </span>
                </span>
                <span className="flex items-baseline gap-3 border-t border-hairline px-[18px] py-[11px]">
                  <span className="text-[13px] text-body">{PLAN.trialDays} day trial</span>
                  <span className="ml-auto text-[13px] font-semibold text-good vsp-nums">
                    − {euroCents(PLAN.monthlyExclVat)}
                  </span>
                </span>
                <span className="flex items-baseline gap-3 border-t border-hairline bg-good-wash px-[18px] py-3.5">
                  <span className="text-[13px] font-bold text-good">Due today</span>
                  <span className="ml-auto text-[20px] font-bold tracking-[-0.04em] text-good vsp-nums">
                    {euroCents(PLAN.dueToday)}
                  </span>
                </span>
                <span className="flex flex-wrap items-baseline gap-2 border-t border-hairline px-[18px] pb-3.5 pt-3">
                  <span className="text-[13px] text-body">Then on {chargeOn}</span>
                  <span className="ml-auto text-[13px] font-semibold text-ink vsp-nums">
                    {euroCents(PLAN.monthlyInclVat)}
                  </span>
                  <span className="flex-[1_1_100%] pt-1.5 text-[11px] leading-[1.6] text-caption">
                    Including {Math.round(PLAN.vatRate * 100)}% VAT, which is{" "}
                    {euroCents(PLAN.vatAmount)}, then the same day each month. We email you on{" "}
                    {remindOn}, three days before, so it is never a surprise.
                  </span>
                </span>
              </Panel>

              <div className="flex items-start gap-3 rounded-panel-inner bg-accent-tint px-4 py-3.5">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--vsp-accent-ink)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="mt-px shrink-0"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M19 8v6M22 11h-6" />
                </svg>
                <span className="text-[12px] leading-[1.6] text-accent-ink">
                  Adding people never changes this number. Three today or thirty next year, it is{" "}
                  {euroCents(PLAN.monthlyExclVat)} for the company.
                </span>
              </div>

              <div className="flex items-start gap-3 rounded-panel-inner border border-border bg-panel px-4 py-3.5">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--vsp-text)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="mt-px shrink-0"
                >
                  <path d="m9 18-6-6 6-6M15 6l6 6-6 6" />
                </svg>
                <span className="text-[12px] leading-[1.6] text-body">
                  Cancelling is a button in Settings. No email, no call, no notice period, and your
                  leads export to CSV on the way out.
                </span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Wallet({
  label: name,
  onClick,
  style,
  children,
}: {
  label: string;
  onClick: () => void;
  style: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={name}
      onClick={onClick}
      className="flex min-h-12 flex-[1_1_130px] items-center justify-center gap-2 rounded-control border-0 p-3"
      style={style}
    >
      {children}
    </button>
  );
}
