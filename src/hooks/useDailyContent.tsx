import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TestType = Database["public"]["Enums"]["test_type"];
type AcademicTrack = Database["public"]["Enums"]["academic_track"];

export const useDailyContent = (
  dayNumber: number, 
  testType?: TestType, 
  track?: AcademicTrack
) => {
  return useQuery({
    queryKey: ["daily-content", dayNumber, testType, track],
    queryFn: async () => {
      let query = supabase
        .from("daily_content")
        .select("*")
        .eq("day_number", dayNumber)
        .eq("is_published", true);

      if (testType) {
        query = query.eq("test_type", testType);
      }
      
      if (track) {
        query = query.eq("track", track);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: dayNumber > 0,
  });
};
