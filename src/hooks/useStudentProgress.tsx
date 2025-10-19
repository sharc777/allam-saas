import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useStudentProgress = (userId?: string) => {
  return useQuery({
    queryKey: ["student-progress", userId],
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!userId, // Only run when userId is available
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
  });
};
