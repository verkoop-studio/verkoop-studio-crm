import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase, isDatabaseConfigured } from "@/integrations/supabase/client";
import { safeNext } from "@/lib/auth-redirect";
import { routeWithoutWorkspace } from "@/lib/onboarding";
import {
  AuthSplit,
  Chain,
  GoogleMark,
  Or,
  PasswordField,
  fieldClass,
  primaryClass,
} from "@/components/AuthSplit";
import { SIBLING_PRODUCT as SIBLING } from "@/components/brand";
import { FREE_LEADS } from "@/lib/billing";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | Sales" },
      { name: "description", content: "Sign in to the Verkoop Studio sales workspace." },
      { property: "og:title", content: "Sign in | Sales" },
      { property: "og:type", content: "website" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { next?: string | undefined } =>
    typeof search["next"] === "string" ? { next: search["next"] } : {},
  component: () => (isDatabaseConfigured ? <SignIn /> : <NoDatabase />),
});

function NoDatabase() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-page p-8">
      <div className="panel max-w-lg p-8">
        <h1 className="text-[20px] font-bold tracking-[-0.045em] text-ink-strong">
          This workspace is still being set up
        </h1>
        <p className="mt-3 text-[13px] leading-[1.6] text-body">
          No database is configured for this build, so there is nothing to sign in to yet. Once it
          is connected, this is where you come in.
        </p>
      </div>
    </main>
  );
}

/*
 * Signing in is its own page now, and so is asking for an account.
 *
 * They used to be one form with a toggle, which made "create an account" look
 * like something you could just do — when in fact an account is given out by
 * an admin at your own company. The two doors at the foot of this page are
 * deliberately not alike: one is a sentence, the other is a panel, because
 * they lead to completely different places.
 */
function SignIn() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { next } = Route.useSearch();
  const redirectTo = safeNext(next);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);

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

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      if (redirectTo) window.location.href = redirectTo;
      else navigate({ to: "/dashboard" });
    });
  }, [navigate, redirectTo]);

  const afterAuth = async () => {
    await queryClient.invalidateQueries();
    if (redirectTo) {
      window.location.href = redirectTo;
      return;
    }
    const { data: companies } = await supabase.rpc("list_my_companies");
    if (companies && companies.length > 0) {
      navigate({ to: "/dashboard" });
      return;
    }
    // No workspace is not one situation. Someone who signed themselves up is
    // picking up a set-up they were interrupted in; only someone who asked an
    // administrator for access is actually waiting.
    const { data: auth } = await supabase.auth.getUser();
    navigate({ to: routeWithoutWorkspace(auth.user) });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await afterAuth();
  };

  const google = async () => {
    const callback = new URL("/auth", window.location.origin);
    if (redirectTo) callback.searchParams.set("next", redirectTo);
    const result = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });
    if (result.error) toast.error("Google sign-in failed. Try your email instead.");
  };

  const sendReset = async () => {
    if (!email.trim()) {
      toast.error("Put your work email in first, then press Forgot it.");
      return;
    }
    setResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Check your email. The link in it lets you choose a new password.");
  };

  return (
    <AuthSplit
      left={
        <>
          <h1 className="m-0 max-w-[22ch] text-balance text-[31px] font-bold leading-[1.2] tracking-[-0.055em] text-white">
            From first hello to closed deal.
          </h1>

          <Chain
            items={[
              {
                title: "A form on your site, at 23:40",
                note: "lands in New, with the campaign it came from",
                icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M2 12h20M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",
              },
              {
                title: "You call them on Tuesday",
                note: "logged in one tap, the follow-up clock resets",
                icon: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z",
              },
              {
                title: "The quote goes out",
                note: "the file lives on the lead, not in your mailbox",
                icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h4",
              },
              {
                title: "Won, and the deal has a value",
                note: `and ${SIBLING} finally credits the ad that started it`,
                icon: "m5 13 4 4L19 7",
              },
            ]}
          />

          <div className="mt-auto flex flex-col gap-3">
            <p className="m-0 text-[13px] leading-[1.65] text-dark-text">
              A deal you win here goes back to {SIBLING} as revenue, so the ad that started it
              finally gets the credit.
            </p>
            <p className="m-0 border-t border-dark-line pt-3.5 text-[12px] leading-[1.6] text-dark-muted">
              Invited by someone on your team? Open the link in the invitation instead. It puts you
              straight into the right company.
            </p>
          </div>
        </>
      }
      right={
        <>
          <div className="flex flex-col gap-1.5">
            <h2 className="m-0 text-[24px] font-bold tracking-[-0.05em] text-ink-strong">
              Welcome back.
            </h2>
            <p className="m-0 text-[13px] text-body-quiet">
              Sign in to the Verkoop Studio sales workspace.
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
                Continue with Google
              </button>
              <Or />
            </>
          )}

          <form onSubmit={submit} className="flex flex-col gap-3.5">
            <span className="flex flex-col gap-1.5">
              <label htmlFor="au-email" className="text-[12px] font-semibold text-body">
                Work email
              </label>
              <input
                id="au-email"
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
              <span className="flex items-baseline gap-2.5">
                <label htmlFor="au-pw" className="text-[12px] font-semibold text-body">
                  Password
                </label>
                <button
                  type="button"
                  disabled={resetting}
                  onClick={sendReset}
                  className="ml-auto text-[12px] font-semibold text-link"
                >
                  {resetting ? "Sending…" : "Forgot it?"}
                </button>
              </span>
              <PasswordField
                id="au-pw"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                placeholder="Your password"
                shown={shown}
                onToggle={() => setShown(!shown)}
              />
            </span>

            <button
              type="submit"
              disabled={busy}
              className={primaryClass}
              style={{ background: "var(--vsp-accent)" }}
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <span className="flex items-start gap-2.5 rounded-panel-inner bg-good-wash px-3.5 py-3">
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
              className="mt-px shrink-0"
            >
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            <span className="text-[12px] leading-[1.6] text-good">
              You only see the companies you were given access to. Switching between them never
              mixes their leads.
            </span>
          </span>

          {/* Two doors, and they are not alike. */}
          <div className="flex flex-col gap-3.5 border-t border-hairline pt-4">
            <p className="m-0 text-[13px] text-body-quiet">
              Your team already uses this?{" "}
              <Link to="/request-access" className="font-semibold">
                Ask them for an account
              </Link>
              .
            </p>
            <Link
              to="/onboarding/account"
              className="flex items-center gap-3 rounded-panel border border-accent-tint-line bg-accent-tint-quiet px-4 py-3.5 no-underline"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[13px] font-semibold text-ink">Nobody here uses it yet?</span>
                <span className="text-[12px] text-body-quiet">
                  {`Start a company, free up to ${FREE_LEADS} leads`}
                </span>
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--vsp-accent-ink)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="shrink-0"
              >
                <path d="M5 12h13M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </>
      }
    />
  );
}
