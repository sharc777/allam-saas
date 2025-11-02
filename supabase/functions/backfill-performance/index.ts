import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    console.log('🔄 [Backfill Performance] Starting backfill process...');
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId = body.userId || user.id;
    
    // Only allow admin to backfill for other users
    if (targetUserId !== user.id) {
      const { data: roles } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      if (!roles || roles.role !== 'admin') {
        throw new Error("Only admins can backfill for other users");
      }
    }

    console.log(`📊 [Backfill Performance] Processing for user: ${targetUserId}`);

    // Get historical data (last 60 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 60);

    const [exercises, quizResults] = await Promise.all([
      supabaseClient
        .from("daily_exercises")
        .select("*")
        .eq("user_id", targetUserId)
        .gte("created_at", cutoffDate.toISOString())
        .order("created_at", { ascending: false }),
      supabaseClient
        .from("quiz_results")
        .select("*")
        .eq("user_id", targetUserId)
        .gte("created_at", cutoffDate.toISOString())
        .order("created_at", { ascending: false }),
    ]);

    if (exercises.error) throw exercises.error;
    if (quizResults.error) throw quizResults.error;

    const exerciseData = exercises.data || [];
    const quizData = quizResults.data || [];

    console.log(`📦 [Backfill Performance] Found ${exerciseData.length} exercises and ${quizData.length} quizzes`);

    let totalInserted = 0;
    let totalSkipped = 0;
    const topicStats: Record<string, { correct: number; total: number; totalTime: number }> = {};

    // Process exercises
    for (const exercise of exerciseData) {
      if (!exercise.questions || !Array.isArray(exercise.questions)) continue;
      
      const questions = exercise.questions as any[];
      
      for (const question of questions) {
        const questionHash = generateQuestionHash(
          question.question_text || '',
          question.options || []
        );

        // Check for existing record
        const { data: existing } = await supabaseClient
          .from("user_performance_history")
          .select("id")
          .eq("user_id", targetUserId)
          .eq("question_hash", questionHash)
          .contains("metadata", { exercise_id: exercise.id })
          .maybeSingle();

        if (existing) {
          totalSkipped++;
          continue;
        }

        const isCorrect = question.is_correct === true || 
                        (question.user_answer && question.user_answer === question.correct_answer);
        
        const topic = question.topic || question.subject || exercise.section_type || "غير محدد";
        const section = exercise.section_type || "عام";
        
        // Track for weakness profile
        if (!topicStats[topic]) {
          topicStats[topic] = { correct: 0, total: 0, totalTime: 0 };
        }
        topicStats[topic].total++;
        if (isCorrect) topicStats[topic].correct++;
        topicStats[topic].totalTime += Math.floor((exercise.time_taken_minutes || 0) * 60 / questions.length);

        // Insert performance history
        await supabaseClient.from("user_performance_history").insert({
          user_id: targetUserId,
          question_hash: questionHash,
          topic: topic,
          section: section,
          difficulty: question.difficulty || "medium",
          is_correct: isCorrect,
          time_spent_seconds: Math.floor((exercise.time_taken_minutes || 0) * 60 / questions.length),
          attempted_at: exercise.created_at,
          metadata: {
            exercise_id: exercise.id,
            exercise_type: exercise.exercise_type || "daily",
            backfilled: true,
          }
        });

        totalInserted++;
      }
    }

    // Process quiz results
    for (const quiz of quizData) {
      if (!quiz.questions || !Array.isArray(quiz.questions)) continue;
      
      const questions = quiz.questions as any[];
      
      for (const question of questions) {
        const questionHash = generateQuestionHash(
          question.question_text || '',
          question.options || []
        );

        // Check for existing record
        const { data: existing } = await supabaseClient
          .from("user_performance_history")
          .select("id")
          .eq("user_id", targetUserId)
          .eq("question_hash", questionHash)
          .contains("metadata", { quiz_id: quiz.id })
          .maybeSingle();

        if (existing) {
          totalSkipped++;
          continue;
        }

        const isCorrect = question.is_correct === true || 
                        (question.user_answer && question.user_answer === question.correct_answer);
        
        const topic = question.topic || question.subject || "غير محدد";
        
        // Track for weakness profile
        if (!topicStats[topic]) {
          topicStats[topic] = { correct: 0, total: 0, totalTime: 0 };
        }
        topicStats[topic].total++;
        if (isCorrect) topicStats[topic].correct++;

        // Insert performance history
        await supabaseClient.from("user_performance_history").insert({
          user_id: targetUserId,
          question_hash: questionHash,
          topic: topic,
          section: "quiz",
          difficulty: question.difficulty || "medium",
          is_correct: isCorrect,
          time_spent_seconds: Math.floor((quiz.time_taken_minutes || 0) * 60 / questions.length),
          attempted_at: quiz.completed_at || quiz.created_at,
          metadata: {
            quiz_id: quiz.id,
            quiz_mode: quiz.quiz_mode,
            backfilled: true,
          }
        });

        totalInserted++;
      }
    }

    console.log(`✅ [Backfill Performance] Inserted ${totalInserted} records, skipped ${totalSkipped} duplicates`);

    // Update weakness profile for all topics
    console.log(`📊 [Backfill Performance] Updating weakness profile for ${Object.keys(topicStats).length} topics...`);
    
    for (const [topic, stats] of Object.entries(topicStats)) {
      const successRate = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
      const weaknessScore = 100 - successRate;
      
      let priority: string;
      if (weaknessScore >= 70) priority = 'critical';
      else if (weaknessScore >= 50) priority = 'high';
      else if (weaknessScore >= 30) priority = 'medium';
      else priority = 'low';

      let trend: string;
      if (successRate >= 80) trend = 'improving';
      else if (successRate >= 60) trend = 'stable_good';
      else if (successRate >= 40) trend = 'stable';
      else trend = 'declining';

      // Check if record exists
      const { data: existing } = await supabaseClient
        .from("user_weakness_profile")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("topic", topic)
        .maybeSingle();

      const weaknessData = {
        user_id: targetUserId,
        topic: topic,
        section: "عام",
        weakness_score: weaknessScore,
        total_attempts: stats.total,
        correct_attempts: stats.correct,
        avg_time_seconds: stats.total > 0 ? Math.floor(stats.totalTime / stats.total) : null,
        priority: priority,
        trend: trend,
        last_attempt: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        await supabaseClient
          .from("user_weakness_profile")
          .update(weaknessData)
          .eq("id", existing.id);
      } else {
        await supabaseClient
          .from("user_weakness_profile")
          .insert(weaknessData);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [Backfill Performance] Complete in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        inserted: totalInserted,
        skipped: totalSkipped,
        topicsUpdated: Object.keys(topicStats).length,
        duration: `${duration}ms`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Backfill Performance] Error after ${duration}ms:`, error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        duration: `${duration}ms`,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to generate question hash
function generateQuestionHash(questionText: string, options: any): string {
  const combined = questionText + JSON.stringify(options);
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}