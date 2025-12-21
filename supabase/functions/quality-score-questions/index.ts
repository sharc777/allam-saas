// AI Quality Scoring System for Generated Questions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { rateLimiter } from "../_shared/rateLimit.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QualityMetrics {
  clarity: number;          // 1-5: Is question clear and unambiguous?
  difficulty_accuracy: number; // 1-5: Does difficulty match content?
  answer_correctness: number;  // 1-5: Is correct answer truly correct?
  distractor_quality: number;  // 1-5: Are wrong answers plausible?
  explanation_quality: number; // 1-5: Is explanation helpful?
}

interface ScoredQuestion {
  question_hash: string;
  overall_score: number;
  metrics: QualityMetrics;
  feedback: string;
  approved: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // ✅ Rate limiting - 5 requests per minute per user
    if (!rateLimiter.check(user.id, 5, 60000)) {
      console.warn(`⚠️ [Quality Score] Rate limit exceeded for user: ${user.id}`);
      return new Response(
        JSON.stringify({ error: "تم تجاوز الحد المسموح. يرجى الانتظار دقيقة." }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (jsonError) {
      throw new Error('Invalid JSON in request body');
    }

    const { questions, mode = 'auto' } = requestBody;

    // Validate input
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid or empty questions array. Expected: { questions: [...], mode?: "auto"|"ai" }');
    }

    console.log(`🎯 Quality scoring ${questions.length} questions in ${mode} mode`);

    const scoredQuestions: ScoredQuestion[] = [];

    for (const question of questions) {
      // Validate question structure
      if (!question.question || !question.options || !question.correctAnswer) {
        console.warn('⚠️ Skipping invalid question:', question);
        continue;
      }
      let score: ScoredQuestion;

      if (mode === 'auto') {
        // Automated heuristic scoring
        score = await scoreQuestionHeuristic(question);
      } else if (mode === 'ai') {
        // AI-powered scoring (more accurate but slower)
        score = await scoreQuestionWithAI(question, supabase);
      } else {
        throw new Error('Invalid scoring mode');
      }

      scoredQuestions.push(score);

      // Store score in ai_training_examples if approved
      if (score.approved && score.overall_score >= 4) {
        await supabase
          .from('ai_training_examples' as any)
          .upsert({
            question_text: question.question,
            options: question.options,
            correct_answer: question.correctAnswer,
            explanation: question.explanation,
            section: question.section,
            test_type: question.testType,
            difficulty: question.difficulty,
            subject: question.topic,
            quality_score: score.overall_score,
            updated_at: new Date().toISOString()
          }, { onConflict: 'question_text' });
      }
    }

    // Calculate statistics
    if (scoredQuestions.length === 0) {
      throw new Error('No valid questions to score');
    }

    const avgScore = scoredQuestions.reduce((sum, q) => sum + q.overall_score, 0) / scoredQuestions.length;
    const approved = scoredQuestions.filter(q => q.approved).length;

    console.log(`✅ Scoring complete: avg=${avgScore.toFixed(2)}, approved=${approved}/${scoredQuestions.length}`);

    return new Response(
      JSON.stringify({
        scored_questions: scoredQuestions,
        statistics: {
          total: scoredQuestions.length,
          average_score: avgScore,
          approved_count: approved,
          approval_rate: (approved / scoredQuestions.length) * 100
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Quality scoring error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Heuristic-based scoring (fast)
async function scoreQuestionHeuristic(question: any): Promise<ScoredQuestion> {
  const metrics: QualityMetrics = {
    clarity: 0,
    difficulty_accuracy: 0,
    answer_correctness: 0,
    distractor_quality: 0,
    explanation_quality: 0
  };

  let feedback: string[] = [];

  // 1. Clarity check
  const questionLength = question.question?.length || 0;
  if (questionLength < 20) {
    metrics.clarity = 2;
    feedback.push('السؤال قصير جداً');
  } else if (questionLength > 500) {
    metrics.clarity = 3;
    feedback.push('السؤال طويل جداً');
  } else {
    metrics.clarity = 5;
  }

  // 2. Options check
  const optionsCount = question.options ? Object.keys(question.options).length : 0;
  if (optionsCount !== 4) {
    metrics.distractor_quality = 2;
    feedback.push(`عدد الخيارات غير صحيح: ${optionsCount}`);
  } else {
    metrics.distractor_quality = 4;
  }

  // 3. Answer correctness (check if correct answer exists in options)
  const hasCorrectAnswer = question.options && question.correctAnswer 
    ? Object.values(question.options).includes(question.correctAnswer)
    : false;
  metrics.answer_correctness = hasCorrectAnswer ? 5 : 1;
  if (!hasCorrectAnswer) {
    feedback.push('الإجابة الصحيحة غير موجودة في الخيارات');
  }

  // 4. Explanation quality
  const explanationLength = question.explanation?.length || 0;
  if (explanationLength < 20) {
    metrics.explanation_quality = 2;
    feedback.push('الشرح قصير جداً');
  } else if (explanationLength > 300) {
    metrics.explanation_quality = 4;
  } else {
    metrics.explanation_quality = 5;
  }

  // 5. Difficulty accuracy (simple heuristic)
  metrics.difficulty_accuracy = 4; // Default neutral

  // Calculate overall score
  const overall = Object.values(metrics).reduce((sum, val) => sum + val, 0) / 5;
  const approved = overall >= 3.5 && metrics.answer_correctness >= 4;

  return {
    question_hash: generateHash(question.question),
    overall_score: Math.round(overall * 10) / 10,
    metrics,
    feedback: feedback.join('; ') || 'جودة مقبولة',
    approved
  };
}

// AI-powered scoring (slower but more accurate)
async function scoreQuestionWithAI(question: any, supabase: any): Promise<ScoredQuestion> {
  // Call Lovable AI for deep quality analysis
  const prompt = `قيّم جودة هذا السؤال من 1-5 في المجالات التالية:
1. الوضوح (clarity)
2. دقة مستوى الصعوبة (difficulty_accuracy)
3. صحة الإجابة (answer_correctness)
4. جودة الخيارات المشتتة (distractor_quality)
5. جودة الشرح (explanation_quality)

السؤال: ${question.question}
الخيارات: ${JSON.stringify(question.options)}
الإجابة الصحيحة: ${question.correctAnswer}
الشرح: ${question.explanation}

أرجع JSON فقط بهذا الشكل:
{
  "clarity": <رقم>,
  "difficulty_accuracy": <رقم>,
  "answer_correctness": <رقم>,
  "distractor_quality": <رقم>,
  "explanation_quality": <رقم>,
  "feedback": "<ملاحظات>"
}`;

  try {
    const aiResponse = await fetch(`https://api.lovable.app/v1/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        prompt,
        temperature: 0.3
      })
    });

    const aiData = await aiResponse.json();
    const result = JSON.parse(aiData.content);

    const overall = (
      result.clarity +
      result.difficulty_accuracy +
      result.answer_correctness +
      result.distractor_quality +
      result.explanation_quality
    ) / 5;

    return {
      question_hash: generateHash(question.question),
      overall_score: Math.round(overall * 10) / 10,
      metrics: result,
      feedback: result.feedback,
      approved: overall >= 3.5 && result.answer_correctness >= 4
    };
  } catch (error) {
    console.error('AI scoring failed, falling back to heuristic:', error);
    return scoreQuestionHeuristic(question);
  }
}

function generateHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
