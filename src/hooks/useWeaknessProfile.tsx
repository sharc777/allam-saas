import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WeaknessProfile {
  id: string;
  topic: string;
  section: string;
  user_id: string;
  weakness_score: number;
  total_attempts: number;
  correct_attempts: number;
  avg_time_seconds: number | null;
  last_attempt: string | null;
  priority: string;
  trend: string;
  created_at: string;
  updated_at: string;
}

interface WeaknessFilters {
  section?: string;
  test_type?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  limit?: number;
}

export const useWeaknessProfile = (userId?: string, filters?: WeaknessFilters) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch weakness profile
  const { data: weaknessProfile, isLoading, error, refetch } = useQuery({
    queryKey: ["weakness-profile", userId, filters],
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    enabled: !!userId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    queryFn: async () => {
      try {
        console.log('🎯 [Weakness Profile] Fetching data...', { userId, filters });
        
        const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
        if (!targetUserId) {
          console.error('❌ [Weakness Profile] User not authenticated');
          throw new Error("المستخدم غير مصادق عليه. يرجى تسجيل الدخول مرة أخرى.");
        }

        let query = supabase
          .from("user_weakness_profile" as any)
          .select("*")
          .eq("user_id", targetUserId)
          .order("weakness_score", { ascending: false });

        if (filters?.section) {
          query = query.eq("section", filters.section);
        }
        if (filters?.test_type) {
          query = query.eq("test_type", filters.test_type);
        }
        if (filters?.priority) {
          query = query.eq("priority", filters.priority);
        }
        if (filters?.limit) {
          query = query.limit(filters.limit);
        }

        const { data, error } = await query;

        if (error) {
          console.error('❌ [Weakness Profile] Database error:', error);
          throw new Error(`فشل في تحميل ملف نقاط الضعف: ${error.message}`);
        }

        console.log(`✅ [Weakness Profile] Loaded ${data?.length || 0} weaknesses`);
        return (data as any) as WeaknessProfile[];
      } catch (err) {
        console.error('❌ [Weakness Profile] Fetch error:', err);
        throw err;
      }
    },
  });

  // Get top weaknesses
  const getTopWeaknesses = (limit: number = 5): WeaknessProfile[] => {
    if (!weaknessProfile) return [];
    return weaknessProfile
      .sort((a, b) => b.weakness_score - a.weakness_score)
      .slice(0, limit);
  };

  // Get improving topics (positive trend)
  const getImprovingTopics = (): WeaknessProfile[] => {
    if (!weaknessProfile) return [];
    return weaknessProfile.filter(
      (w) => w.trend === 'improving' || w.trend === 'stable_good'
    );
  };

  // Get critical weaknesses
  const getCriticalWeaknesses = (): WeaknessProfile[] => {
    if (!weaknessProfile) return [];
    return weaknessProfile.filter((w) => w.priority === 'critical');
  };

  // Get weaknesses by section
  const getWeaknessesBySection = (section: string): WeaknessProfile[] => {
    if (!weaknessProfile) return [];
    return weaknessProfile.filter((w) => w.section === section);
  };

  // Track progress for a topic
  const trackProgressMutation = useMutation({
    mutationFn: async ({ topic, section }: { topic: string; section: string }) => {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!targetUserId) throw new Error("User not authenticated");

      // Fetch recent performance for this topic
      const { data: recentPerformance, error } = await supabase
        .from("user_performance_history" as any)
        .select("is_correct, time_spent_seconds, attempted_at")
        .eq("user_id", targetUserId)
        .eq("topic", topic)
        .eq("section", section)
        .order("attempted_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      return {
        topic,
        section,
        recentAttempts: recentPerformance?.length || 0,
        recentSuccessRate: recentPerformance
          ? (recentPerformance.filter((p: any) => p.is_correct).length / recentPerformance.length) * 100
          : 0,
      };
    },
    onSuccess: (data) => {
      toast({
        title: "تم تتبع التقدم",
        description: `الموضوع: ${data.topic} - معدل النجاح الأخير: ${data.recentSuccessRate.toFixed(1)}%`,
      });
      queryClient.invalidateQueries({ queryKey: ["weakness-profile"] });
    },
    onError: (error: any) => {
      console.error("Error tracking progress:", error);
      toast({
        title: "خطأ في تتبع التقدم",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update weakness score manually (admin use)
  const updateWeaknessScoreMutation = useMutation({
    mutationFn: async ({
      weaknessId,
      score,
    }: {
      weaknessId: string;
      score: number;
    }) => {
      const { data, error } = await supabase
        .from("user_weakness_profile" as any)
        .update({ weakness_score: score } as any)
        .eq("id", weaknessId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "تم تحديث درجة الضعف",
        description: "تم تحديث درجة الضعف بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["weakness-profile"] });
    },
    onError: (error: any) => {
      console.error("Error updating weakness score:", error);
      toast({
        title: "خطأ في التحديث",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    weaknessProfile,
    isLoading,
    error,
    refetch,
    getTopWeaknesses,
    getImprovingTopics,
    getCriticalWeaknesses,
    getWeaknessesBySection,
    trackProgress: trackProgressMutation.mutate,
    updateWeaknessScore: updateWeaknessScoreMutation.mutate,
    isTrackingProgress: trackProgressMutation.isPending,
    isUpdatingScore: updateWeaknessScoreMutation.isPending,
  };
};
