import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AISettings {
  quiz_limits?: {
    min_questions: number;
    max_questions: number;
    default_questions: number;
  };
  quiz_model?: {
    model: string;
  };
  quiz_generation_temperature?: {
    temperature: number;
  };
  system_prompt?: {
    ar: string;
  };
}

export const useAISettings = () => {
  return useQuery({
    queryKey: ["ai-settings"],
    staleTime: 5 * 60 * 1000, // 5 minutes - AI settings don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes (garbage collection time)
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_settings")
        .select("*");

      if (error) throw error;

      const settings: Record<string, any> = {};
      data?.forEach((setting) => {
        settings[setting.setting_key] = setting.setting_value;
      });

      return settings as AISettings;
    },
  });
};
