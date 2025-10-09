import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, testType, track, results, totalScore, totalQuestions, percentage } = await req.json();

    console.log("Analyzing initial assessment for user:", userId);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // تحليل النتائج
    const subjectPerformance: Record<string, { correct: number; total: number }> = {};
    const difficultyPerformance: Record<string, { correct: number; total: number }> = {};

    results.forEach((result: any) => {
      // تحليل حسب الموضوع
      if (!subjectPerformance[result.subject]) {
        subjectPerformance[result.subject] = { correct: 0, total: 0 };
      }
      subjectPerformance[result.subject].total++;
      if (result.is_correct) {
        subjectPerformance[result.subject].correct++;
      }

      // تحليل حسب الصعوبة
      if (!difficultyPerformance[result.difficulty]) {
        difficultyPerformance[result.difficulty] = { correct: 0, total: 0 };
      }
      difficultyPerformance[result.difficulty].total++;
      if (result.is_correct) {
        difficultyPerformance[result.difficulty].correct++;
      }
    });

    // تحديد المستوى
    let level = "مبتدئ";
    if (percentage >= 85) {
      level = "متمكن";
    } else if (percentage >= 70) {
      level = "متقدم";
    } else if (percentage >= 50) {
      level = "متوسط";
    }

    // تحديد نقاط القوة والضعف
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    Object.entries(subjectPerformance).forEach(([subject, perf]) => {
      const subjectPercentage = (perf.correct / perf.total) * 100;
      if (subjectPercentage >= 70) {
        strengths.push(subject);
      } else if (subjectPercentage < 50) {
        weaknesses.push(subject);
      }
    });

    // إنشاء prompt للـ AI للحصول على توصيات مخصصة
    const prompt = `
أنت معلم متخصص في اختبارات ${testType} ${track !== "عام" ? `- المسار ${track}` : ""}.

قام الطالب بإجراء اختبار تقييم أولي وحصل على النتائج التالية:
- الدرجة الإجمالية: ${totalScore} من ${totalQuestions} (${percentage.toFixed(1)}%)
- المستوى المحدد: ${level}
- نقاط القوة: ${strengths.join("، ") || "لم يتم تحديدها بعد"}
- نقاط الضعف: ${weaknesses.join("، ") || "لم يتم تحديدها بعد"}

الأداء حسب الموضوع:
${Object.entries(subjectPerformance)
  .map(([subject, perf]) => `- ${subject}: ${perf.correct}/${perf.total} (${((perf.correct / perf.total) * 100).toFixed(1)}%)`)
  .join("\n")}

الأداء حسب الصعوبة:
${Object.entries(difficultyPerformance)
  .map(([difficulty, perf]) => `- ${difficulty}: ${perf.correct}/${perf.total} (${((perf.correct / perf.total) * 100).toFixed(1)}%)`)
  .join("\n")}

المطلوب منك:
1. تحليل شامل لأداء الطالب
2. اقتراح 5-7 مواضيع محددة يجب على الطالب التركيز عليها (بترتيب الأولوية)
3. خطة تدريبية مقترحة للأسبوع الأول
4. نصائح تحفيزية مخصصة

يرجى الرد بتنسيق JSON كالتالي:
{
  "analysis": "تحليل شامل للأداء",
  "recommended_topics": ["موضوع 1", "موضوع 2", ...],
  "weekly_plan": "خطة تدريبية للأسبوع الأول",
  "motivational_message": "رسالة تحفيزية"
}
`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "أنت معلم خبير في اختبارات القدرات والتحصيلي. مهمتك تقديم تحليل دقيق وتوصيات مخصصة.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI API Error:", await aiResponse.text());
      throw new Error("Failed to get AI analysis");
    }

    const aiData = await aiResponse.json();
    const aiAnalysis = JSON.parse(aiData.choices[0].message.content);

    console.log("Analysis completed successfully");

    return new Response(
      JSON.stringify({
        level,
        strengths,
        weaknesses,
        recommended_topics: aiAnalysis.recommended_topics || [],
        analysis: aiAnalysis.analysis || "",
        weekly_plan: aiAnalysis.weekly_plan || "",
        motivational_message: aiAnalysis.motivational_message || "",
        subject_performance: subjectPerformance,
        difficulty_performance: difficultyPerformance,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-initial-assessment:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
