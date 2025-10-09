import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const formData = await req.formData();
    const image = formData.get('image') as File;
    const testType = formData.get('test_type') as string;
    const track = formData.get('track') as string;
    const target = formData.get('target') as string; // 'knowledge' or 'questions'

    if (!image) {
      throw new Error('No image provided');
    }

    console.log('Processing image:', image.name, 'Type:', image.type, 'Target:', target);

    // Convert image to base64
    const arrayBuffer = await image.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Use Lovable AI to extract text from image
    const aiResponse = await fetch('https://api.lovable.app/v1/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: target === 'questions' 
                  ? 'استخرج النص من هذه الصورة. إذا كانت تحتوي على أسئلة، استخرج السؤال والخيارات والإجابة الصحيحة بشكل منظم. قدم النتيجة بصيغة JSON إذا كانت أسئلة، أو نص عادي إذا كان محتوى عام.'
                  : 'استخرج كل النص من هذه الصورة بدقة. حافظ على التنسيق والبنية قدر الإمكان.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${image.type};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', errorText);
      throw new Error('Failed to extract text from image');
    }

    const aiData = await aiResponse.json();
    const extractedText = aiData.choices[0].message.content;

    console.log('Extracted text length:', extractedText.length);

    if (!extractedText || extractedText.length < 10) {
      throw new Error('Could not extract meaningful text from image');
    }

    // Insert based on target
    if (target === 'knowledge') {
      // Add to knowledge base
      const { error: insertError } = await supabase.from('knowledge_base').insert({
        title: `محتوى من صورة: ${image.name}`,
        content: extractedText,
        content_type: 'image_ocr',
        test_type: testType,
        track: track,
        related_topics: [testType, track, 'OCR'],
        is_active: true,
        metadata: {
          source: 'ocr',
          original_filename: image.name,
          uploaded_by: user.id,
          uploaded_at: new Date().toISOString()
        }
      });

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'تم استخراج النص وإضافته لقاعدة المعرفة',
          extractedText: extractedText.substring(0, 500) + '...'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (target === 'questions') {
      // Try to parse as question
      // For now, just add as text - can be enhanced later
      const { error: insertError } = await supabase.from('questions_bank').insert({
        question_text: extractedText.substring(0, 1000),
        correct_answer: 'أ', // Default - needs manual review
        question_type: 'قدرات',
        subject: 'كمي',
        difficulty: 'medium',
        topic: 'محتوى OCR - يحتاج مراجعة',
        explanation: 'تم استخراجه من صورة - يحتاج مراجعة يدوية'
      });

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'تم استخراج النص وإضافته لبنك الأسئلة (يحتاج مراجعة)',
          extractedText: extractedText.substring(0, 500) + '...'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid target');

  } catch (error) {
    console.error('Error in ocr-content:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
