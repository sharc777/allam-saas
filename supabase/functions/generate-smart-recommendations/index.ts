import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Fetch user stats
    const [quizResults, progress, weaknesses] = await Promise.all([
      supabaseClient
        .from("quiz_results")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseClient
        .from("student_progress")
        .select("*")
        .eq("user_id", user.id),
      supabaseClient
        .from("student_weaknesses")
        .select("*")
        .eq("user_id", user.id)
        .order("weakness_score", { ascending: false })
        .limit(5),
    ]);

    const stats = {
      recentQuizzes: quizResults.data || [],
      progress: progress.data || [],
      topWeaknesses: weaknesses.data || [],
      avgScore: quizResults.data?.reduce((acc, q) => acc + (q.score || 0), 0) / (quizResults.data?.length || 1) || 0,
      completedLessons: progress.data?.filter(p => p.content_completed).length || 0,
    };

    // Call Lovable AI for recommendations
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://api.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `أنت مستشار تعليمي ذكي متخصص في اختبارات القدرات والتحصيلي السعودية. 
            قدم 3-5 توصيات مخصصة بناءً على أداء الطالب. كل توصية يجب أن تكون:
            - محددة وقابلة للتنفيذ
            - مبنية على البيانات الفعلية
            - تتضمن خطة عمل واضحة
            - تحدد الأولوية (high, medium, low)
            - تتضمن رابط للإجراء المطلوب`
          },
          {
            role: "user",
            content: `بيانات الطالب:
            - متوسط الدرجات: ${stats.avgScore.toFixed(1)}%
            - الدروس المكتملة: ${stats.completedLessons}
            - عدد الاختبارات الأخيرة: ${stats.recentQuizzes.length}
            - أبرز نقاط الضعف: ${stats.topWeaknesses.map(w => w.section_name).join('، ')}
            
            قدم توصيات ذكية ومخصصة بصيغة JSON`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      throw new Error("AI API request failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No recommendations generated");
    }

    const recommendations = JSON.parse(content);

    return new Response(
      JSON.stringify({ 
        success: true, 
        recommendations: recommendations.recommendations || [],
        stats 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Smart recommendations error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
