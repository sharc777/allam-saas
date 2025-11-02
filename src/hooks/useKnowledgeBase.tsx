import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UseKnowledgeBaseParams {
  testType?: "قدرات" | "تحصيلي";
  track?: "عام" | "علمي" | "نظري";
  sectionFilter?: string | null;
}

export const useKnowledgeBase = (params: UseKnowledgeBaseParams) => {
  const { testType, track, sectionFilter } = params;
  
  return useQuery({
    queryKey: ["knowledge-base", testType, track, sectionFilter],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (garbage collection time)
    enabled: !!testType && !!track, // Only fetch if params are provided
    queryFn: async () => {
      let query = supabase
        .from("knowledge_base")
        .select("*")
        .eq("is_active", true);

      if (testType) query = query.eq("test_type", testType);
      if (track) query = query.eq("track", track);

      const { data, error } = await (query.limit(20) as any);

      if (error) throw error;

      let knowledgeData = data || [];

      // Filter by section if specified
      if (sectionFilter && knowledgeData.length > 0) {
        const sectionKeyword = sectionFilter === "لفظي" ? "القسم اللفظي" : "القسم الكمي";
        const filtered = knowledgeData.filter(kb =>
          kb.related_topics?.some((rt: string) => rt.includes(sectionKeyword))
        );
        if (filtered.length > 0) knowledgeData = filtered;
      }

      return {
        topics: knowledgeData.map(kb => kb.title),
        count: knowledgeData.length,
        data: knowledgeData
      };
    },
  });
};
