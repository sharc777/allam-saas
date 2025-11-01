import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PerformanceData {
  questionHash: string;
  questionText: string;
  topicName: string;
  section: string;
  testType: string;
  difficulty: string;
  testId?: string;
  testTypeCategory: 'daily_exercise' | 'custom_test' | 'weakness_practice' | 'quiz';
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  confidenceLevel?: number;
  metadata?: any;
}

export const usePerformanceTracking = () => {
  return useMutation({
    mutationFn: async (data: PerformanceData) => {
      console.log('📝 Tracking performance:', data);
      
      const { data: result, error } = await supabase
        .from("user_performance_history")
        .insert({
          question_hash: data.questionHash,
          question_text: data.questionText,
          topic_name: data.topicName,
          section: data.section,
          test_type: data.testType,
          difficulty: data.difficulty,
          test_id: data.testId,
          test_type_category: data.testTypeCategory,
          user_answer: data.userAnswer,
          correct_answer: data.correctAnswer,
          is_correct: data.isCorrect,
          time_spent_seconds: data.timeSpentSeconds,
          confidence_level: data.confidenceLevel,
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
