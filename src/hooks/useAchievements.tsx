import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAchievements = () => {
  return useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("student_achievements")
        .select(`
          *,
          achievement:achievements(*)
        `)
        .eq("user_id", user.id)
        .order("unlocked_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      return data;
    },
  });
};
