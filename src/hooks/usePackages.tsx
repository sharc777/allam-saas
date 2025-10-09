import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type SubscriptionPackage = Database["public"]["Tables"]["subscription_packages"]["Row"];

export const usePackages = (options?: { activeOnly?: boolean; featuredOnly?: boolean }) => {
  return useQuery({
    queryKey: ["subscription-packages", options],
    queryFn: async () => {
      let query = supabase
        .from("subscription_packages")
        .select("*")
        .order("display_order", { ascending: true });

      if (options?.activeOnly) {
        query = query.eq("is_active", true);
      }

      if (options?.featuredOnly) {
        query = query.eq("is_featured", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SubscriptionPackage[];
    },
  });
};
