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

  try {
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

    const { exerciseId, testType, track } = await req.json();

    // Get all user exercises
    const { data: exercises, error: exercisesError } = await supabaseClient
      .from("daily_exercises")
      .select("*")
      .eq("user_id", user.id)
      .eq("test_type", testType)
      .order("created_at", { ascending: false });

    if (exercisesError) throw exercisesError;

    // Process current exercise to create performance history records
    if (exerciseId) {
      const currentExercise = exercises?.find(ex => ex.id === exerciseId);
      if (currentExercise && currentExercise.questions) {
        const questions = currentExercise.questions as any[];
        
        // Create performance history records for each question
        for (const question of questions) {
          const questionHash = generateQuestionHash(
            question.question_text || '', 
            question.options || []
          );
          
          const isCorrect = question.is_correct === true || 
                          (question.user_answer && question.user_answer === question.correct_answer);
          
          await supabaseClient.from("user_performance_history").insert({
            user_id: user.id,
            question_hash: questionHash,
            topic: question.topic || question.subject || currentExercise.section_type || "غير محدد",
            section: currentExercise.section_type || "عام",
            difficulty: question.difficulty || "medium",
            is_correct: isCorrect,
            time_spent_seconds: Math.floor((currentExercise.time_taken_minutes || 0) * 60 / questions.length),
            attempted_at: new Date().toISOString(),
            metadata: {
              exercise_id: exerciseId,
              exercise_type: currentExercise.exercise_type,
            }
          });
        }

        console.log(`✅ Created ${questions.length} performance history records`);
      }
    }

    // Calculate performance metrics
    const totalExercises = exercises?.length || 0;
    const totalScore = exercises?.reduce((sum, ex) => sum + (ex.score || 0), 0) || 0;
    const averageScore = totalExercises > 0 ? totalScore / totalExercises : 0;

    // Calculate improvement rate (compare last 5 vs previous 5)
    let improvementRate = 0;
    if (totalExercises >= 10) {
      const recent5 = exercises.slice(0, 5);
      const previous5 = exercises.slice(5, 10);
      const recentAvg = recent5.reduce((sum, ex) => sum + (ex.score || 0), 0) / 5;
      const previousAvg = previous5.reduce((sum, ex) => sum + (ex.score || 0), 0) / 5;
      improvementRate = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
    }

    // Determine level based on average score
    let currentLevel = "مبتدئ";
    if (averageScore >= 90) currentLevel = "ممتاز";
    else if (averageScore >= 75) currentLevel = "متقدم";
    else if (averageScore >= 60) currentLevel = "متوسط";

    // Analyze strengths and weaknesses by topic
    const topicPerformance: Record<string, { correct: number; total: number }> = {};
    
    exercises?.forEach(exercise => {
      const questions = exercise.questions as any[];
      questions?.forEach(q => {
        const topic = q.topic || "عام";
        if (!topicPerformance[topic]) {
          topicPerformance[topic] = { correct: 0, total: 0 };
        }
        topicPerformance[topic].total++;
        if (q.user_answer === q.correct_answer) {
          topicPerformance[topic].correct++;
        }
      });
    });

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    Object.entries(topicPerformance).forEach(([topic, stats]) => {
      const accuracy = (stats.correct / stats.total) * 100;
      if (accuracy >= 80) strengths.push(topic);
      else if (accuracy < 50) weaknesses.push(topic);
    });

    // Determine badges
    const badges: string[] = [];
    if (totalExercises >= 7) badges.push("متسق"); // Consistent
    if (averageScore >= 85) badges.push("دقيق"); // Accurate
    if (totalExercises >= 15) badges.push("مثابر"); // Persistent
    if (improvementRate > 10) badges.push("متطور"); // Improving

    // Update or insert performance record
    const { data: existingPerf } = await supabaseClient
      .from("student_performance")
      .select("*")
      .eq("user_id", user.id)
      .eq("test_type", testType)
      .maybeSingle();

    const performanceData = {
      user_id: user.id,
      test_type: testType,
      track: track,
      current_level: currentLevel,
      total_exercises: totalExercises,
      total_score: totalScore,
      average_score: averageScore,
      improvement_rate: improvementRate,
      strengths: strengths,
      weaknesses: weaknesses,
      badges: badges,
      last_updated: new Date().toISOString(),
    };

    if (existingPerf) {
      await supabaseClient
        .from("student_performance")
        .update(performanceData)
        .eq("id", existingPerf.id);
    } else {
      await supabaseClient
        .from("student_performance")
        .insert(performanceData);
    }

    return new Response(
      JSON.stringify({
        currentLevel,
        averageScore,
        improvementRate,
        strengths,
        weaknesses,
        badges,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error calculating performance:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
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