import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============= HELPER FUNCTIONS =============

async function authenticateUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) throw new Error("Missing authorization header");

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error("Unauthorized");

  return { user, supabase };
}

async function loadContent(supabase: any, params: any) {
  const { contentId, dayNumber, mode } = params;
  
  if (mode === "practice") {
    return {
      title: "اختبار تدريبي شامل",
      description: "اختبار تدريبي يغطي جميع المواضيع",
      content_text: "",
      topics: null
    };
  }
  
  if (mode === "initial_assessment") {
    return {
      title: "التقييم الأولي",
      description: "اختبار شامل لتحديد مستواك الحالي",
      content_text: "",
      topics: null
    };
  }
  
  let query = supabase.from("daily_content").select("*");
  if (contentId) query = query.eq("id", contentId);
  else if (dayNumber) query = query.eq("day_number", dayNumber);
  else throw new Error("يجب تحديد contentId أو dayNumber أو mode");
  
  const { data, error } = await query.single();
  if (error && mode !== "practice") throw new Error("المحتوى غير موجود");
  
  return data;
}

async function loadKnowledgeBase(supabase: any, params: any) {
  const { testType, track, mode, sectionFilter } = params;
  const isPractice = mode === 'practice';
  
  let query = supabase
    .from("knowledge_base")
    .select("*")
    .eq("test_type", testType)
    .eq("track", track)
    .eq("is_active", true);
  
  const limit = isPractice ? 20 : 5;
  const { data: kbData } = await query.limit(limit);
  
  let knowledgeData = kbData || [];
  
  // Filter by section if specified
  if (sectionFilter && knowledgeData.length > 0) {
    const sectionKeyword = sectionFilter === "لفظي" ? "القسم اللفظي" : "القسم الكمي";
    const filtered = knowledgeData.filter((kb: any) => 
      kb.related_topics?.some((rt: string) => rt.includes(sectionKeyword))
    );
    if (filtered.length > 0) knowledgeData = filtered;
  }
  
  const availableTopics = knowledgeData.map((kb: any) => kb.title);
  const allRelatedTopics = knowledgeData.flatMap((kb: any) => kb.related_topics || []);
  const additionalKnowledge = knowledgeData.length > 0
    ? "\n\n📚 **المحتوى المعرفي:**\n" + 
      knowledgeData.map((kb: any) => `**${kb.title}:**\n${kb.content?.substring(0, 400)}...\n`).join("\n")
    : "";
  
  return { knowledgeData, availableTopics, allRelatedTopics, additionalKnowledge };
}

async function loadAISettings(supabase: any) {
  const { data: aiSettingsData } = await supabase.from("ai_settings").select("*");
  const aiSettings: Record<string, any> = {};
  aiSettingsData?.forEach((setting: any) => {
    aiSettings[setting.setting_key] = setting.setting_value;
  });
  
  return {
    quizLimits: aiSettings.quiz_limits || { min_questions: 5, max_questions: 50, default_questions: 10 },
    quizModel: aiSettings.quiz_model?.model || "google/gemini-2.5-flash",
    quizTemp: aiSettings.quiz_generation_temperature?.temperature || 0.7,
    systemPromptOverride: aiSettings.system_prompt?.ar || ""
  };
}

function buildSystemPrompt(params: any) {
  const { testType, sectionFilter, targetQuestions, difficulty, availableTopics, allRelatedTopics, systemPromptOverride, isPractice } = params;
  
  let prompt = systemPromptOverride ? `${systemPromptOverride}\n\n` : "";
  
  // Add KB topics if available
  if (isPractice && availableTopics.length > 0) {
    prompt += `📚 **المواضيع المتاحة:**\n${availableTopics.map((t: string, i: number) => `${i+1}. ${t}`).join('\n')}\n\n`;
    prompt += `⚠️ جميع الأسئلة من المواضيع أعلاه فقط${sectionFilter ? ` (${sectionFilter} حصرياً)` : ''}\n\n`;
  }
  
  // Test type specific prompts
  if (testType === "قدرات") {
    if (sectionFilter === "كمي") {
      prompt += `🔢 **القسم الكمي - رياضيات:** ${targetQuestions} سؤال
**الأنواع:** الحساب، الجبر، الهندسة، الإحصاء، مسائل منطقية
⚠️ رياضيات فقط - كل سؤال يحتوي أرقام أو معادلات`;
    } else if (sectionFilter === "لفظي") {
      prompt += `📝 **القسم اللفظي - لغة عربية:** ${targetQuestions} سؤال
**الأنواع:** استيعاب المقروء، إكمال الجمل، التناظر، الخطأ السياقي
⚠️ لغة عربية فقط - لا أرقام نهائياً`;
    } else {
      prompt += `📋 **اختبار قدرات متنوع:** 5 لفظي + 5 كمي`;
    }
  } else if (testType === "تحصيلي") {
    prompt += `📚 **اختبار تحصيلي:** ${targetQuestions} سؤال`;
  }
  
  return prompt;
}

function buildUserPrompt(params: any) {
  const { mode, testType, targetQuestions, content, additionalKnowledge, sectionFilter, isInitialAssessment } = params;
  
  if (mode === 'practice' || isInitialAssessment) {
    return `قم بتوليد ${targetQuestions} سؤال ${sectionFilter || ''} بناءً على المنهج:
${additionalKnowledge}

⚠️ **متطلبات:**
${sectionFilter ? `- ${targetQuestions} سؤال ${sectionFilter} فقط` : '- أسئلة متنوعة'}
- كل سؤال له 4 خيارات مختلفة
- الإجابة الصحيحة من ضمن الخيارات
- تفسير واضح ومفيد`;
  }
  
  return `قم بتوليد ${targetQuestions} سؤال ${sectionFilter || ''} من المحتوى:

📚 **المحتوى:**
${content.title}
${content.content_text || ""}
${additionalKnowledge}

⚠️ **متطلبات:**
${sectionFilter ? `- ${targetQuestions} سؤال ${sectionFilter} فقط` : ''}
- أسئلة واضحة ومباشرة
- 4 خيارات مختلفة لكل سؤال
- تفسير تعليمي مفصل`;
}

async function generateWithAI(apiKey: string, systemPrompt: string, userPrompt: string, model: string, temp: number) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: temp,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      tools: [{
        type: "function",
        function: {
          name: "generate_quiz",
          description: "Generate quiz questions",
          parameters: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question_text: { type: "string" },
                    options: { type: "array", items: { type: "string" } },
                    correct_answer: { type: "string" },
                    explanation: { type: "string" },
                    section: { type: "string", enum: ["لفظي", "كمي"] },
                    subject: { type: "string" },
                    question_type: { type: "string" },
                    difficulty: { type: "string" },
                    topic: { type: "string" }
                  },
                  required: ["question_text", "options", "correct_answer", "explanation", "section", "question_type"]
                }
              }
            },
            required: ["questions"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "generate_quiz" } }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI Gateway error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("تم تجاوز الحد المسموح. يرجى المحاولة لاحقاً.");
    }
    if (response.status === 402) {
      throw new Error("يرجى إضافة رصيد للمتابعة.");
    }
    throw new Error(`فشل توليد الأسئلة: ${response.status}`);
  }

  const result = await response.json();
  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("Failed to generate quiz");

  const quizData = JSON.parse(toolCall.function.arguments);
  return quizData.questions || [];
}

async function calculateQuestionHashes(questions: any[]) {
  const crypto = await import("https://deno.land/std@0.177.0/crypto/mod.ts");
  
  return await Promise.all(
    questions.map(async (q: any) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(q.question_text || "");
      const hashBuffer = await crypto.crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return { ...q, question_hash: hashHex };
    })
  );
}

function filterBySection(questions: any[], sectionFilter: string | null, testType: string) {
  if (!sectionFilter || testType !== "قدرات") return questions;
  
  const mathKeywords = ['نسبة', 'معادلة', 'مجموع', 'مساحة', 'محيط', 'جذر', 'ضرب', 'قسمة'];
  
  return questions.filter((q: any) => {
    const text = q.question_text?.toLowerCase() || "";
    const hasNumbers = /\d/.test(text);
    const hasMathWords = mathKeywords.some(kw => text.includes(kw));
    
    if (sectionFilter === "كمي") {
      return q.section === "كمي" || hasNumbers || hasMathWords;
    } else {
      return q.section === "لفظي" && !hasNumbers && !hasMathWords;
    }
  });
}

function validateQuestions(questions: any[]) {
  return questions.filter((q: any) => {
    if (!q.question_text || !q.explanation) return false;
    if (!q.options || q.options.length !== 4) return false;
    if (!q.options.includes(q.correct_answer)) return false;
    const uniqueOptions = new Set(q.options);
    if (uniqueOptions.size !== 4) return false;
    return true;
  });
}

async function fillFromQuestionBank(supabase: any, missing: number, params: any) {
  const { sectionFilter, difficulty, testType, availableTopics, allRelatedTopics, isPractice } = params;
  
  // Try 1: Exact match
  let query = supabase.from("questions_bank").select("*");
  if (sectionFilter) query = query.eq("subject", sectionFilter);
  query = query.eq("difficulty", difficulty);
  
  let { data: bankQuestions } = await query.limit(missing * 2);
  
  // Try 2: Relax difficulty
  if (!bankQuestions || bankQuestions.length < missing) {
    query = supabase.from("questions_bank").select("*");
    if (sectionFilter) query = query.eq("subject", sectionFilter);
    const result = await query.limit(missing * 3);
    bankQuestions = result.data;
  }
  
  if (!bankQuestions || bankQuestions.length === 0) return [];
  
  return bankQuestions
    .filter((q: any) => {
      // Topic filter for practice mode
      if (availableTopics.length > 0 && isPractice) {
        const topic = q.topic?.toLowerCase() || "";
        return availableTopics.some((t: string) => 
          topic.includes(t.toLowerCase()) || 
          allRelatedTopics.some((rt: string) => topic.includes(rt.toLowerCase()))
        );
      }
      return true;
    })
    .slice(0, missing)
    .map((q: any) => ({
      question_text: q.question_text,
      options: q.options || [],
      correct_answer: q.correct_answer,
      explanation: q.explanation || "لا يوجد تفسير",
      section: sectionFilter || q.subject || "عام",
      subject: q.subject || "",
      question_type: q.question_type || "multiple_choice",
      difficulty: q.difficulty || difficulty,
      topic: q.topic || "",
      question_hash: ""
    }));
}

async function topupWithAI(apiKey: string, missing: number, systemPrompt: string, params: any) {
  const { sectionFilter, availableTopics } = params;
  
  const topupPrompt = `قم بتوليد ${missing} سؤال ${sectionFilter || ''} فقط:

⚠️ **مهم:**
- ${missing} سؤال بالضبط
${sectionFilter ? `- ${sectionFilter} حصرياً` : ''}
${availableTopics.length > 0 ? `- المواضيع: ${availableTopics.slice(0, 5).join('، ')}` : ''}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        temperature: 0.8,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: topupPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_quiz",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question_text: { type: "string" },
                      options: { type: "array", items: { type: "string" } },
                      correct_answer: { type: "string" },
                      explanation: { type: "string" },
                      section: { type: "string" },
                      subject: { type: "string" },
                      question_type: { type: "string" },
                      difficulty: { type: "string" },
                      topic: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_quiz" } }
      }),
    });
    
    if (!response.ok) return [];
    
    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return [];
    
    const data = JSON.parse(toolCall.function.arguments);
    return (data.questions || []).slice(0, missing);
  } catch (error) {
    console.error("Top-up failed:", error);
    return [];
  }
}

async function logQuestions(supabase: any, userId: string, questions: any[], dayNumber: number) {
  const questionsToLog = questions.map((q: any) => ({
    user_id: userId,
    question_hash: q.question_hash,
    question_data: q,
    day_number: dayNumber || 0,
  }));
  
  const { error } = await supabase.from("generated_questions_log").insert(questionsToLog);
  if (error) console.warn("Failed to log questions:", error);
  else console.log(`✅ Logged ${questionsToLog.length} questions`);
}

// ============= MAIN HANDLER =============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const params = await req.json();
    const { dayNumber, difficulty = "medium", testType = "قدرات", track = "عام", mode, questionCount, sectionFilter } = params;
    
    // 1. Authenticate
    const { user, supabase } = await authenticateUser(req);
    console.log("✅ User authenticated:", user.id);
    
    // 2. Load content, KB, and AI settings in parallel
    const [content, kbResult, aiSettings, prevHashesData] = await Promise.all([
      loadContent(supabase, params),
      loadKnowledgeBase(supabase, { ...params, testType, track }),
      loadAISettings(supabase),
      supabase
        .from("generated_questions_log")
        .select("question_hash")
        .eq("user_id", user.id)
        .limit(500)
    ]);
    
    const { knowledgeData, availableTopics, allRelatedTopics, additionalKnowledge } = kbResult;
    console.log(`📚 KB loaded: ${availableTopics.length} topics`);
    
    const { quizLimits, quizModel, quizTemp, systemPromptOverride } = aiSettings;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    
    const usedHashes = new Set(prevHashesData.data?.map(p => p.question_hash) || []);
    
    // 3. Calculate question counts
    const isPractice = mode === 'practice';
    const isInitialAssessment = mode === 'initial_assessment';
    const baseQuestions = questionCount || (isInitialAssessment ? 25 : quizLimits.default_questions);
    const targetQuestions = Math.max(quizLimits.min_questions, Math.min(quizLimits.max_questions, baseQuestions));
    const bufferQuestions = Math.ceil(targetQuestions * 1.5);
    
    console.log(`🎯 Target: ${targetQuestions}, Buffer: ${bufferQuestions}`);
    
    // 4. Build prompts
    const systemPrompt = buildSystemPrompt({ 
      testType, sectionFilter, targetQuestions, difficulty, 
      availableTopics, allRelatedTopics, systemPromptOverride, isPractice 
    });
    const userPrompt = buildUserPrompt({ 
      mode, testType, targetQuestions, content, additionalKnowledge, 
      sectionFilter, isInitialAssessment 
    });
    
    // 5. Generate questions with AI
    let allQuestions = await generateWithAI(LOVABLE_API_KEY, systemPrompt, userPrompt, quizModel, quizTemp);
    console.log(`🤖 AI generated: ${allQuestions.length} questions`);
    
    // 6. Calculate hashes and filter duplicates
    const questionsWithHash = await calculateQuestionHashes(allQuestions);
    let uniqueQuestions = questionsWithHash.filter(q => !usedHashes.has(q.question_hash));
    console.log(`✅ Unique: ${uniqueQuestions.length}/${allQuestions.length}`);
    
    // 7. Filter by section and validate
    uniqueQuestions = filterBySection(uniqueQuestions, sectionFilter, testType);
    uniqueQuestions = validateQuestions(uniqueQuestions);
    console.log(`✅ Valid: ${uniqueQuestions.length}`);
    
    // 8. Fill missing questions (single attempt)
    let finalQuestions = uniqueQuestions.slice(0, targetQuestions);
    let missing = targetQuestions - finalQuestions.length;
    
    if (missing > 0) {
      console.log(`⚠️ Missing ${missing} questions, filling...`);
      
      // Try question bank first
      const bankQuestions = await fillFromQuestionBank(supabase, missing, {
        sectionFilter, difficulty, testType, availableTopics, allRelatedTopics, isPractice
      });
      finalQuestions.push(...bankQuestions);
      missing = targetQuestions - finalQuestions.length;
      console.log(`📦 Added ${bankQuestions.length} from bank, still need: ${missing}`);
      
      // Single AI top-up if needed
      if (missing > 0) {
        const topupQuestions = await topupWithAI(LOVABLE_API_KEY, missing, systemPrompt, {
          sectionFilter, availableTopics
        });
        const validTopup = validateQuestions(topupQuestions).slice(0, missing);
        finalQuestions.push(...validTopup);
        console.log(`🔝 Added ${validTopup.length} from AI top-up`);
      }
    }
    
    // 9. Final check
    finalQuestions = finalQuestions.slice(0, targetQuestions);
    if (finalQuestions.length < targetQuestions) {
      throw new Error(`عدد الأسئلة غير كافٍ (${finalQuestions.length}/${targetQuestions})`);
    }
    
    console.log(`✅ Success: ${finalQuestions.length}/${targetQuestions} questions`);
    
    // 10. Log questions
    await logQuestions(supabase, user.id, finalQuestions, dayNumber);
    
    // 11. Return response
    return new Response(
      JSON.stringify({
        questions: finalQuestions,
        dayNumber,
        contentTitle: content.title,
        testType,
        track
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("Generate quiz error:", e);
    return new Response(
      JSON.stringify({ 
        error: e instanceof Error ? e.message : "حدث خطأ غير متوقع",
        details: e instanceof Error ? e.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
