import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mark } from "@/components/brand";
import { PasswordField, passwordStrength, primaryClass } from "@/components/AuthSplit";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Choose a new password | Sales" }] }),
  component: ResetPassword,
});

/**
 * Where the "Forgot it?" email lands. Supabase puts a recovery session in
 * place when the link opens, which is the only thing that lets this page set
 * a new password; without one it says so instead of pretending.
 */
function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<"checking" | "yes" | "no">("checking");
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const strength = passwordStrength(password);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady("yes");
    });
    void supabase.auth.getSession().then(({ data }) => {
      setReady((current) => (data.session ? "yes" : current === "yes" ? "yes" : "no"));
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("New password saved.");
    navigate({ to: "/dashboard" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-4 py-12">
      <div className="panel flex w-full max-w-[420px] flex-col gap-4 p-7">
        <Mark size={32} />
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[22px] font-bold tracking-[-0.05em] text-ink-strong">
            Choose a new password.
          </h1>
          <p className="m-0 text-[13px] text-body-quiet">
            {ready === "no"
              ? "This link has expired or was already used. Ask for a new one from the sign-in page."
              : "Pick something you have not used anywhere else. You stay signed in afterwards."}
          </p>
        </div>

        {ready === "yes" && (
          <form onSubmit={submit} className="flex flex-col gap-3.5">
            <span className="flex flex-col gap-1.5">
              <label htmlFor="new-pw" className="text-[12px] font-semibold text-body">
                New password
              </label>
              <PasswordField
                id="new-pw"
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
              disabled={busy || password.length < 12}
              className={primaryClass}
              style={{ background: "var(--vsp-accent)" }}
            >
              {busy ? "Saving…" : "Save it and go in"}
            </button>
          </form>
        )}

        {ready === "no" && (
          <button
            type="button"
            onClick={() => navigate({ to: "/auth" })}
            className={primaryClass}
            style={{ background: "var(--vsp-accent)" }}
          >
            Back to signing in
          </button>
        )}
      </div>
    </main>
  );
}
