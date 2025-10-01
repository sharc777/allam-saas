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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const dayNumber = parseInt(formData.get('day_number') as string);
    const testType = formData.get('test_type') as string;
    const track = formData.get('track') as string;

    if (!file || !title || !dayNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing PDF:', { title, dayNumber, testType, track });

    // قراءة محتوى الملف
    const fileContent = await file.text();
    
    // في حالة PDF حقيقي، يمكن استخدام مكتبة لاستخراج النص
    // هنا نستخدم النص مباشرة للتبسيط
    const extractedText = fileContent;

    // إضافة المحتوى إلى daily_content
    const { data, error } = await supabase
      .from('daily_content')
      .insert([{
        title,
        day_number: dayNumber,
        test_type: testType || 'قدرات',
        track: track || 'عام',
        content_text: extractedText,
        duration_minutes: 30,
        is_published: false,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error inserting content:', error);
      throw error;
    }

    console.log('Content created successfully:', data.id);

    return new Response(
      JSON.stringify({ success: true, content: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in upload-pdf-content:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
