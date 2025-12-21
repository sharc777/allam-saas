import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { rateLimiter } from "../_shared/rateLimit.ts";
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
    avgTime: number | string;
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
  sourceCounts: {
    performanceCount: number;
    exercisesCount: number;
    quizCount: number;
  };
  thresholds: {
    minAttemptsForStrength: number;
    minSuccessRateForStrength: number;
    minSuccessRateForPromising: number;
  };
  promisingTopics: Array<{ topic: string; successRate: number; attempts: number }>;
  isSparseData: boolean;
}

serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 [Analyze Weaknesses] Function started');
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error('❌ [Analyze Weaknesses] Missing authorization header');
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Missing authorization header" }),
        { 
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ [Analyze Weaknesses] Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Authentication failed" }),
        { 
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log(`✅ [Analyze Weaknesses] User authenticated: ${user.email}`);

    // ✅ Rate limiting - 10 requests per minute per user
    if (!rateLimiter.check(user.id, 10, 60000)) {
      console.warn(`⚠️ [Analyze Weaknesses] Rate limit exceeded for user: ${user.id}`);
      return new Response(
        JSON.stringify({ error: "تم تجاوز الحد المسموح. يرجى الانتظار دقيقة." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { userId, timeRange = 30 } = body || {};
    const targetUserId = userId || user.id;

    console.log(`📊 [Analyze Weaknesses] Analyzing for user: ${targetUserId}, timeRange: ${timeRange} days`);

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);

    // Fetch data from multiple sources (no test_type/track filters)
    const [performanceHistory, weaknessProfile, exercises, quizResults] = await Promise.all([
      supabase
        .from("user_performance_history")
        .select("*")
        .eq("user_id", targetUserId)
        .gte("attempted_at", startDate.toISOString())
        .order("attempted_at", { ascending: false }),
      supabase
        .from("user_weakness_profile")
        .select("*")
        .eq("user_id", targetUserId)
        .order("weakness_score", { ascending: false }),
      supabase
        .from("daily_exercises")
        .select("*")
        .eq("user_id", targetUserId)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false }),
      supabase
        .from("quiz_results")
        .select("*")
        .eq("user_id", targetUserId)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false }),
    ]);

    if (performanceHistory.error) throw performanceHistory.error;
    if (weaknessProfile.error) throw weaknessProfile.error;
    if (exercises.error) throw exercises.error;
    if (quizResults.error) throw quizResults.error;

    const performanceData = performanceHistory.data || [];
    const weaknessData = weaknessProfile.data || [];
    const exerciseData = exercises.data || [];
    const quizData = quizResults.data || [];

    console.log(`📊 [Analyze Weaknesses] Data sources: Performance=${performanceData.length}, Exercises=${exerciseData.length}, Quiz=${quizData.length}, WeaknessProfile=${weaknessData.length}`);

    if (performanceData.length === 0 && exerciseData.length === 0 && quizData.length === 0) {
      console.log('⚠️ [Analyze Weaknesses] No data found for analysis');
      return new Response(
        JSON.stringify({
          summary: { 
            totalExercises: 0, 
            totalMistakes: 0, 
            improvementRate: 0, 
            recentPerformance: 0, 
            avgTime: 0 
          },
          weaknesses: { critical: [], moderate: [], improving: [] },
          strengths: [],
          repeatedMistakes: [],
          recommendations: [
              "ابدأ بحل 5 أسئلة على الأقل في موضوع واحد لتظهر القوة",
              "أكمل تمريناً يومياً لتحليل أدائك"
          ],
          weaknessProfile: [],
          isEmpty: true,
          sourceCounts: { performanceCount: 0, exercisesCount: 0, quizCount: 0 },
          thresholds: { minAttemptsForStrength: 3, minSuccessRateForStrength: 80, minSuccessRateForPromising: 70 },
          promisingTopics: [],
          isSparseData: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Analyze using all data sources (including quiz results)
    const analysis = analyzeComprehensively(exerciseData as Exercise[], performanceData, weaknessData, quizData);

    const duration = Date.now() - startTime;
    console.log(`✅ [Analyze Weaknesses] Analysis complete in ${duration}ms:`, {
      totalMistakes: analysis.summary.totalMistakes,
      performanceRecords: performanceData.length,
      weaknessRecords: weaknessData.length,
      criticalWeaknesses: analysis.weaknesses.critical.length,
      moderateWeaknesses: analysis.weaknesses.moderate.length,
      strengths: analysis.strengths.length,
      promisingTopics: analysis.promisingTopics.length,
      isSparseData: analysis.isSparseData,
    });

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Analyze Weaknesses] Error after ${duration}ms:`, error);
    const errorMessage = error instanceof Error ? error.message : "حدث خطأ غير متوقع";
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function analyzeComprehensively(
  exercises: Exercise[], 
  performanceHistory: any[], 
  weaknessProfile: any[],
  quizResults: any[] = []
): WeaknessAnalysis & { weaknessProfile: any[], strengths: string[], isEmpty?: boolean } {
  const topicStats: Record<string, { 
    correct: number; 
    incorrect: number; 
    totalTime: number;
    attempts: number;
    mistakes: Array<{
      question: string;
      wrongAnswer: string;
      correctAnswer: string;
      explanation: string;
    }> 
  }> = {};

  let totalMistakes = 0;
  let recentScores: number[] = [];
  let totalTimeSpent = 0;
  const strengthTopics = new Set<string>();
  const promisingTopics: Array<{ topic: string; successRate: number; attempts: number }> = [];
  
  // Constants for thresholds
  const MIN_ATTEMPTS_FOR_STRENGTH = 3;
  const MIN_SUCCESS_RATE_FOR_STRENGTH = 80;
  const MIN_SUCCESS_RATE_FOR_PROMISING = 70;

  // Process performance history (primary source) with de-duplication per exercise/question
  const seenPerformanceKeys = new Set<string>();
  for (const record of performanceHistory) {
    const key = `${record.question_hash || ''}:${record.metadata?.exercise_id || 'na'}`;
    if (seenPerformanceKeys.has(key)) continue;
    seenPerformanceKeys.add(key);

    const topic = record.topic || "غير محدد";
    if (!topicStats[topic]) {
      topicStats[topic] = { correct: 0, incorrect: 0, totalTime: 0, attempts: 0, mistakes: [] };
    }

    topicStats[topic].attempts++;
    topicStats[topic].totalTime += record.time_spent_seconds || 0;
    totalTimeSpent += record.time_spent_seconds || 0;

    if (record.is_correct) {
      topicStats[topic].correct++;
    } else {
      topicStats[topic].incorrect++;
      totalMistakes++;
      
      if (topicStats[topic].mistakes.length < 3) {
        topicStats[topic].mistakes.push({
          question: record.question_text || "سؤال غير متوفر",
          wrongAnswer: record.user_answer || "غير محدد",
          correctAnswer: record.correct_answer || "غير محدد",
          explanation: record.explanation || "يرجى مراجعة المفهوم",
        });
      }
    }

    // Calculate score for recent performance
    const score = record.is_correct ? 100 : 0;
    recentScores.push(score);
  }

  // Process each exercise (supplementary source)
  exercises.forEach((exercise, index) => {
    const exerciseScore = (exercise.score / exercise.total_questions) * 100;
    recentScores.push(exerciseScore);

    // Process each question
    if (exercise.questions && Array.isArray(exercise.questions)) {
      exercise.questions.forEach((question: Question) => {
        const topic = question.topic || question.subject || exercise.section_type || "غير محدد";
        
        if (!topicStats[topic]) {
          topicStats[topic] = { correct: 0, incorrect: 0, totalTime: 0, attempts: 0, mistakes: [] };
        }

        topicStats[topic].attempts++;

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

  // Process quiz results (fallback source)
  quizResults.forEach((quiz) => {
    const quizScore = Number(quiz.percentage || 0);
    recentScores.push(quizScore);

    // Extract strengths and weaknesses from quiz
    if (quiz.strengths && Array.isArray(quiz.strengths)) {
      quiz.strengths.forEach((strength: string) => strengthTopics.add(strength));
    }

    // Process questions from quiz if available
    if (quiz.questions && Array.isArray(quiz.questions)) {
      quiz.questions.forEach((question: any) => {
        const topic = question.topic || question.subject || "غير محدد";
        
        if (!topicStats[topic]) {
          topicStats[topic] = { correct: 0, incorrect: 0, totalTime: 0, attempts: 0, mistakes: [] };
        }

        topicStats[topic].attempts++;

        if (question.is_correct === false || 
            (question.user_answer && question.user_answer !== question.correct_answer)) {
          topicStats[topic].incorrect++;
          totalMistakes++;
          
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

    // Add weaknesses from quiz to topic stats
    if (quiz.weaknesses && Array.isArray(quiz.weaknesses)) {
      quiz.weaknesses.forEach((weakness: string) => {
        if (!topicStats[weakness]) {
          topicStats[weakness] = { correct: 0, incorrect: 0, totalTime: 0, attempts: 0, mistakes: [] };
        }
      });
    }
  });

  // Calculate improvement rate and performance metrics
  const improvementRate = calculateImprovementRate(recentScores);
  const recentPerformance = recentScores.length > 0 
    ? recentScores.slice(0, 5).reduce((a, b) => a + b, 0) / Math.min(5, recentScores.length)
    : 0;
  
  const avgTime = totalTimeSpent > 0 && performanceHistory.length > 0
    ? (totalTimeSpent / performanceHistory.length).toFixed(1)
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
    const avgTopicTime = stats.attempts > 0 ? (stats.totalTime / stats.attempts).toFixed(1) : 0;

    const topicData = { 
      topic, 
      errorCount, 
      successRate, 
      avgTime: avgTopicTime,
      attempts: stats.attempts 
    };

    // Categorize weaknesses
    if (successRate < 40) {
      critical.push(topicData);
    } else if (successRate < 60) {
      moderate.push(topicData);
    } else if (successRate < 75) {
      improving.push(topicData);
    }

    // Derive strengths from performance when attempts are sufficient
    if (stats.attempts >= MIN_ATTEMPTS_FOR_STRENGTH && successRate >= MIN_SUCCESS_RATE_FOR_STRENGTH) {
      strengthTopics.add(topic);
    }
    
    // Identify promising topics (70%+ success but fewer attempts)
    if (stats.attempts >= 1 && successRate >= MIN_SUCCESS_RATE_FOR_PROMISING && successRate < MIN_SUCCESS_RATE_FOR_STRENGTH) {
      promisingTopics.push({ topic, successRate, attempts: stats.attempts });
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

  // Enrich with weakness profile data
  const enrichedWeaknessProfile = weaknessProfile.map(w => ({
    topic: w.topic,
    section: w.section,
    weaknessScore: w.weakness_score,
    totalAttempts: w.total_attempts,
    correctAttempts: w.correct_attempts,
    incorrectAttempts: w.total_attempts - w.correct_attempts,
    avgTime: w.avg_time_seconds,
    lastAttempt: w.last_attempt,
    trend: w.trend,
    priority: w.priority,
  }));

  // Check if data is sparse (no topics with sufficient attempts)
  const topicsWithEnoughAttempts = Object.values(topicStats).filter(
    stats => stats.attempts >= MIN_ATTEMPTS_FOR_STRENGTH
  ).length;
  const isSparseData = topicsWithEnoughAttempts === 0;

  // Sort promising topics by success rate
  promisingTopics.sort((a, b) => b.successRate - a.successRate);

  return {
    summary: {
      totalExercises: exercises.length + performanceHistory.length + quizResults.length,
      totalMistakes,
      improvementRate,
      recentPerformance,
      avgTime: avgTime,
    },
    weaknesses: {
      critical: critical.slice(0, 5),
      moderate: moderate.slice(0, 5),
      improving: improving.slice(0, 5),
    },
    strengths: Array.from(strengthTopics),
    repeatedMistakes: repeatedMistakes.slice(0, 10),
    recommendations,
    weaknessProfile: enrichedWeaknessProfile,
    sourceCounts: {
      performanceCount: performanceHistory.length,
      exercisesCount: exercises.length,
      quizCount: quizResults.length,
    },
    thresholds: {
      minAttemptsForStrength: MIN_ATTEMPTS_FOR_STRENGTH,
      minSuccessRateForStrength: MIN_SUCCESS_RATE_FOR_STRENGTH,
      minSuccessRateForPromising: MIN_SUCCESS_RATE_FOR_PROMISING,
    },
    promisingTopics: promisingTopics.slice(0, 5),
    isSparseData,
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
