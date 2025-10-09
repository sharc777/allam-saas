import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export const useSubscription = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { subscribed: false };

      const { data: subscriptionData, error } = await supabase.functions.invoke(
        "check-subscription"
      );

      if (error) {
        console.error("Error checking subscription:", error);
        // Return minimal data on error to prevent UI breaks
        return { subscribed: false, product_id: null, subscription_end: null };
      }

      return subscriptionData || { subscribed: false, product_id: null, subscription_end: null };
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Refetch on page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refetch();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [refetch]);

  return {
    subscribed: data?.subscribed || false,
    productId: data?.product_id,
    subscriptionEnd: data?.subscription_end,
    isLoading,
    refetch,
  };
};
