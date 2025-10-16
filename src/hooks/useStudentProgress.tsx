import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useStudentProgress = (userId?: string) => {
  return useQuery({
    queryKey: ["student-progress", userId],
    queryFn: async () => {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!targetUserId) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("student_progress")
        .select("*")
        .eq("user_id", targetUserId);

      if (error) throw error;
      return data;
    },
    enabled: !!userId || true,
  });
};
