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
    const { messages, mode = "general", weaknessData = null, currentQuestion = null } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("AI Tutor request:", { mode, messageCount: messages.length });

    // Base system prompt
    let systemPrompt = `أنت مدرس خصوصي ذكي متخصص في مساعدة الطلاب على الاستعداد لاختبارات القدرات والتحصيلي في السعودية.

مهامك:
1. شرح المفاهيم الرياضية والعلمية واللغوية بطريقة واضحة ومبسطة
2. الإجابة على أسئلة الطلاب بدقة وصبر
3. تقديم أمثلة توضيحية عند الحاجة
4. تشجيع الطلاب وتحفيزهم على التعلم
5. تقديم استراتيجيات حل المسائل
6. مساعدة الطلاب في فهم نقاط ضعفهم وتحسينها

أسلوبك:
- استخدم اللغة العربية الفصحى البسيطة
- كن صبوراً وداعماً
- قدم خطوات حل واضحة ومنظمة
- استخدم أمثلة من الحياة اليومية عند الإمكان
- شجع التفكير النقدي والاستنتاج
- اسأل أسئلة توجيهية لمساعدة الطالب على الفهم`;

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

مهمتك الآن:
1. **لا تعطِ الإجابة مباشرة**
2. اطرح أسئلة توجيهية مثل:
   - "ماذا نلاحظ في السؤال؟"
   - "ما هي الخطوة الأولى للحل؟"
   - "ما هي المعلومات المعطاة؟"
3. وجّه الطالب للحل تدريجياً
4. إذا احتاج مساعدة إضافية، أعطِ تلميحات صغيرة
5. في النهاية، اشرح الحل الكامل مع جميع الخطوات

تذكر: هدفك هو مساعدة الطالب على التفكير، وليس إعطاء الحل مباشرة.`;

      if (currentQuestion) {
        systemPrompt += `\n\n**السؤال الذي يحتاج مساعدة فيه:**\n${currentQuestion.question_text}\n\nالخيارات:\n${currentQuestion.options?.map((o: string, i: number) => `${i+1}. ${o}`).join('\n')}`;
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
          ...messages,
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
