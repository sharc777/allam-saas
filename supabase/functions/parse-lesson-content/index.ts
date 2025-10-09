import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contentText, title } = await req.json();
    console.log('[PARSE-LESSON] Starting content parsing for:', title);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `أنت خبير تربوي متخصص في تحليل المحتوى التعليمي للقدرات السعودية.
مهمتك: تحليل النص التعليمي وتقسيمه إلى أقسام منظمة مع استخراج الأمثلة المحلولة.

قواعد مهمة:
1. كل قسم يجب أن يحتوي على موضوع واضح ومحدد
2. استخرج الأمثلة المحلولة بدقة (المشكلة + الحل + الشرح)
3. استخرج النقاط الرئيسية والنصائح السريعة
4. احتفظ بجودة المحتوى وعدم حذف أي معلومات مهمة
5. استخدم اللغة العربية الفصحى الواضحة`;

    const userPrompt = `قم بتحليل المحتوى التعليمي التالي وتقسيمه إلى أقسام:

العنوان: ${title}

المحتوى:
${contentText}

يجب أن يكون الناتج JSON بالهيكل التالي (بدون أي نص إضافي):
{
  "sections": [
    {
      "id": "section-1",
      "title": "عنوان القسم",
      "order": 1,
      "content": "شرح مفصل",
      "examples": [
        {
          "title": "عنوان المثال",
          "problem": "نص المشكلة أو السؤال",
          "solution": "الحل",
          "explanation": "شرح الحل"
        }
      ],
      "key_points": ["نقطة 1", "نقطة 2"],
      "quick_tips": ["نصيحة 1", "نصيحة 2"]
    }
  ]
}`;

    console.log('[PARSE-LESSON] Calling Lovable AI...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PARSE-LESSON] AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;
    console.log('[PARSE-LESSON] AI response received, length:', generatedText.length);

    // Extract JSON from response (in case AI adds extra text)
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[PARSE-LESSON] No JSON found in response:', generatedText);
      throw new Error('Failed to extract JSON from AI response');
    }

    const parsedContent = JSON.parse(jsonMatch[0]);
    console.log('[PARSE-LESSON] Parsed sections count:', parsedContent.sections?.length || 0);

    return new Response(JSON.stringify(parsedContent), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[PARSE-LESSON] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
