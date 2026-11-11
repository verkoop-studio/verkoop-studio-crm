import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export const pipelineQueryKey = ["leads", "dashboard-pipeline"];

/**
 * Every lead in the workspace, read once and shared.
 *
 * This used to be two queries under two cache keys: one that asked the server
 * for the live leads, and one that asked for the live leads *and* the bin. Six
 * screens read the first, Leads reads the second, so moving between Leads and
 * anything else re-read all 184 rows from scratch every time, and the browser
 * held two copies of the same table that could disagree with each other.
 *
 * The bin is a handful of rows next to the pipeline, so there is nothing to be
 * saved by asking for it separately. One query fetches everything and the
 * filtering happens here, which means the dashboard, the flow, the library and
 * Settings all share a single cached read with Leads.
 */
export function usePipelineLeads(includeDeleted = false) {
  const query = useQuery({
    queryKey: pipelineQueryKey,
    queryFn: async () => {
      const rows: Lead[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .order("created_at", { ascending: false })
          .order("id")
          .range(offset, offset + 499);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 500) return rows;
      }
    },
    /*
     * Every screen in the product reads this one query, so it is the thing
     * most worth not re-fetching on sight. The dashboard's "Refreshed N min
     * ago" button is the deliberate way to pull again.
     */
    refetchInterval: 60_000,
    placeholderData: (previous) => previous,
  });

  const all = query.data;
  const data = useMemo(
    () => (includeDeleted ? all : all?.filter((lead) => !lead.deleted_at)),
    [all, includeDeleted],
  );

  return { ...query, data } as typeof query;
}
