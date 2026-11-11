import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** The companies this person was given access to, newest selection first. */
export function useCompanies() {
  return useQuery({
    queryKey: ["my-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_my_companies");
      if (error) throw error;
      return data;
    },
  });
}
