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
    const { messages, conversationId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("AI Tutor request:", { conversationId, messageCount: messages.length });

    const systemPrompt = `أنت مدرس خصوصي ذكي متخصص في مساعدة الطلاب على الاستعداد لاختبارات القدرات والتحصيلي في السعودية.

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
- اسأل أسئلة توجيهية لمساعدة الطالب على الفهم

تذكر: أنت هنا لمساعدة الطالب على التعلم، وليس فقط لإعطاء الإجابات.`;

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
