import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useStudentProgress = (dayNumber?: number) => {
  return useQuery({
    queryKey: ["student-progress", dayNumber],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      if (dayNumber) {
        const { data, error } = await supabase
          .from("student_progress")
          .select("*")
          .eq("user_id", user.id)
          .eq("day_number", dayNumber)
          .maybeSingle();

        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from("student_progress")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data;
    },
  });
};
