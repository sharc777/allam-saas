import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  section: string;
  subTopic: string;
  difficulty: string;
  count: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { section, subTopic, difficulty, count = 10 }: GenerateRequest = await req.json();

    console.log(`Generating ${count} questions for ${section}/${subTopic}/${difficulty}`);

    // Fetch few-shot examples
    const { data: examples } = await supabase
      .from("ai_training_examples")
      .select("*")
      .eq("section", section)
      .gte("quality_score", 3)
      .limit(3);

    // Build prompt
    const examplesText = examples && examples.length > 0
      ? examples.map((ex: any) => `
سؤال: ${ex.question_text}
الخيارات:
أ) ${ex.options?.["أ"] || ex.options?.A || ""}
ب) ${ex.options?.["ب"] || ex.options?.B || ""}
ج) ${ex.options?.["ج"] || ex.options?.C || ""}
د) ${ex.options?.["د"] || ex.options?.D || ""}
الإجابة الصحيحة: ${ex.correct_answer}
الشرح: ${ex.explanation || ""}
`).join("\n---\n")
      : "";

    const difficultyAr = difficulty === "easy" ? "سهل" : difficulty === "medium" ? "متوسط" : "صعب";
    const sectionName = section === "كمي" ? "الكمي" : "اللفظي";

    const systemPrompt = `أنت خبير في إنشاء أسئلة اختبار القدرات العامة السعودي.
مهمتك: إنشاء ${count} أسئلة اختيار من متعدد للقسم ${sectionName} في الموضوع الفرعي "${subTopic}" بمستوى صعوبة ${difficultyAr}.

## قواعد صارمة:
1. كل سؤال يجب أن يكون مرتبطاً بشكل مباشر بالموضوع الفرعي "${subTopic}"
2. مستوى الصعوبة يجب أن يكون ${difficultyAr} فعلاً
3. الأسئلة باللغة العربية الفصحى
4. 4 خيارات لكل سؤال (أ، ب، ج، د)
5. إجابة صحيحة واحدة فقط
6. شرح مختصر للإجابة الصحيحة
7. الأسئلة متنوعة وغير مكررة

${examplesText ? `## أمثلة للاسترشاد:\n${examplesText}` : ""}

## تنسيق الإخراج:
أرجع JSON array بالتنسيق التالي:
[
  {
    "question_text": "نص السؤال",
    "options": { "أ": "الخيار الأول", "ب": "الخيار الثاني", "ج": "الخيار الثالث", "د": "الخيار الرابع" },
    "correct_answer": "أ",
    "explanation": "شرح مختصر للإجابة"
  }
]

أرجع فقط JSON array بدون أي نص إضافي.`;

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `أنشئ ${count} أسئلة للموضوع الفرعي "${subTopic}" في القسم ${sectionName} بمستوى ${difficultyAr}.` }
        ],
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Error:", errorText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let questions: any[] = [];
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1].trim();
      questions = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Parse error:", parseError);
      // Try to find array in content
      const arrayMatch = content.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        questions = JSON.parse(arrayMatch[0]);
      } else {
        throw new Error("Could not parse AI response");
      }
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("No questions generated");
    }

    // Create hash function
    const hashQuestion = (text: string) => {
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(36);
    };

    // Insert into questions_bank
    const questionsToInsert = questions.map((q: any) => ({
      subject: section,
      topic: subTopic,
      sub_topic: subTopic,
      difficulty: difficulty as "easy" | "medium" | "hard",
      question_type: "multiple_choice" as const,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation || null,
      question_hash: hashQuestion(q.question_text),
      created_by: "ai_admin",
      validation_status: "approved",
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("questions_bank")
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(`Failed to save questions: ${insertError.message}`);
    }

    console.log(`Successfully generated and saved ${inserted?.length || 0} questions`);

    return new Response(
      JSON.stringify({
        success: true,
        generated: questions.length,
        saved: inserted?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
