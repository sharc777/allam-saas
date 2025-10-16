import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Question {
  question_text: string;
  options: string[];
  correct_answer: string;
  user_answer?: string;
  is_correct?: boolean;
  topic?: string;
  explanation?: string;
  difficulty?: string;
  subject?: string;
}

interface Exercise {
  id: string;
  questions: Question[];
  score: number;
  total_questions: number;
  section_type: string;
  created_at: string;
}

interface WeaknessAnalysis {
  summary: {
    totalExercises: number;
    totalMistakes: number;
    improvementRate: number;
    recentPerformance: number;
  };
  weaknesses: {
    critical: Array<{ topic: string; errorCount: number; successRate: number }>;
    moderate: Array<{ topic: string; errorCount: number; successRate: number }>;
    improving: Array<{ topic: string; errorCount: number; successRate: number }>;
  };
  repeatedMistakes: Array<{
    topic: string;
    errorCount: number;
    commonMistakes: string[];
    examples: Array<{
      question: string;
      wrongAnswer: string;
      correctAnswer: string;
      explanation: string;
    }>;
  }>;
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Authentication failed");
    }

    const { userId, testType, timeRange = 30 } = await req.json();
    const targetUserId = userId || user.id;

    console.log(`📊 Analyzing weaknesses for user: ${targetUserId}`);

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);

    // Fetch all exercises for the user
    const { data: exercises, error: exercisesError } = await supabase
      .from("daily_exercises")
      .select("*")
      .eq("user_id", targetUserId)
      .eq("test_type", testType)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (exercisesError) throw exercisesError;

    if (!exercises || exercises.length === 0) {
      return new Response(
        JSON.stringify({
          summary: { totalExercises: 0, totalMistakes: 0, improvementRate: 0, recentPerformance: 0 },
          weaknesses: { critical: [], moderate: [], improving: [] },
          repeatedMistakes: [],
          recommendations: ["ابدأ بحل التمارين لتحليل نقاط ضعفك"],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Analyze exercises
    const analysis = analyzeExercises(exercises as Exercise[]);

    console.log(`✅ Analysis complete: ${analysis.summary.totalMistakes} mistakes found`);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function analyzeExercises(exercises: Exercise[]): WeaknessAnalysis {
  const topicStats: Record<string, { correct: number; incorrect: number; mistakes: Array<{
    question: string;
    wrongAnswer: string;
    correctAnswer: string;
    explanation: string;
  }> }> = {};

  let totalMistakes = 0;
  let recentScores: number[] = [];

  // Process each exercise
  exercises.forEach((exercise, index) => {
    const exerciseScore = (exercise.score / exercise.total_questions) * 100;
    recentScores.push(exerciseScore);

    // Process each question
    if (exercise.questions && Array.isArray(exercise.questions)) {
      exercise.questions.forEach((question: Question) => {
        const topic = question.topic || question.subject || exercise.section_type || "غير محدد";
        
        if (!topicStats[topic]) {
          topicStats[topic] = { correct: 0, incorrect: 0, mistakes: [] };
        }

        if (question.is_correct === false || 
            (question.user_answer && question.user_answer !== question.correct_answer)) {
          topicStats[topic].incorrect++;
          totalMistakes++;
          
          // Store mistake example (limit to 3 per topic)
          if (topicStats[topic].mistakes.length < 3) {
            topicStats[topic].mistakes.push({
              question: question.question_text || "سؤال غير متوفر",
              wrongAnswer: question.user_answer || "غير محدد",
              correctAnswer: question.correct_answer || "غير محدد",
              explanation: question.explanation || "يرجى مراجعة المفهوم",
            });
          }
        } else if (question.is_correct === true || 
                   (question.user_answer && question.user_answer === question.correct_answer)) {
          topicStats[topic].correct++;
        }
      });
    }
  });

  // Calculate improvement rate
  const improvementRate = calculateImprovementRate(recentScores);
  const recentPerformance = recentScores.length > 0 
    ? recentScores.slice(0, 5).reduce((a, b) => a + b, 0) / Math.min(5, recentScores.length)
    : 0;

  // Categorize weaknesses
  const critical: Array<{ topic: string; errorCount: number; successRate: number }> = [];
  const moderate: Array<{ topic: string; errorCount: number; successRate: number }> = [];
  const improving: Array<{ topic: string; errorCount: number; successRate: number }> = [];

  Object.entries(topicStats).forEach(([topic, stats]) => {
    const total = stats.correct + stats.incorrect;
    if (total === 0) return;

    const successRate = (stats.correct / total) * 100;
    const errorCount = stats.incorrect;

    const topicData = { topic, errorCount, successRate };

    if (successRate < 40) {
      critical.push(topicData);
    } else if (successRate < 60) {
      moderate.push(topicData);
    } else if (successRate < 75) {
      improving.push(topicData);
    }
  });

  // Sort by error count
  critical.sort((a, b) => b.errorCount - a.errorCount);
  moderate.sort((a, b) => b.errorCount - a.errorCount);
  improving.sort((a, b) => b.errorCount - a.errorCount);

  // Build repeated mistakes list
  const repeatedMistakes = Object.entries(topicStats)
    .filter(([_, stats]) => stats.incorrect >= 2)
    .map(([topic, stats]) => ({
      topic,
      errorCount: stats.incorrect,
      commonMistakes: extractCommonMistakes(stats.mistakes),
      examples: stats.mistakes,
    }))
    .sort((a, b) => b.errorCount - a.errorCount);

  // Generate recommendations
  const recommendations = generateRecommendations(critical, moderate, improving, improvementRate);

  return {
    summary: {
      totalExercises: exercises.length,
      totalMistakes,
      improvementRate,
      recentPerformance,
    },
    weaknesses: {
      critical: critical.slice(0, 5),
      moderate: moderate.slice(0, 5),
      improving: improving.slice(0, 5),
    },
    repeatedMistakes: repeatedMistakes.slice(0, 10),
    recommendations,
  };
}

function calculateImprovementRate(scores: number[]): number {
  if (scores.length < 2) return 0;

  const recentScores = scores.slice(0, Math.min(5, scores.length));
  const olderScores = scores.slice(Math.min(5, scores.length), Math.min(10, scores.length));

  if (olderScores.length === 0) return 0;

  const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;

  return Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
}

function extractCommonMistakes(mistakes: Array<{ question: string; wrongAnswer: string }>): string[] {
  // Simple heuristic: group by similar wrong answers
  const mistakePatterns: Record<string, number> = {};
  
  mistakes.forEach(mistake => {
    if (mistake.wrongAnswer && mistake.wrongAnswer !== "غير محدد") {
      mistakePatterns[mistake.wrongAnswer] = (mistakePatterns[mistake.wrongAnswer] || 0) + 1;
    }
  });

  return Object.entries(mistakePatterns)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([pattern]) => `اختيار "${pattern}" بشكل متكرر`);
}

function generateRecommendations(
  critical: Array<{ topic: string; errorCount: number }>,
  moderate: Array<{ topic: string; errorCount: number }>,
  improving: Array<{ topic: string; errorCount: number }>,
  improvementRate: number
): string[] {
  const recommendations: string[] = [];

  if (critical.length > 0) {
    recommendations.push(
      `🔴 ركز بشكل عاجل على: ${critical[0].topic} - ${critical[0].errorCount} أخطاء متكررة`
    );
  }

  if (critical.length > 1) {
    recommendations.push(
      `⚠️ يحتاج اهتماماً: ${critical[1].topic} - راجع المفاهيم الأساسية`
    );
  }

  if (moderate.length > 0) {
    recommendations.push(
      `🟡 تدرب أكثر على: ${moderate[0].topic} - قريب من الإتقان`
    );
  }

  if (improving.length > 0) {
    recommendations.push(
      `🟢 واصل التحسن في: ${improving[0].topic} - أداء جيد!`
    );
  }

  if (improvementRate > 10) {
    recommendations.push(`📈 معدل تحسنك ممتاز: +${improvementRate}% - استمر!`);
  } else if (improvementRate < -10) {
    recommendations.push(`📉 انتبه! أداءك تراجع: ${improvementRate}% - راجع المواضيع الأساسية`);
  }

  if (recommendations.length === 0) {
    recommendations.push("👍 أداءك جيد - واصل التمارين اليومية للحفاظ على مستواك");
  }

  return recommendations;
}
