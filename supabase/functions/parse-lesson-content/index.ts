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

    const systemPrompt = `أنت خبير تربوي متخصص في تحليل المحتوى التعليمي لاختبار القدرات السعودية.
مهمتك: تحليل النص التعليمي وتقسيمه إلى أقسام منظمة مع استخراج الأمثلة المحلولة.

قواعد مهمة:
1. قسّم المحتوى إلى 3-5 أقسام رئيسية فقط
2. كل قسم يجب أن يحتوي على:
   - محتوى رئيسي (150-300 كلمة): شرح واضح ومفصّل
   - 2-4 أمثلة محلولة (مشكلة + حل + شرح خطوة بخطوة)
   - 3-5 نقاط رئيسية (key_points): أهم الأفكار في نقاط مختصرة
   - 2-3 نصائح سريعة (quick_tips): نصائح عملية للطالب
3. استخدم اللغة العربية الفصحى الواضحة
4. اجعل الأمثلة متدرجة الصعوبة (سهل → متوسط → صعب)
5. تأكد من وضوح الشرح وسهولة الفهم للطالب`;

    const userPrompt = `قم بتحليل المحتوى التعليمي التالي وتقسيمه إلى أقسام تعليمية منظمة:

العنوان: ${title}

المحتوى:
${contentText}

يجب أن يكون الناتج JSON بالهيكل التالي **بدون أي نص إضافي قبل أو بعد JSON**:
{
  "sections": [
    {
      "id": "section-1",
      "title": "عنوان القسم (مختصر وواضح)",
      "order": 1,
      "content": "شرح مفصل للموضوع (150-300 كلمة). يجب أن يكون الشرح واضحاً ومفصلاً ومناسباً للطالب.",
      "examples": [
        {
          "title": "مثال 1: وصف المثال",
          "problem": "نص المشكلة أو السؤال بشكل واضح",
          "solution": "الحل النهائي",
          "explanation": "شرح خطوات الحل بالتفصيل"
        },
        {
          "title": "مثال 2: وصف المثال",
          "problem": "مشكلة أصعب قليلاً",
          "solution": "الحل",
          "explanation": "الشرح"
        }
      ],
      "key_points": [
        "النقطة الأولى المهمة",
        "النقطة الثانية المهمة",
        "النقطة الثالثة المهمة"
      ],
      "quick_tips": [
        "نصيحة عملية للطالب",
        "نصيحة ثانية مفيدة"
      ]
    }
  ]
}

ملاحظات:
- قسّم إلى 3-5 أقسام رئيسية فقط
- كل قسم يحتوي على 2-4 أمثلة محلولة
- اجعل الأمثلة متدرجة الصعوبة
- تأكد من JSON صحيح وبدون أخطاء`;

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

    // Validate and fix sections
    if (!parsedContent.sections || !Array.isArray(parsedContent.sections)) {
      throw new Error('Invalid sections format in AI response');
    }

    // Ensure all sections have required fields with defaults
    parsedContent.sections = parsedContent.sections.map((section: any, index: number) => ({
      id: section.id || `section-${index + 1}`,
      title: section.title || `القسم ${index + 1}`,
      order: section.order || index + 1,
      content: section.content || '',
      examples: Array.isArray(section.examples) ? section.examples : [],
      key_points: Array.isArray(section.key_points) ? section.key_points : [],
      quick_tips: Array.isArray(section.quick_tips) ? section.quick_tips : []
    }));

    console.log('[PARSE-LESSON] Validation complete. Sections:', parsedContent.sections.length);

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
