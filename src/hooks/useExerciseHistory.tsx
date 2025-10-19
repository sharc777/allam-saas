import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useExerciseHistory = (userId?: string) => {
  return useQuery({
    queryKey: ["exercise-history", userId],
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("daily_exercises")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
};

export const useExerciseDetails = (exerciseId?: string) => {
  return useQuery({
    queryKey: ["exercise-details", exerciseId],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!exerciseId) return null;
      
      const { data, error } = await supabase
        .from("daily_exercises")
        .select("*")
        .eq("id", exerciseId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!exerciseId,
  });
};
