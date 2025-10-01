import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAllProgress = () => {
  return useQuery({
    queryKey: ["all-progress"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("student_progress")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      // Calculate completed lessons
      const completedLessons = data.filter(p => p.content_completed).length;
      
      return {
        allProgress: data,
        completedLessons,
      };
    },
  });
};
