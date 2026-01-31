import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { rateLimiter } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Message validation helper (detailed)
function validateMessagesDetailed(messages: any[]): { ok: boolean; reasons?: string[] } {
  const reasons: string[] = [];
  if (!Array.isArray(messages)) return { ok: false, reasons: ["messages_not_array"] };
  if (messages.length === 0) reasons.push("empty_messages");
  if (messages.length > 50) reasons.push("too_many_messages");

  messages.forEach((msg, idx) => {
    if (!msg || (msg.role !== "user" && msg.role !== "assistant")) {
      reasons.push(`invalid_role_at_${idx}`);
      return;
    }
    if (typeof msg.content !== "string") {
      reasons.push(`non_string_content_at_${idx}`);
      return;
    }

    const len = msg.content.length;
    if (msg.role === "user") {
      if (len === 0) reasons.push(`empty_user_content_at_${idx}`);
      if (len > 2000) reasons.push(`user_content_too_long_at_${idx}`);
    } else if (msg.role === "assistant") {
      if (len > 20000) reasons.push(`assistant_content_too_long_at_${idx}`);
    }
  });

  return { ok: reasons.length === 0, reasons: reasons.length ? reasons : undefined };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user and get user ID for rate limiting
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "غير مصرح" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Create authenticated Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData.user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "غير مصرح" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const userId = userData.user.id;
    console.log("User authenticated:", userId);
    
    // Rate limiting check - 20 requests per minute
    if (!rateLimiter.check(userId, 20, 60000)) {
      return new Response(
        JSON.stringify({ error: "تم تجاوز الحد المسموح من الطلبات. يرجى الانتظار دقيقة." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { messages, mode = "general", weaknessData = null, currentQuestion = null } = await req.json();
    
    // Validate messages and build a safe fallback when possible
    let safeMessages = messages;
    const validation = validateMessagesDetailed(messages);
    if (!validation.ok) {
      try {
        if (Array.isArray(messages)) {
          const lastUser = [...messages].reverse().find((m) => m && m.role === "user" && typeof m.content === "string" && m.content.trim().length > 0);
          if (lastUser) {
            safeMessages = [{ role: "user", content: lastUser.content.trim().slice(0, 2000) }];
            console.warn("Invalid messages payload. Falling back to last user message only.", validation.reasons);
          } else {
            console.error("Invalid messages payload", validation.reasons);
            return new Response(
              JSON.stringify({ error: "رسائل غير صالحة", reasons: validation.reasons }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          console.error("Invalid messages payload (not array)", validation.reasons);
          return new Response(
            JSON.stringify({ error: "رسائل غير صالحة", reasons: validation.reasons }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (e) {
        console.error("Validation handling error", e);
        return new Response(
          JSON.stringify({ error: "رسائل غير صالحة" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("AI Tutor request:", { mode, messageCount: safeMessages.length });

    // قواعد التنسيق الرياضي مع دعم LaTeX للكسور
    const MATH_FORMATTING_RULES = `
## ⚠️ قواعد التنسيق الرياضي (إلزامية - اتبعها دائماً):

### 🔢 الكسور (مهم جداً) - استخدم LaTeX:
- ❌ خطأ: 2/3, ⅔, 1/2, ٣/٤
- ✅ صحيح: $\\frac{2}{3}$, $\\frac{1}{2}$, $\\frac{3}{4}$

#### أمثلة الكسور:
- "اجمع $\\frac{2}{3} + \\frac{11}{5}$"
- "الناتج هو $\\frac{7}{12}$"
- "اضرب $\\frac{3}{4} \\times \\frac{2}{5}$"

#### الأعداد الكسرية:
- ❌ خطأ: 2 1/2, ٣ ١/٢
- ✅ صحيح: $2\\frac{1}{2}$ أو $\\frac{5}{2}$

### الجذور - استخدم LaTeX:
- ❌ خطأ: √4, sqrt(4), جذر(4)
- ✅ صحيح: $\\sqrt{4}$, $\\sqrt{س}$, $\\sqrt[3]{8}$

### الأسس - استخدم LaTeX:
- ❌ خطأ: x^2, س^2, 10^3
- ✅ صحيح: $س^2$, $10^3$, $n^2$

### المتغيرات - استخدم الحروف العربية:
- ❌ خطأ: x, y, z
- ✅ صحيح: س، ص، ع
- التحويل: x→س، y→ص، z→ع، n→ن، m→م

### الرموز الرياضية:
| الرمز | الاستخدام | LaTeX |
|-------|-----------|-------|
| × | الضرب | $\\times$ |
| ÷ | القسمة | $\\div$ |
| ± | زائد أو ناقص | $\\pm$ |
| ≤ | أصغر أو يساوي | $\\leq$ |
| ≥ | أكبر أو يساوي | $\\geq$ |
| ≠ | لا يساوي | $\\neq$ |
| π | باي | $\\pi$ |
| ∞ | ما لا نهاية | $\\infty$ |

### أمثلة صحيحة:
- "حل المعادلة $س^2 + 5س - 6 = 0$"
- "الجذر التربيعي لـ 16 هو $\\sqrt{16} = 4$"
- "المساحة = الطول $\\times$ العرض"
- "قيمة $\\frac{2}{3} + \\frac{1}{4} = \\frac{11}{12}$"
`;

    // Base system prompt
    let systemPrompt = `أنت مدرس خصوصي ذكي متخصص في مساعدة الطلاب على الاستعداد لاختبار القدرات في السعودية.

مهامك:
1. شرح المفاهيم الرياضية والعلمية واللغوية بطريقة واضحة ومبسطة
2. الإجابة على أسئلة الطلاب بدقة وصبر
3. تقديم أمثلة توضيحية عند الحاجة
4. تشجيع الطلاب وتحفيزهم على التعلم
5. تقديم استراتيجيات حل المسائل
6. مساعدة الطلاب في فهم نقاط ضعفهم وتحسينها

${MATH_FORMATTING_RULES}

أسلوبك:
- استخدم اللغة العربية الفصحى البسيطة
- كن صبوراً وداعماً
- قدم خطوات حل واضحة ومنظمة
- استخدم أمثلة من الحياة اليومية عند الإمكان
- شجع التفكير النقدي والاستنتاج
- اسأل أسئلة توجيهية لمساعدة الطالب على الفهم
- **التزم دائماً بقواعد التنسيق الرياضي أعلاه**`;

    // Add student weakness context if available
    if (weaknessData && (weaknessData.weaknesses?.critical?.length > 0 || weaknessData.repeatedMistakes?.length > 0)) {
      systemPrompt += `\n\n📊 **معلومات مهمة عن هذا الطالب:**\n`;
      
      if (weaknessData.weaknesses?.critical?.length > 0) {
        systemPrompt += `\n**نقاط الضعف الحرجة (تحتاج اهتماماً خاصاً):**\n`;
        weaknessData.weaknesses.critical.slice(0, 3).forEach((w: any) => {
          systemPrompt += `- ${w.topic}: ${w.errorCount} أخطاء، نسبة النجاح ${w.successRate}%\n`;
        });
      }
      
      if (weaknessData.repeatedMistakes?.length > 0) {
        systemPrompt += `\n**الأخطاء المتكررة:**\n`;
        weaknessData.repeatedMistakes.slice(0, 3).forEach((m: any) => {
          systemPrompt += `- ${m.topic}: "${m.commonMistakes[0]}" (تكرر ${m.errorCount} مرة)\n`;
          if (m.examples && m.examples[0]) {
            systemPrompt += `  مثال: السؤال: "${m.examples[0].question}"\n`;
            systemPrompt += `  أجاب: "${m.examples[0].wrongAnswer}" (خطأ)\n`;
            systemPrompt += `  الصحيح: "${m.examples[0].correctAnswer}"\n`;
          }
        });
      }
      
      if (weaknessData.weaknesses?.improving?.length > 0) {
        systemPrompt += `\n**نقاط يتحسن فيها:**\n`;
        weaknessData.weaknesses.improving.forEach((w: any) => {
          systemPrompt += `- ${w.topic} ✓\n`;
        });
      }
    }

    // Adjust prompt based on mode
    if (mode === "review_mistakes") {
      systemPrompt += `\n\n**🎯 أنت الآن في وضع "مراجعة الأخطاء"**

مهمتك الآن:
1. استعرض أخطاء الطالب السابقة بطريقة تفاعلية
2. اشرح كل خطأ بالتفصيل مع التركيز على السبب
3. قدم أمثلة مشابهة للتدريب عليها
4. اسأل أسئلة توجيهية للتأكد من الفهم
5. اربط الشرح بالأخطاء التي وقع فيها سابقاً

ابدأ بسؤال الطالب: "أي من الأخطاء السابقة تريد أن نراجعها معاً؟"`;
    } else if (mode === "focused_practice") {
      systemPrompt += `\n\n**🎯 أنت الآن في وضع "التدريب المركز"**

مهمتك الآن:
1. اشرح المفهوم الأساسي بطريقة مبسطة جداً
2. قدم 3 أمثلة تدريجية (سهل → متوسط → صعب)
3. اطرح سؤالاً تدريبياً على الطالب
4. صحح الإجابة مع شرح مفصل
5. كرر العملية حتى يتقن الطالب الموضوع

ابدأ بشرح الموضوع بطريقة بسيطة وواضحة.`;
    } else if (mode === "instant_help") {
      systemPrompt += `\n\n**🎯 أنت الآن في وضع "المساعدة الفورية"**

**كيف تشرح:**
- ابدأ مباشرة بشرح السؤال - لا تكتب "نوع السؤال" أو "المفهوم الأساسي"
- استخدم 3-4 جمل بسيطة لشرح الفكرة الرئيسية
- اشرح الحل خطوة بخطوة بطريقة عملية (مثال: "الخطوة 1:..., الخطوة 2:...")
- في النهاية، أعطِ الطالب 3 خيارات:
  📝 أريد مثالاً مشابهاً
  ⚠️ اشرح الأخطاء الشائعة
  💪 أعطني تمريناً

**قواعد صارمة:**
✅ اشرح مباشرة دون تحليل أو تفكير مكتوب
✅ 100-120 كلمة كحد أقصى
✅ استخدم أمثلة بسيطة من الواقع
❌ لا تكتب "1. اقرأ وحلل السؤال" أو "نوع السؤال" أو "المفهوم الأساسي"
❌ لا تقدم أمثلة أو أخطاء أو تمارين إلا إذا طلبها الطالب
❌ لا تكرر أو تطيل الشرح`;

      if (currentQuestion) {
        systemPrompt += `\n\n**📋 السؤال:**

${currentQuestion.question_text}

**الخيارات:**
${currentQuestion.options?.map((o: string, i: number) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}
${currentQuestion.user_answer ? `\n**إجابة الطالب:** ${currentQuestion.user_answer} ${currentQuestion.user_answer !== currentQuestion.correct_answer ? '❌' : '✅'}` : ''}
${currentQuestion.correct_answer ? `**الإجابة الصحيحة:** ${currentQuestion.correct_answer}` : ''}

اشرح الحل مباشرة في 100-120 كلمة. ابدأ بـ "💡" وليس بكلمة "نوع السؤال".`;
      }
    }

    systemPrompt += `\n\nتذكر: أنت هنا لمساعدة الطالب على التعلم والفهم العميق، وليس فقط لإعطاء الإجابات.`;

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
          ...safeMessages,
        ],
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("AI Tutor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
