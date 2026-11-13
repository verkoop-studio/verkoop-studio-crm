import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase, isDatabaseConfigured } from "@/integrations/supabase/client";
import { initializeCompany, getCompanyId } from "@/lib/company-context";
import { routeWithoutWorkspace } from "@/lib/onboarding";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    if (!isDatabaseConfigured) throw redirect({ to: "/auth" });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const previousCompany = getCompanyId();
    const selectedCompany = await initializeCompany(supabase, data.user.id);
    if (previousCompany !== selectedCompany?.id) context.queryClient.clear();
    if (!selectedCompany) {
      const fullName = (data.user.user_metadata?.["full_name"] as string | undefined) ?? null;
      await supabase
        .from("profiles")
        .upsert(
          { id: data.user.id, email: data.user.email ?? null, full_name: fullName },
          { onConflict: "id", ignoreDuplicates: true },
        );
      // Someone who signed themselves up has no workspace because they have
      // not finished making one, not because an administrator has yet to say
      // yes. Filing an access request for them would put a founder in their
      // own approval queue, so the request is written only on the path that
      // asks for one.
      const destination = routeWithoutWorkspace(data.user);
      if (destination === "/onboarding/company") throw redirect({ to: destination });
      if (data.user.email) {
        const { data: existingRequest } = await supabase
          .from("account_requests")
          .select("id")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (!existingRequest) {
          await supabase.from("account_requests").insert({
            user_id: data.user.id,
            email: data.user.email,
            full_name: fullName,
          });
        }
      }
      throw redirect({ to: destination });
    }
    return { user: data.user, company: selectedCompany };
  },
  component: CompanyLayout,
});

function CompanyLayout() {
  const { company } = Route.useRouteContext();
  return (
    <AppShell key={company.id}>
      <Outlet />
    </AppShell>
  );
}
