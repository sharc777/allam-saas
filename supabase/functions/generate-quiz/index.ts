import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dayNumber, difficulty = "medium" } = await req.json();
    
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Get daily content
    const { data: content, error: contentError } = await supabase
      .from("daily_content")
      .select("*")
      .eq("day_number", dayNumber)
      .single();

    if (contentError || !content) {
      throw new Error("المحتوى اليومي غير موجود");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating quiz for day:", dayNumber, "difficulty:", difficulty);

    const systemPrompt = `أنت مولد اختبارات ذكي متخصص في اختبارات القدرات والتحصيلي.
مهمتك: توليد 10 أسئلة اختيار من متعدد بناءً على المحتوى المعطى.

متطلبات الأسئلة:
- كل سؤال يجب أن يحتوي على 4 خيارات
- خيار واحد فقط صحيح
- الأسئلة متنوعة وتغطي المحتوى
- مستوى الصعوبة: ${difficulty}
- اللغة: العربية الفصحى`;

    const userPrompt = `قم بتوليد 10 أسئلة اختبار بناءً على هذا المحتوى:

العنوان: ${content.title}
الوصف: ${content.description || ""}
المواضيع: ${JSON.stringify(content.topics || [])}
المحتوى: ${content.content_text || ""}

أهداف التعلم: ${content.learning_objectives?.join(", ") || ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_quiz",
              description: "توليد اختبار من 10 أسئلة",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_text: { type: "string", description: "نص السؤال" },
                        options: {
                          type: "array",
                          items: { type: "string" },
                          description: "4 خيارات للسؤال"
                        },
                        correct_answer: { type: "string", description: "الإجابة الصحيحة" },
                        explanation: { type: "string", description: "شرح الإجابة" },
                        topic: { type: "string", description: "الموضوع" }
                      },
                      required: ["question_text", "options", "correct_answer", "explanation", "topic"]
                    },
                    minItems: 10,
                    maxItems: 10
                  }
                },
                required: ["questions"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_quiz" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "يرجى إضافة رصيد للمتابعة." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("Failed to generate quiz");
    }

    const quizData = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({
        questions: quizData.questions,
        dayNumber,
        contentTitle: content.title
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("Generate quiz error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});