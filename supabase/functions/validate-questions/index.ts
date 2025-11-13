import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}

function validateQuestion(question: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  // 1. Check JSON structure
  if (!question.question_text || !question.options || !question.correct_answer) {
    errors.push("هيكل JSON غير كامل");
    score -= 50;
  }

  // 2. Check Arabic text quality
  const arabicRegex = /[\u0600-\u06FF]/;
  if (question.question_text && !arabicRegex.test(question.question_text)) {
    errors.push("النص لا يحتوي على عربي");
    score -= 30;
  }

  // 3. Check correct answer exists in options
  if (question.options && question.correct_answer) {
    const options = Object.values(question.options || {});
    if (!options.includes(question.correct_answer)) {
      errors.push("الإجابة الصحيحة غير موجودة في الخيارات");
      score -= 40;
    }

    // 4. Check options count (should be 4-5)
    if (options.length < 4 || options.length > 5) {
      warnings.push(`عدد الخيارات غير مناسب (${options.length})`);
      score -= 10;
    }

    // 5. Check for duplicate options
    if (new Set(options).size !== options.length) {
      errors.push("يوجد خيارات مكررة");
      score -= 20;
    }
  }

  // 6. Check explanation exists and meaningful
  if (!question.explanation || question.explanation.length < 20) {
    warnings.push("الشرح قصير جداً أو غير موجود");
    score -= 10;
  }

  // 7. Check question length (should be reasonable)
  if (question.question_text) {
    if (question.question_text.length < 20) {
      warnings.push("السؤال قصير جداً");
      score -= 5;
    }
    if (question.question_text.length > 500) {
      warnings.push("السؤال طويل جداً");
      score -= 5;
    }
  }

  return {
    isValid: errors.length === 0 && score >= 60,
    errors,
    warnings,
    score: Math.max(0, score)
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questions } = await req.json();

    if (!Array.isArray(questions)) {
      throw new Error("Questions must be an array");
    }

    console.log(`🛡️ Validating ${questions.length} questions...`);

    const results = questions.map((q: any, index: number) => ({
      index,
      question_hash: q.question_hash,
      validation: validateQuestion(q)
    }));

    const validQuestions = results.filter(r => r.validation.isValid);
    const invalidQuestions = results.filter(r => !r.validation.isValid);

    console.log(`✅ Valid: ${validQuestions.length}/${questions.length}`);
    console.log(`❌ Invalid: ${invalidQuestions.length}/${questions.length}`);

    // Log details for invalid questions
    if (invalidQuestions.length > 0) {
      invalidQuestions.forEach(r => {
        console.error(`Question ${r.index}: Score ${r.validation.score}, Errors: ${r.validation.errors.join(', ')}`);
      });
    }

    return new Response(JSON.stringify({
      total: questions.length,
      valid: validQuestions.length,
      invalid: invalidQuestions.length,
      results,
      validQuestions: validQuestions.map(r => questions[r.index]),
      invalidDetails: invalidQuestions.map(r => ({
        index: r.index,
        errors: r.validation.errors,
        warnings: r.validation.warnings,
        score: r.validation.score
      }))
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("❌ Validation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: "Failed to validate questions"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
