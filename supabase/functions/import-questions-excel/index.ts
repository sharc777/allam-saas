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

    const { questions } = await req.json();

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No questions provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Importing questions:', questions.length);

    // التحقق من صحة البيانات وتنسيقها
    const formattedQuestions = questions.map((q: any) => ({
      question_text: q.question_text || q.question,
      question_type: q.question_type || 'multiple_choice',
      subject: q.subject || 'الرياضيات',
      topic: q.topic || 'عام',
      difficulty: q.difficulty || 'medium',
      options: q.options || [],
      correct_answer: q.correct_answer || q.answer,
      explanation: q.explanation || '',
      tags: q.tags || [],
    }));

    // إدراج الأسئلة في قاعدة البيانات
    const { data, error } = await supabase
      .from('questions_bank')
      .insert(formattedQuestions)
      .select();

    if (error) {
      console.error('Error inserting questions:', error);
      throw error;
    }

    console.log('Questions imported successfully:', data?.length);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported: data?.length || 0,
        questions: data 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in import-questions-excel:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
