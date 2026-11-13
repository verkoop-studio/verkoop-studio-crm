import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase, isDatabaseConfigured } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/brand";
import { useLanguage } from "@/hooks/use-language";
import { Stepper } from "@/components/Onboarding";
import {
  GoogleMark,
  Or,
  PasswordField,
  fieldClass,
  passwordStrength,
  primaryClass,
} from "@/components/AuthSplit";
import { euroCents } from "@/components/sales-ui";
import { FREE_LEADS, PLAN } from "@/lib/billing";
import { writeDraft } from "@/lib/onboarding";

export const Route = createFileRoute("/onboarding/account")({
  head: () => ({ meta: [{ title: "Create your workspace | Sales" }] }),
  component: Account,
});

/* Step 1. The account, before anything is asked about the company. */
function Account() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<"confirm" | "exists" | string | null>(null);
  const strength = passwordStrength(password);
  const { language } = useLanguage();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isDatabaseConfigured) {
      toast.error("No database is configured for this build.");
      return;
    }
    setBusy(true);
    setBlocked(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        // The confirmation mail is a Go template that reads `language` back out
        // of user_metadata (scripts/build-auth-templates.mjs), so the mail
        // arrives in the language this form was being read in. Without it,
        // every mail is Dutch no matter who signed up.
        // `self_signup` is what tells the rest of the app that nobody is
        // approving this account: see routeWithoutWorkspace.
        data: { full_name: name, language, self_signup: true },
      },
    });
    if (error) {
      setBusy(false);
      // A project with address enumeration left on says so here instead of
      // through the empty-identities answer below. Same situation, same panel.
      if (error.code === "user_already_exists" || error.code === "email_exists") {
        setBlocked("exists");
        return;
      }
      toast.error(error.message);
      return;
    }

    /*
     * Everything below is about one question: did this leave us with a session?
     *
     * It used to not ask. The sign-in ran, its result was thrown away, and the
     * rest of the set-up happened signed out — which nothing notices until the
     * last screen, where opening the workspace needs a session and Postgres
     * refuses the call. Four steps of someone's time, then a privilege error.
     */

    // Supabase returns a user with no identities when the address already has
    // an account, rather than saying so and confirming who has one.
    if (data.user && data.user.identities?.length === 0) {
      setBusy(false);
      setBlocked("exists");
      return;
    }

    if (!data.session) {
      const signIn = await supabase.auth.signInWithPassword({ email, password });
      if (!signIn.data.session) {
        setBusy(false);
        // A project that confirms addresses by email cannot sign anyone in
        // until they click the link, and says so in a code worth reading.
        setBlocked(
          signIn.error?.code === "email_not_confirmed"
            ? "confirm"
            : (signIn.error?.message ?? "confirm"),
        );
        return;
      }
    }

    setBusy(false);
    writeDraft({ fullName: name, email, startedAt: new Date().toISOString() });
    navigate({ to: "/onboarding/company" });
  };

  // One line each, because the Dutch translator matches whole sentences.
  const priceLine = `Free up to ${FREE_LEADS} leads, then ${euroCents(PLAN.tiers[1].monthlyExclVat)} a month, and ${euroCents(PLAN.tiers[2].monthlyExclVat)} over ${PLAN.tiers[1].upTo} leads. For the whole company, excl. VAT. Never per person.`;
  const freeLine = `No card, and nothing counting down. Nothing is charged until your contact base passes ${FREE_LEADS} leads.`;

  const perks = [
    "Every lead, every stage, in one list",
    "Unlimited people, one price for the company",
    "Quotes and contracts on the lead, not in a mailbox",
    `Nothing to pay until lead ${FREE_LEADS + 1}`,
  ];

  return (
    <div className="flex min-h-screen flex-wrap bg-panel text-ink">
      <div className="flex min-w-0 flex-[1_1_430px] flex-col gap-7 bg-dark px-11 py-10">
        <Wordmark size={32} dark />

        <h1 className="m-0 max-w-[22ch] text-balance text-[29px] font-bold leading-[1.18] tracking-[-0.055em] text-white">
          Stop losing deals in a spreadsheet.
        </h1>

        <div className="flex flex-col gap-3 rounded-panel border border-dark-line bg-dark-raised px-[22px] py-5">
          <span className="flex flex-wrap items-baseline gap-2.5">
            <span className="text-[30px] font-bold tracking-[-0.05em] text-white">Free</span>
            <span
              className="rounded-pill px-2.5 py-1 text-[12px] font-semibold"
              style={{ background: "var(--vsp-good)", color: "var(--vsp-good-bright)" }}
            >
              No card needed
            </span>
          </span>
          <span className="text-[13px] text-dark-muted">{priceLine}</span>
          <span aria-hidden="true" className="h-px bg-dark-line" />
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {perks.map((perk) => (
              <li key={perk} className="flex items-start gap-2.5 text-[13px] text-[#d7deff]">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--vsp-good-bright)"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="mt-0.5 shrink-0"
                >
                  <path d="m5 13 4 4L19 7" />
                </svg>
                {perk}
              </li>
            ))}
          </ul>
        </div>

        <p className="m-0 mt-auto border-t border-dark-line pt-3.5 text-[12px] leading-[1.6] text-dark-muted">
          Joining a company that already uses this? Do not start here.{" "}
          <Link to="/request-access" className="font-semibold">
            Ask them for an account
          </Link>{" "}
          instead, or open the invitation they sent you.
        </p>
      </div>

      <div className="flex min-w-0 flex-[1_1_500px] flex-col justify-center gap-[22px] px-12 pb-10 pt-8">
        <div className="mx-auto flex w-full max-w-[410px] flex-col gap-5">
          <Stepper step={1} />

          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-[23px] font-bold tracking-[-0.05em] text-ink-strong">
              Create your workspace.
            </h2>
            <p className="m-0 text-[13px] text-body-quiet">
              Two minutes. Your first lead is in before the end of it.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() =>
                void supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: `${window.location.origin}/onboarding/company` },
                })
              }
              className="flex min-h-12 items-center justify-center gap-2.5 rounded-control border border-border-control bg-panel px-4 text-[14px] font-semibold text-ink-strong"
            >
              <GoogleMark />
              Continue with Google
            </button>
            <Or />
          </div>

          <form onSubmit={submit} className="flex flex-col gap-[15px]">
            <span className="flex flex-col gap-1.5">
              <label htmlFor="oa-name" className="text-[12px] font-semibold text-body">
                Your name
              </label>
              <input
                id="oa-name"
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your full name"
                className={fieldClass}
              />
            </span>

            <span className="flex flex-col gap-1.5">
              <label htmlFor="oa-email" className="text-[12px] font-semibold text-body">
                Work email
              </label>
              <input
                id="oa-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@yourcompany.be"
                className={fieldClass}
              />
            </span>

            <span className="flex flex-col gap-1.5">
              <label htmlFor="oa-pw" className="text-[12px] font-semibold text-body">
                Password
              </label>
              <PasswordField
                id="oa-pw"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                placeholder="At least 15 characters"
                minLength={12}
                shown={shown}
                onToggle={() => setShown(!shown)}
              />
              <span className="flex items-center gap-2 pt-0.5">
                <span aria-hidden="true" className="h-1 flex-1 overflow-hidden rounded-sm bg-chip">
                  <span
                    className="block h-full rounded-sm"
                    style={{ width: strength.width, background: strength.ink }}
                  />
                </span>
                <span className="text-[11px] font-semibold" style={{ color: strength.ink }}>
                  {strength.label}
                </span>
              </span>
            </span>

            {blocked && (
              <div
                role="alert"
                className="flex flex-col gap-1.5 rounded-control border border-warn-line bg-warn-bg px-[13px] py-[11px]"
              >
                <span className="text-[13px] font-semibold text-ink">
                  {blocked === "exists"
                    ? "That address already has an account."
                    : blocked === "confirm"
                      ? "Confirm your email address first."
                      : "We could not sign you in."}
                </span>
                <span className="text-[12px] leading-[1.55] text-body">
                  {blocked === "exists"
                    ? "Sign in with it instead, or open the invitation someone sent you."
                    : blocked === "confirm"
                      ? `We sent a link to ${email}. Open it, then sign in here and your set-up carries on.`
                      : blocked}
                </span>
                <Link to="/auth" className="text-[12px] font-semibold text-accent-ink">
                  Go to sign in
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className={`${primaryClass} flex items-center justify-center gap-2.5`}
              style={{ background: "var(--vsp-accent)" }}
            >
              {busy ? "Setting it up…" : "Open my workspace"}
              <svg
                width="15"
                height="15"
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

            <span className="flex items-center gap-2.5 rounded-control bg-good-wash px-[13px] py-[11px]">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--vsp-good)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="shrink-0"
              >
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              <span className="text-[12px] leading-[1.6] text-good">{freeLine}</span>
            </span>

            <p className="m-0 text-[11px] leading-[1.6] text-caption">
              By continuing you agree to the terms and the privacy statement. Your leads are yours:
              export them whenever you like, and we never sell or share them.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
