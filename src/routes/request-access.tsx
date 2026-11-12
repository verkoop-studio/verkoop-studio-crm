import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase, isDatabaseConfigured } from "@/integrations/supabase/client";
import {
  AuthSplit,
  Chain,
  GoogleMark,
  Or,
  PasswordField,
  fieldClass,
  passwordStrength,
  primaryClass,
} from "@/components/AuthSplit";
import { FREE_LEADS } from "@/lib/billing";

export const Route = createFileRoute("/request-access")({
  head: () => ({
    meta: [
      { title: "Ask for an account | Sales" },
      {
        name: "description",
        content:
          "Accounts are given out by your own team. Ask, and an admin at your company approves it.",
      },
      { property: "og:title", content: "Ask for an account | Sales" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: () => (isDatabaseConfigured ? <RequestAccess /> : <Unavailable />),
});

function Unavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-page p-8">
      <div className="panel max-w-lg p-8">
        <h1 className="text-[20px] font-bold tracking-[-0.045em] text-ink-strong">
          Not taking requests yet
        </h1>
        <p className="mt-3 text-[13px] leading-[1.6] text-body">
          No database is configured for this build, so there is nobody to send a request to.
        </p>
      </div>
    </main>
  );
}

/*
 * Asking for an account is its own page with its own words.
 *
 * Nobody buys a seat here and nobody signs up into an empty workspace: you
 * ask, an admin at your company says yes, and you land in their leads. "I
 * already have an account" goes back to signing in; the self-serve flow,
 * which is a different thing entirely, gets its own quieter pointer.
 */
function RequestAccess() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const strength = passwordStrength(password);

  const { data: googleEnabled = false } = useQuery({
    queryKey: ["auth", "google-enabled"],
    staleTime: 5 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const response = await fetch(`${import.meta.env["VITE_SUPABASE_URL"]}/auth/v1/settings`, {
        signal,
        headers: { apikey: import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] },
      });
      if (!response.ok) throw new Error("Could not load sign-in providers");
      const settings = (await response.json()) as { external?: { google?: boolean } };
      return settings.external?.google === true;
    },
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { full_name: name },
      },
    });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    // Signing in straight away is what files the request against a company.
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) {
      toast.success("Account created. Confirm it from your email, then come back and sign in.");
      navigate({ to: "/auth" });
      return;
    }
    toast.success("Your request has been sent.");
    navigate({ to: "/pending" });
  };

  const google = async () => {
    const result = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (result.error) toast.error("Google sign-in failed. Use your email instead.");
  };

  return (
    <AuthSplit
      left={
        <>
          <h1 className="m-0 max-w-[22ch] text-balance text-[31px] font-bold leading-[1.2] tracking-[-0.055em] text-white">
            Accounts are given out by your own team.
          </h1>
          <p className="m-0 max-w-[40ch] text-[14px] leading-[1.65] text-dark-text">
            Nobody buys a seat here and nobody signs up into an empty workspace. You ask, an admin
            at your company says yes, and you land in their leads with the access they gave you.
          </p>

          <Chain
            items={[
              {
                number: "1",
                title: "You send this",
                note: "name, work email, a password you choose",
              },
              {
                number: "2",
                title: "An admin sees it in Settings",
                note: "they approve it and pick what you may do",
              },
              {
                number: "3",
                title: "You get an email and sign in",
                note: "straight into their leads, nothing to set up",
              },
            ]}
          />

          <p className="m-0 mt-auto border-t border-dark-line pt-3.5 text-[12px] leading-[1.6] text-dark-muted">
            Already been sent an invitation? Open the link in that email instead. It skips all of
            this and puts you straight into the right company.
          </p>
        </>
      }
      right={
        <>
          <div className="flex flex-col gap-1.5">
            <h2 className="m-0 text-[24px] font-bold tracking-[-0.05em] text-ink-strong">
              Ask for an account.
            </h2>
            <p className="m-0 text-[13px] text-body-quiet">
              Use your work address, so the admin recognises you.
            </p>
          </div>

          {googleEnabled && (
            <>
              <button
                type="button"
                onClick={google}
                className="flex min-h-12 items-center justify-center gap-2.5 rounded-control border border-border-control bg-panel px-4 text-[14px] font-semibold text-ink-strong"
              >
                <GoogleMark />
                Ask with Google
              </button>
              <Or />
            </>
          )}

          <form onSubmit={submit} className="flex flex-col gap-3.5">
            <span className="flex flex-col gap-1.5">
              <label htmlFor="su-name" className="text-[12px] font-semibold text-body">
                Your name
              </label>
              <input
                id="su-name"
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your full name"
                className={fieldClass}
              />
            </span>

            <span className="flex flex-col gap-1.5">
              <label htmlFor="su-email" className="text-[12px] font-semibold text-body">
                Work email
              </label>
              <input
                id="su-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@yourcompany.be"
                className={fieldClass}
              />
              <span className="text-[11px] text-caption">
                We match the domain to a company, so an admin there gets the request.
              </span>
            </span>

            <span className="flex flex-col gap-1.5">
              <label htmlFor="su-pw" className="text-[12px] font-semibold text-body">
                Password
              </label>
              <PasswordField
                id="su-pw"
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

            <button
              type="submit"
              disabled={busy}
              className={primaryClass}
              style={{ background: "var(--vsp-accent)" }}
            >
              {busy ? "Sending…" : "Send my request"}
            </button>
          </form>

          <span className="flex items-start gap-2.5 rounded-panel-inner bg-warn-bg px-3.5 py-3">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--vsp-warn)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="mt-px shrink-0"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span className="text-[12px] leading-[1.6] text-warn">
              You cannot sign in until someone approves this. We will email you the moment they do,
              usually the same day.
            </span>
          </span>

          <div className="flex flex-col gap-2 border-t border-hairline pt-4">
            <p className="m-0 text-center text-[13px] text-body-quiet">
              <Link to="/auth" className="font-semibold">
                I already have an account
              </Link>
            </p>
            <p className="m-0 text-center text-[12px] text-caption">
              Nobody at your company uses this yet?{" "}
              <Link to="/onboarding/account" className="font-semibold">
                Set it up yourself
              </Link>{" "}
              {`instead, free up to ${FREE_LEADS} leads.`}
            </p>
          </div>
        </>
      }
    />
  );
}
