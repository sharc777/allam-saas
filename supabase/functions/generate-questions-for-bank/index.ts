import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSmartTrainingExamples, getTopicInfo } from "../_shared/smartTrainingExamples.ts";
import { buildAdvancedPrompt } from "../_shared/advancedPromptBuilder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  section: 'كمي' | 'لفظي';
  subTopic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  count: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authorization - support both admin JWT and internal service calls
    const authHeader = req.headers.get("Authorization");
    const cronSecret = req.headers.get("x-cron-secret");
    const envCronSecret = Deno.env.get("CRON_SECRET");
    
    console.log(`🔐 Auth check - cronSecret received: ${cronSecret ? 'yes' : 'no'}, envCronSecret set: ${envCronSecret ? 'yes' : 'no'}`);
    
    // Allow internal service calls with cron secret
    const isInternalCall = cronSecret && envCronSecret && cronSecret === envCronSecret;
    
    if (!isInternalCall) {
      if (!authHeader) {
        console.log(`❌ No auth header and cron secret mismatch`);
        return new Response(JSON.stringify({ error: "No authorization" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!roleData) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    
    console.log(`🔐 Auth: ${isInternalCall ? 'Internal service call' : 'Admin user'}`)

    const { section, subTopic, difficulty, count = 10 }: GenerateRequest = await req.json();

    console.log(`🚀 Starting generation: ${count} questions for ${subTopic} (${section}/${difficulty})`);

    // 1. Get topic info from sub_topic
    const { topic } = getTopicInfo(subTopic);
    console.log(`📂 Topic mapping: ${subTopic} -> ${topic} (${section})`);

    // 2. Fetch smart training examples (5 instead of 3)
    const examples = await getSmartTrainingExamples(supabase, subTopic, difficulty, 5);
    console.log(`📚 Found ${examples.length} training examples`);

    // 3. Build advanced prompt
    const prompt = buildAdvancedPrompt({
      subTopic,
      difficulty,
      count,
      examples,
      section,
      topic
    });

    // 4. Call Lovable AI
    console.log(`🤖 Calling AI to generate ${count} questions...`);
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("❌ AI Error:", errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "API credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // 5. Parse JSON from response
    let questions: any[] = [];
    try {
      // Clean up response - remove markdown code blocks if present
      let cleanContent = content.trim();
      
      // Remove ```json or ``` markers more aggressively
      cleanContent = cleanContent.replace(/^```(?:json)?\s*/gi, '');
      cleanContent = cleanContent.replace(/```\s*$/gi, '');
      cleanContent = cleanContent.trim();
      
      // Try to find JSON array
      const arrayMatch = cleanContent.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        try {
          questions = JSON.parse(arrayMatch[0]);
        } catch {
          // If parsing fails, try to extract complete question objects
          console.log("⚠️ Full JSON parse failed, attempting to extract complete questions...");
          questions = extractCompleteQuestions(cleanContent);
        }
      } else {
        questions = JSON.parse(cleanContent);
      }
    } catch (parseError) {
      console.error("❌ JSON Parse error:", parseError);
      console.error("Raw content (first 1000 chars):", content.substring(0, 1000));
      
      // Last resort: try to extract any complete questions
      try {
        questions = extractCompleteQuestions(content);
        if (questions.length > 0) {
          console.log(`🔄 Recovered ${questions.length} complete questions from truncated response`);
        } else {
          throw new Error("Could not parse AI response as JSON");
        }
      } catch {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("No questions generated or invalid format");
    }

    console.log(`✅ AI generated ${questions.length} questions`);

    // 6. Validate and save questions
    const savedQuestions: any[] = [];
    const errors: any[] = [];
    const duplicates: string[] = [];

    for (const q of questions) {
      try {
        // Validate required fields
        const questionText = q.question || q.question_text;
        const correctAnswer = q.correctAnswer || q.correct_answer;
        const explanation = q.explanation;
        const options = q.options;

        if (!questionText || !options || !correctAnswer || !explanation) {
          errors.push({ question: questionText?.substring(0, 50), error: 'Missing required fields' });
          continue;
        }

        // Validate correct answer format
        if (!['أ', 'ب', 'ج', 'د', 'A', 'B', 'C', 'D'].includes(correctAnswer)) {
          errors.push({ question: questionText?.substring(0, 50), error: 'Invalid correct answer format' });
          continue;
        }

        // Generate unique hash
        const questionHash = await generateQuestionHash(questionText, subTopic);

        // Check for duplicates
        const { data: existing } = await supabase
          .from("questions_bank")
          .select("id")
          .eq("question_hash", questionHash)
          .single();

        if (existing) {
          duplicates.push(questionText.substring(0, 50));
          continue;
        }

        // Normalize correct answer to Arabic
        const normalizedAnswer = normalizeAnswer(correctAnswer);

        // Insert into questions_bank
        const { data: saved, error: insertError } = await supabase
          .from("questions_bank")
          .insert({
            subject: section,
            topic: topic,
            sub_topic: subTopic,
            difficulty: difficulty,
            question_type: "multiple_choice",
            question_text: questionText,
            options: options,
            correct_answer: normalizedAnswer,
            explanation: explanation,
            question_hash: questionHash,
            created_by: "ai",
            validation_status: "approved",
            usage_count: 0,
            times_answered: 0,
            times_correct: 0
          })
          .select()
          .single();

        if (insertError) {
          console.error("Insert error:", insertError);
          errors.push({ question: questionText.substring(0, 50), error: insertError.message });
        } else if (saved) {
          savedQuestions.push(saved);
        }

      } catch (err: any) {
        errors.push({ question: 'Unknown', error: err.message });
      }
    }

    // 7. Update training examples - increment generated_questions_count
    if (examples.length > 0 && savedQuestions.length > 0) {
      for (const example of examples) {
        const currentCount = (example as any).generated_questions_count || 0;
        await supabase
          .from('ai_training_examples')
          .update({ 
            generated_questions_count: currentCount + savedQuestions.length,
            last_used_at: new Date().toISOString()
          })
          .eq('id', example.id);
      }
    }

    // 8. Refresh materialized view (best effort)
    try {
      await supabase.rpc('refresh_questions_stats');
    } catch (refreshError) {
      console.warn('⚠️ Could not refresh materialized view:', refreshError);
    }

    console.log(`✅ Successfully saved ${savedQuestions.length}/${questions.length} questions`);
    console.log(`⚠️ Duplicates skipped: ${duplicates.length}`);
    console.log(`❌ Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        generated: questions.length,
        saved: savedQuestions.length,
        duplicates: duplicates.length,
        errors: errors.length,
        errorDetails: errors.length > 0 ? errors : undefined,
        duplicateDetails: duplicates.length > 0 ? duplicates : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("❌ Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper: Generate unique hash for question
async function generateQuestionHash(questionText: string, subTopic: string): Promise<string> {
  const content = `${questionText}-${subTopic}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

// Helper: Normalize answer to Arabic letters
function normalizeAnswer(answer: string): string {
  const mapping: Record<string, string> = {
    'A': 'أ', 'B': 'ب', 'C': 'ج', 'D': 'د',
    'a': 'أ', 'b': 'ب', 'c': 'ج', 'd': 'د'
  };
  return mapping[answer] || answer;
}

// Helper: Extract complete question objects from potentially truncated JSON
function extractCompleteQuestions(content: string): any[] {
  const questions: any[] = [];
  
  // Remove markdown code blocks
  let cleanContent = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  
  // Try to find complete question objects using regex
  // Match objects that have all required fields: question, options, correctAnswer, explanation
  const questionPattern = /\{\s*"question"\s*:\s*"[^"]+(?:\\.[^"]*)*"\s*,\s*"options"\s*:\s*\{[^}]+\}\s*,\s*"correctAnswer"\s*:\s*"[^"]+"\s*,\s*"explanation"\s*:\s*"[^"]+(?:\\.[^"]*)*"\s*\}/g;
  
  const matches = cleanContent.match(questionPattern);
  
  if (matches) {
    for (const match of matches) {
      try {
        const q = JSON.parse(match);
        if (q.question && q.options && q.correctAnswer && q.explanation) {
          questions.push(q);
        }
      } catch {
        // Skip malformed objects
      }
    }
  }
  
  return questions;
}
