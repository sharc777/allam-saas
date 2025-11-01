import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PerformanceData {
  questionHash: string;
  topic: string;
  section: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isCorrect: boolean;
  timeSpentSeconds: number;
  metadata?: any;
}

export const usePerformanceTracking = () => {
  return useMutation({
    mutationFn: async (data: PerformanceData) => {
      console.log('📝 Tracking performance:', data);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const { data: result, error } = await supabase
        .from("user_performance_history")
        .insert({
          user_id: user.id,
          question_hash: data.questionHash,
          topic: data.topic,
          section: data.section,
          difficulty: data.difficulty,
          is_correct: data.isCorrect,
          time_spent_seconds: data.timeSpentSeconds,
          attempted_at: new Date().toISOString(),
          metadata: data.metadata || {}
        });

      if (error) {
        console.error('❌ Performance tracking error:', error);
        throw error;
      }
      
      console.log('✅ Performance tracked successfully');
      return result;
    },
    onError: (error: any) => {
      console.error('Performance tracking failed:', error);
      // Silent failure - don't show error to user
    }
  });
};

// Helper function to generate question hash
export function generateQuestionHash(questionText: string, options: any): string {
  const combined = questionText + JSON.stringify(options);
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
