import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedExample {
  question_text: string;
  options: Record<string, string>;
  correct_answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  sub_topic: string;
  quality_score: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: isAdmin } = await supabase.rpc('is_admin', { user_id: user.id });
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const section = formData.get('section') as string || 'كمي';
    const topic = formData.get('topic') as string || '';
    const subTopic = formData.get('sub_topic') as string || '';
    const difficulty = formData.get('difficulty') as string || 'medium';
    const testType = formData.get('test_type') as string || 'قدرات';

    if (!file) {
      throw new Error('No file provided');
    }

    console.log(`📁 Processing file: ${file.name}, Section: ${section}, Topic: ${topic}`);

    // Extract text content from file
    let textContent = '';
    
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      textContent = await file.text();
    } else {
      // For other file types, read as text and try to extract
      const arrayBuffer = await file.arrayBuffer();
      const decoder = new TextDecoder('utf-8');
      textContent = decoder.decode(arrayBuffer);
      
      // Clean up binary artifacts for PDF/Word
      textContent = textContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ');
    }

    if (!textContent || textContent.length < 50) {
      throw new Error('Could not extract meaningful text from file');
    }

    console.log(`📝 Extracted ${textContent.length} characters`);

    // Use AI to extract and analyze questions
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `أنت محلل خبير لأسئلة اختبار القدرات العامة في السعودية.
مهمتك استخراج الأسئلة من المحتوى المقدم وتحويلها لصيغة JSON منظمة.

القسم المحدد: ${section}
${topic ? `الموضوع الرئيسي: ${topic}` : ''}
${subTopic ? `الموضوع الفرعي: ${subTopic}` : ''}
مستوى الصعوبة الافتراضي: ${difficulty}

تعليمات مهمة:
1. استخرج كل الأسئلة الموجودة في النص
2. تأكد من استخراج جميع الخيارات (أ، ب، ج، د) أو (A, B, C, D)
3. حدد الإجابة الصحيحة إن كانت موجودة، وإلا اتركها فارغة
4. اكتب شرحاً مختصراً للإجابة إن أمكن
5. قيّم جودة كل سؤال من 1-5 (5 = ممتاز)
6. حدد الموضوع الفرعي المناسب لكل سؤال

إرجع فقط JSON بالصيغة التالية (بدون أي نص إضافي):
{
  "examples": [
    {
      "question_text": "نص السؤال كاملاً",
      "options": {"أ": "الخيار الأول", "ب": "الخيار الثاني", "ج": "الخيار الثالث", "د": "الخيار الرابع"},
      "correct_answer": "أ",
      "explanation": "شرح الإجابة",
      "difficulty": "easy|medium|hard",
      "topic": "الموضوع الرئيسي",
      "sub_topic": "الموضوع الفرعي",
      "quality_score": 4
    }
  ]
}`;

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
          { role: 'user', content: `استخرج الأسئلة من المحتوى التالي:\n\n${textContent.substring(0, 15000)}` }
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI processing failed: ${response.status}`);
    }

    const aiResult = await response.json();
    const aiContent = aiResult.choices?.[0]?.message?.content || '';
    
    console.log('🤖 AI Response received');

    // Parse AI response
    let extractedExamples: ExtractedExample[] = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        extractedExamples = parsed.examples || [];
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.log('AI Content:', aiContent.substring(0, 500));
    }

    if (extractedExamples.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'لم يتم استخراج أي أسئلة من الملف',
        aiResponse: aiContent.substring(0, 500)
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`✅ Extracted ${extractedExamples.length} examples`);

    // Generate hash for deduplication
    const generateHash = async (text: string): Promise<string> => {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    };

    // Insert examples into database
    const insertedExamples = [];
    const skippedExamples = [];

    for (const example of extractedExamples) {
      try {
        const exampleHash = await generateHash(example.question_text + JSON.stringify(example.options));
        
        // Check for duplicates
        const { data: existing } = await supabase
          .from('ai_training_examples')
          .select('id')
          .eq('example_hash', exampleHash)
          .single();

        if (existing) {
          skippedExamples.push(example.question_text.substring(0, 50));
          continue;
        }

        // Insert new example
        const { error: insertError } = await supabase
          .from('ai_training_examples')
          .insert({
            test_type: testType,
            section: section,
            topic: example.topic || topic,
            sub_topic: example.sub_topic || subTopic,
            difficulty: example.difficulty || difficulty,
            question_text: example.question_text,
            options: example.options,
            correct_answer: example.correct_answer || '',
            explanation: example.explanation || '',
            quality_score: example.quality_score || 3,
            validation_status: 'pending',
            example_hash: exampleHash,
          });

        if (insertError) {
          console.error('Insert error:', insertError);
        } else {
          insertedExamples.push({
            question: example.question_text.substring(0, 100),
            quality: example.quality_score,
            difficulty: example.difficulty
          });
        }
      } catch (err) {
        console.error('Error processing example:', err);
      }
    }

    console.log(`💾 Inserted ${insertedExamples.length} examples, Skipped ${skippedExamples.length} duplicates`);

    return new Response(JSON.stringify({
      success: true,
      message: `تم استخراج ${extractedExamples.length} مثال بنجاح`,
      inserted: insertedExamples.length,
      skipped: skippedExamples.length,
      examples: insertedExamples
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('upload-training-examples error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
