import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useDailyContent = (dayNumber: number) => {
  return useQuery({
    queryKey: ["daily-content", dayNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_content")
        .select("*")
        .eq("day_number", dayNumber)
        .eq("is_published", true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: dayNumber > 0,
  });
};
