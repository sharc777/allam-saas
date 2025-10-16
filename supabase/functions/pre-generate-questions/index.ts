import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface GenerationConfig {
  test_type: string;
  section: string;
  difficulty: string;
  track?: string;
  count: number;
}

// Simple hash function (faster than SHA-256)
function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function generateQuestionHash(question: any): string {
  const hashInput = `${question.question_text}${JSON.stringify(question.options)}`;
  return simpleHash(hashInput);
}

async function generateQuestionsWithAI(
  supabase: any,
  config: GenerationConfig,
  knowledgeBase: any[]
): Promise<any[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  // Load AI settings
  const { data: settings } = await supabase
    .from("ai_settings")
    .select("*");

  const aiSettings: Record<string, any> = {};
  settings?.forEach((s: any) => {
    aiSettings[s.setting_key] = s.setting_value;
  });

  const model = aiSettings.quiz_model?.model || "google/gemini-2.5-flash";
  const temperature = aiSettings.quiz_generation_temperature?.temperature || 0.7;

  // Build knowledge context
  const knowledgeContext = knowledgeBase.length > 0
    ? `\n\n## المعلومات المتوفرة:\n${knowledgeBase.map((kb) => 
        `### ${kb.title}\n${kb.content}`
      ).join("\n\n")}`
    : "";

  const systemPrompt = `أنت مولد أسئلة ${config.test_type} متخصص في القسم ${config.section}.

المستوى: ${config.difficulty}
المسار: ${config.track || 'عام'}

المطلوب:
- توليد بالضبط ${config.count} سؤال
- كل سؤال يجب أن يكون فريداً ومتنوعاً
- جودة عالية ومناسبة للمستوى المحدد
- خيارات واضحة ومحددة

${knowledgeContext}

## صيغة JSON المطلوبة:
\`\`\`json
{
  "questions": [
    {
      "question_text": "نص السؤال",
      "options": ["أ. الخيار 1", "ب. الخيار 2", "ج. الخيار 3", "د. الخيار 4"],
      "correct_answer": "أ",
      "explanation": "الشرح",
      "difficulty": "${config.difficulty}",
      "topic": "الموضوع"
    }
  ]
}
\`\`\``;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `ولّد ${config.count} سؤال ${config.difficulty} للقسم ${config.section}` 
        }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI Gateway Error:", response.status, errorText);
    throw new Error(`AI generation failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Parse JSON from response
  const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                    content.match(/\{[\s\S]*"questions"[\s\S]*\}/);
  
  if (!jsonMatch) {
    console.error("No JSON found in response:", content);
    return [];
  }

  const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
  return parsed.questions || [];
}

async function cacheQuestions(
  supabase: any,
  questions: any[],
  config: GenerationConfig
): Promise<number> {
  let cached = 0;

  for (const question of questions) {
    const questionHash = generateQuestionHash(question);
    
    // Check if already exists
    const { data: existing } = await supabase
      .from("questions_cache")
      .select("id")
      .eq("question_hash", questionHash)
      .maybeSingle();

    if (existing) continue;

    // Insert into cache
    const { error } = await supabase
      .from("questions_cache")
      .insert({
        test_type: config.test_type,
        section: config.section,
        difficulty: config.difficulty,
        track: config.track || 'عام',
        question_data: question,
        question_hash: questionHash,
        is_used: false
      });

    if (!error) cached++;
  }

  return cached;
}

async function getCacheStats(supabase: any): Promise<any> {
  const { data } = await supabase
    .from("questions_cache")
    .select("test_type, section, difficulty, track, is_used")
    .eq("is_used", false);

  const stats: Record<string, number> = {};
  
  data?.forEach((item: any) => {
    const key = `${item.test_type}_${item.section}_${item.difficulty}_${item.track}`;
    stats[key] = (stats[key] || 0) + 1;
  });

  return stats;
}

serve(async (req) => {
if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Extract JWT from Authorization header
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!jwt) {
      console.error('Missing JWT in Authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authentication token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client with JWT in headers
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: `Bearer ${jwt}`
          }
        }
      }
    );

    // Verify authentication by passing JWT explicitly
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: isAdminData } = await supabase.rpc('is_admin', { user_id: user.id });
    if (!isAdminData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action, configs } = await req.json();

    // Get current cache stats
    if (action === 'stats') {
      const stats = await getCacheStats(supabase);
      return new Response(JSON.stringify({ stats }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate and cache questions
    if (action === 'generate') {
      const generationConfigs: GenerationConfig[] = configs || [
        // Default generation for قدرات
        { test_type: 'قدرات', section: 'كمي', difficulty: 'easy', track: 'عام', count: 30 },
        { test_type: 'قدرات', section: 'كمي', difficulty: 'medium', track: 'عام', count: 30 },
        { test_type: 'قدرات', section: 'كمي', difficulty: 'hard', track: 'عام', count: 20 },
        { test_type: 'قدرات', section: 'لفظي', difficulty: 'easy', track: 'عام', count: 30 },
        { test_type: 'قدرات', section: 'لفظي', difficulty: 'medium', track: 'عام', count: 30 },
        { test_type: 'قدرات', section: 'لفظي', difficulty: 'hard', track: 'عام', count: 20 },
      ];

      const results = [];

      for (const config of generationConfigs) {
        console.log(`Generating for ${config.test_type}/${config.section}/${config.difficulty}...`);

        // Load knowledge base
        const { data: knowledgeBase } = await supabase
          .from("knowledge_base")
          .select("title, content")
          .eq("test_type", config.test_type)
          .eq("is_active", true)
          .limit(5);

        // Generate questions
        const questions = await generateQuestionsWithAI(
          supabase,
          config,
          knowledgeBase || []
        );

        // Cache them
        const cached = await cacheQuestions(supabase, questions, config);

        results.push({
          config,
          generated: questions.length,
          cached
        });

        console.log(`✓ Cached ${cached}/${questions.length} questions`);
      }

      // Get updated stats
      const stats = await getCacheStats(supabase);

      return new Response(JSON.stringify({ 
        success: true,
        results,
        stats
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Clean expired reservations
    if (action === 'clean') {
      await supabase.rpc('clean_expired_cache_reservations');
      const stats = await getCacheStats(supabase);
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Expired reservations cleaned',
        stats
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in pre-generate-questions:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
