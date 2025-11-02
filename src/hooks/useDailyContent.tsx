import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook لجلب المحتوى اليومي (القدرات فقط)
 */
export const useDailyContent = (dayNumber: number) => {
  return useQuery({
    queryKey: ["daily-content", dayNumber],
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_content")
        .select("*")
        .eq("day_number", dayNumber)
        .eq("is_published", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
};
