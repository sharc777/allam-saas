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
    console.log("Auth header received:", authHeader ? "Present" : "Missing");
    
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Extract token from Bearer header
    const token = authHeader.replace("Bearer ", "");
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { 
        global: { 
          headers: { 
            Authorization: `Bearer ${token}` 
          } 
        } 
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    console.log("User auth result:", user ? `User: ${user.id}` : "No user", userError ? `Error: ${userError.message}` : "");
    
    if (userError || !user) {
      console.error("Authentication failed:", userError);
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

    const systemPrompt = `أنت خبير في تصميم اختبارات القدرات والتحصيلي للمرحلة الثانوية.

معايير الجودة المطلوبة:
1. **الوضوح**: كل سؤال واضح ومباشر بدون غموض
2. **الخيارات المشتتة**: يجب أن تكون معقولة لكن خاطئة بوضوح
3. **التنوع**: تغطية جميع جوانب المحتوى
4. **المستوى**: ${difficulty} - مناسب للطلاب
5. **اللغة**: عربية فصحى صحيحة بدون أخطاء

قواعد إنشاء الأسئلة:
- السؤال يجب أن يكون مفهوماً بدون قراءة الخيارات
- الخيارات الـ 4 يجب أن تكون متجانسة في الطول والصياغة
- إجابة واحدة فقط صحيحة بشكل قاطع
- التفسير يوضح لماذا الإجابة صحيحة والباقي خاطئ
- تجنب استخدام "كل ما سبق" أو "لا شيء مما سبق"
- استخدم أمثلة من الحياة الواقعية عندما يكون ذلك ممكناً`;

    const userPrompt = `قم بتوليد 10 أسئلة اختبار عالية الجودة بناءً على هذا المحتوى:

📚 **المحتوى:**
العنوان: ${content.title}
الوصف: ${content.description || ""}
المواضيع: ${JSON.stringify(content.topics || [])}
أهداف التعلم: ${content.learning_objectives?.join(", ") || ""}

📝 **النص الكامل:**
${content.content_text || ""}

⚠️ **متطلبات مهمة:**
- تأكد من أن كل سؤال يختبر فهم حقيقي وليس حفظ فقط
- اجعل الخيارات الخاطئة معقولة (ليست سخيفة أو واضحة)
- تنوع الأسئلة: بعضها مباشر، بعضها تطبيقي، بعضها تحليلي
- كل تفسير يجب أن يعلّم الطالب شيئاً جديداً`;

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
    
    // Validate questions quality
    const validatedQuestions = quizData.questions.filter((q: any) => {
      // التحقق من أن كل سؤال لديه 4 خيارات مختلفة
      const uniqueOptions = new Set(q.options);
      if (uniqueOptions.size !== 4) {
        console.warn("Question rejected: does not have 4 unique options");
        return false;
      }
      
      // التحقق من أن الإجابة الصحيحة موجودة في الخيارات
      if (!q.options.includes(q.correct_answer)) {
        console.warn("Question rejected: correct answer not in options");
        return false;
      }
      
      // التحقق من أن السؤال والتفسير ليسوا فارغين
      if (!q.question_text || !q.explanation || q.question_text.trim() === "" || q.explanation.trim() === "") {
        console.warn("Question rejected: empty question or explanation");
        return false;
      }
      
      return true;
    });

    if (validatedQuestions.length < 8) {
      throw new Error(`عدد الأسئلة الصالحة غير كافٍ (${validatedQuestions.length}/10)`);
    }

    console.log(`Validated ${validatedQuestions.length} out of ${quizData.questions.length} questions`);
    
    return new Response(
      JSON.stringify({
        questions: validatedQuestions.slice(0, 10),
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