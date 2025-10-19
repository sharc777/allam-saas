import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useQuizStats = () => {
  return useQuery({
    queryKey: ["quiz-stats"],
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("quiz_results")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculate statistics
      const totalQuizzes = data.length;
      const averageScore = totalQuizzes > 0
        ? data.reduce((sum, quiz) => sum + Number(quiz.percentage || 0), 0) / totalQuizzes
        : 0;

      // Get all strengths and weaknesses
      const allStrengths = data.flatMap(quiz => quiz.strengths || []);
      const allWeaknesses = data.flatMap(quiz => quiz.weaknesses || []);

      return {
        totalQuizzes,
        averageScore,
        recentResults: data.slice(0, 5),
        strengths: [...new Set(allStrengths)],
        weaknesses: [...new Set(allWeaknesses)],
      };
    },
  });
};
