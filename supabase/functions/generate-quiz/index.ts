// Force types.ts rebuild for Phase 2 integration
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { selectFewShotExamples, injectFewShotExamples } from "../_shared/selectFewShotExamples.ts";
import { 
  loadUserWeaknesses, 
  calculateStudentLevel, 
  calculateDynamicTemperature,
  buildDynamicSystemPrompt 
} from "../_shared/dynamicPrompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============= HELPER FUNCTIONS =============

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

// Input sanitization helper
function sanitizeTopicFilter(topic: string | undefined): string | undefined {
  if (!topic) return undefined;
  
  // Remove potential SQL injection or XSS
  const sanitized = topic
    .replace(/[<>\"'`;()]/g, '')
    .trim()
    .substring(0, 100);
  
  return sanitized.length >= 3 ? sanitized : undefined;
}

// Question count validation
function validateQuestionCount(count: number | undefined, defaults: any): number {
  if (!count) return defaults.default_questions;
  return Math.min(Math.max(count, defaults.min_questions), defaults.max_questions);
}

// ============= CACHE FUNCTIONS =============

async function fetchFromCache(
  supabase: any,
  targetCount: number,
  params: {
    testType: string;
    section: string;
    difficulty: string;
    track: string;
    userId: string;
  }
): Promise<any[]> {
  const { testType, section, difficulty, track, userId } = params;
  
  console.log(`🔍 Checking cache: ${testType}/${section}/${difficulty}/${track}`);
  
  // Clean expired reservations first
  await supabase.rpc('clean_expired_cache_reservations');
  
  // Fetch from cache with reservation
  const { data: cachedQuestions, error } = await supabase
    .from('questions_cache')
    .select('*')
    .eq('test_type', testType)
    .eq('section', section)
    .eq('difficulty', difficulty)
    .eq('track', track)
    .eq('is_used', false)
    .is('reserved_by', null)
    .limit(targetCount);
  
  if (error) {
    console.error('Cache fetch error:', error);
    return [];
  }
  
  if (!cachedQuestions || cachedQuestions.length === 0) {
    console.log('❌ Cache miss - no questions available');
    return [];
  }
  
  // Shuffle to randomize selection
  const shuffled = cachedQuestions.sort(() => Math.random() - 0.5);
  
  // Take only what we need
  const selected = shuffled.slice(0, targetCount);
  
  // Reserve these questions
  const questionIds = selected.map((q: any) => q.id);
  await supabase
    .from('questions_cache')
    .update({ 
      reserved_by: userId, 
      reserved_at: new Date().toISOString() 
    })
    .in('id', questionIds);
  
  console.log(`✅ Cache hit: ${selected.length} questions (shuffled from ${cachedQuestions.length})`);
  
  // Convert to quiz format
  return selected.map((q: any) => ({
    ...q.question_data,
    question_hash: q.question_hash
  }));
}

async function markCacheAsUsed(supabase: any, questions: any[]): Promise<void> {
  const hashes = questions
    .map(q => q.question_hash)
    .filter(h => h);
  
  if (hashes.length === 0) return;
  
  await supabase
    .from('questions_cache')
    .update({ 
      is_used: true, 
      used_at: new Date().toISOString() 
    })
    .in('question_hash', hashes);
  
  console.log(`✅ Marked ${hashes.length} cache questions as used`);
}

async function checkCacheStatus(
  supabase: any,
  params: {
    testType: string;
    section: string;
    difficulty: string;
    track: string;
  }
): Promise<{ available: number; total: number }> {
  const { testType, section, difficulty, track } = params;
  
  const [availableResult, totalResult] = await Promise.all([
    supabase
      .from('questions_cache')
      .select('id', { count: 'exact', head: true })
      .eq('test_type', testType)
      .eq('section', section)
      .eq('difficulty', difficulty)
      .eq('track', track)
      .eq('is_used', false),
    supabase
      .from('questions_cache')
      .select('id', { count: 'exact', head: true })
      .eq('test_type', testType)
      .eq('section', section)
      .eq('difficulty', difficulty)
      .eq('track', track)
  ]);
  
  return {
    available: availableResult.count || 0,
    total: totalResult.count || 0
  };
}

// ============= AUTHENTICATION =============

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
  
  const quizLimits = aiSettings.quiz_limits || { min_questions: 5, max_questions: 50, default_questions: 10 };
  const tempSettings = aiSettings.quiz_generation_temperature || { temperature: 0.9 };
  
  return {
    quizLimits,
    quizModel: aiSettings.quiz_model?.model || "google/gemini-2.5-flash",
    quizTemp: tempSettings.temperature || 0.9,
    diversityBoost: tempSettings.diversity_boost || 1.5,
    antiRepetition: tempSettings.anti_repetition !== false,
    bufferMultiplier: quizLimits.buffer_multiplier || 2.0,
    systemPromptOverride: aiSettings.system_prompt?.ar || ""
  };
}

function extractConcept(questionText: string): string {
  const numbers = (questionText.match(/\d+/g) || []).length;
  const hasPercentage = questionText.includes('%') || questionText.includes('نسبة');
  const hasFractions = questionText.includes('/');
  const hasSqrt = questionText.includes('√') || questionText.includes('جذر');
  const hasGeometry = /مساحة|محيط|حجم|زاوية/.test(questionText);
  
  return `nums:${numbers}_pct:${hasPercentage}_frac:${hasFractions}_sqrt:${hasSqrt}_geo:${hasGeometry}`;
}

async function generateWithExplicitDiversity(
  apiKey: string,
  missing: number,
  systemPrompt: string,
  params: any,
  usedConcepts: Set<string>
) {
  const { sectionFilter, availableTopics } = params;
  
  const conceptsList = Array.from(usedConcepts).slice(0, 5).join('، ');
  
  const diversityPrompt = `قم بتوليد ${missing} سؤال ${sectionFilter || ''} جديد **مختلف تماماً** عن الأسئلة السابقة.

⚠️ **متطلبات التنوع الإلزامية**:
- استخدم أرقاماً مختلفة تماماً (تجنب التشابه مع: ${conceptsList})
- استخدم سياقات جديدة متنوعة (تسوق، سفر، رياضة، دراسة، طبخ، بناء)
- نوّع صيغة السؤال (مباشر، مسألة قصة، مقارنة، استنتاجي)
- اخلط مستويات الصعوبة (سهل، متوسط، صعب)
${availableTopics.length > 0 ? `- ركز على المواضيع: ${availableTopics.slice(0, 3).join('، ')}` : ''}

🚫 **ممنوع منعاً باتاً**:
- تكرار نفس البنية أو الأرقام
- استخدام نفس السياق
- أسئلة متشابهة في الفكرة`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.95,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: diversityPrompt }
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
    console.error("Explicit diversity generation failed:", error);
    return [];
  }
}

function validateQuestionQuality(questions: any[]): any[] {
  return questions.filter((q: any) => {
    if (!q.question_text || !q.explanation) return false;
    if (!q.options || q.options.length !== 4) return false;
    if (!q.options.includes(q.correct_answer)) return false;
    
    const uniqueOptions = new Set(q.options);
    if (uniqueOptions.size !== 4) return false;
    
    const questionLength = q.question_text.length;
    const explanationLength = q.explanation.length;
    
    if (questionLength < 20 || questionLength > 600) return false;
    if (explanationLength < 30) return false;
    
    if (q.section === "كمي") {
      if (!/\d/.test(q.question_text)) return false;
    } else if (q.section === "لفظي") {
      const numberCount = (q.question_text.match(/\d+/g) || []).length;
      if (numberCount > 2) return false;
    }
    
    if (!['easy', 'medium', 'hard'].includes(q.difficulty)) {
      q.difficulty = 'medium';
    }
    
    return true;
  });
}

async function ensureDiversity(
  questions: any[],
  usedHashes: Set<string>,
  params: any
): Promise<any[]> {
  const { supabase, userId, targetQuestions, LOVABLE_API_KEY, systemPrompt, sectionFilter, availableTopics } = params;
  
  const uniqueQuestions = questions.filter(q => !usedHashes.has(q.question_hash));
  console.log(`After hash filter: ${uniqueQuestions.length}/${questions.length}`);
  
  const diverseQuestions = [];
  const seenConcepts = new Set<string>();
  
  for (const q of uniqueQuestions) {
    const concept = extractConcept(q.question_text);
    if (!seenConcepts.has(concept)) {
      diverseQuestions.push(q);
      seenConcepts.add(concept);
    }
  }
  
  console.log(`After concept diversity: ${diverseQuestions.length}/${uniqueQuestions.length}`);
  
  if (diverseQuestions.length < targetQuestions) {
    const missing = targetQuestions - diverseQuestions.length;
    console.log(`Generating ${missing} more with explicit diversity...`);
    
    const additionalQuestions = await generateWithExplicitDiversity(
      LOVABLE_API_KEY,
      missing,
      systemPrompt,
      { sectionFilter, availableTopics },
      seenConcepts
    );
    
    const validAdditional = validateQuestionQuality(additionalQuestions);
    const additionalWithHash = calculateQuestionHashes(validAdditional);
    const uniqueAdditional = additionalWithHash.filter((q: any) => !usedHashes.has(q.question_hash));
    
    diverseQuestions.push(...uniqueAdditional);
    console.log(`Added ${uniqueAdditional.length} from explicit diversity generation`);
  }
  
  return diverseQuestions.slice(0, targetQuestions);
}

async function logGenerationAnalytics(
  supabase: any,
  params: any
): Promise<void> {
  const { 
    userId, 
    questionsGenerated, 
    questionsUnique,
    diversityScore,
    qualityScore,
    generationTime,
    model,
    temperature 
  } = params;
  
  try {
    await supabase.from('ai_generation_analytics').insert({
      user_id: userId,
      questions_generated: questionsGenerated,
      questions_unique: questionsUnique,
      diversity_score: diversityScore,
      quality_score: qualityScore,
      generation_time_ms: generationTime,
      model_used: model,
      temperature: temperature
    });
  } catch (error) {
    console.warn("Failed to log analytics:", error);
  }
}

function generateDistribution(total: number, subSkills: string[]): string {
  if (subSkills.length === 0) return `- ${total} سؤال متنوع`;
  
  const perSkill = Math.floor(total / subSkills.length);
  const remainder = total % subSkills.length;
  
  return subSkills
    .map((skill, i) => `- ${perSkill + (i < remainder ? 1 : 0)} سؤال عن: ${skill}`)
    .join('\n');
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
  const { mode, testType, targetQuestions, content, additionalKnowledge, sectionFilter, isInitialAssessment, knowledgeData } = params;
  
  const templates = knowledgeData?.flatMap((kb: any) => kb.metadata?.templates || []) || [];
  const variations = knowledgeData?.flatMap((kb: any) => kb.metadata?.variation_strategies || []) || [];
  const subSkills = knowledgeData?.flatMap((kb: any) => kb.metadata?.sub_skills || []) || [];
  
  let prompt = `قم بتوليد ${targetQuestions} سؤال ${sectionFilter || ''} بناءً على ${mode === 'practice' || isInitialAssessment ? 'المنهج' : 'المحتوى'}:

📚 **المحتوى المعرفي:**
${mode === 'practice' || isInitialAssessment ? additionalKnowledge : `${content.title}\n${content.content_text || ""}\n${additionalKnowledge}`}`;

  if (templates.length > 0) {
    prompt += `\n\n🎯 **قوالب الأسئلة المتاحة** (استخدم كل قالب بتنويع مختلف):
${templates.slice(0, 5).map((t: any, i: number) => `${i+1}. ${t.pattern || t}`).join('\n')}`;
  }

  if (variations.length > 0) {
    prompt += `\n\n🔄 **استراتيجيات التنوع** (طبّق على كل سؤال):
${variations.slice(0, 5).map((v: any, i: number) => `${i+1}. ${v}`).join('\n')}`;
  }

  if (subSkills.length > 0) {
    prompt += `\n\n📊 **توزيع الأسئلة المطلوب**:
${generateDistribution(targetQuestions, subSkills)}`;
  }

  prompt += `\n\n⚠️ **متطلبات إلزامية**:
- ${targetQuestions} سؤال مختلف تماماً
- كل سؤال يستخدم أرقاماً وسياقاً مختلفاً
- نوّع مستوى الصعوبة (${Math.floor(targetQuestions * 0.3)} سهل، ${Math.floor(targetQuestions * 0.5)} متوسط، ${Math.floor(targetQuestions * 0.2)} صعب)
${sectionFilter ? `- جميع الأسئلة ${sectionFilter} فقط` : '- أسئلة متنوعة'}
- 4 خيارات مختلفة لكل سؤال (الخيارات يجب أن تكون معقولة وليست واضحة الخطأ)
- تفسير تعليمي مفصل يشرح الحل خطوة بخطوة ويربط بالمهارة الأساسية

🚫 **ممنوع**:
- تكرار نفس الأرقام أو السياق
- أسئلة متشابهة في البنية
- خيارات واضحة الخطأ أو سهلة الاستبعاد`;

  return prompt;
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

function calculateQuestionHashes(questions: any[]) {
  // Use simple hash instead of SHA-256 for speed
  return questions.map((q: any) => {
    const hashInput = `${q.question_text}${JSON.stringify(q.options)}`;
    return { 
      ...q, 
      question_hash: simpleHash(hashInput)
    };
  });
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

async function logQuestions(
  supabase: any, 
  userId: string, 
  questions: any[], 
  dayNumber: number,
  metadata?: {
    generation_source?: string,
    generation_temperature?: number,
    model_used?: string,
    student_level?: string,
    weaknesses_targeted?: string[]
  }
) {
  const questionsToLog = questions.map((q: any) => ({
    user_id: userId,
    question_hash: q.question_hash,
    question_data: q,
    day_number: dayNumber || 0,
    topic_name: q.topic || 'عام',
    section: q.section || 'كمي',
    test_type: q.test_type || 'قدرات',
    difficulty: q.difficulty || 'medium',
    generation_source: metadata?.generation_source || 'ai_generated',
    generation_temperature: metadata?.generation_temperature,
    model_used: metadata?.model_used,
  }));
  
  const { error } = await supabase.from("generated_questions_log").insert(questionsToLog);
  if (error) console.warn("Failed to log questions:", error);
  else console.log(`✅ Logged ${questionsToLog.length} questions with metadata`);
}

// ============= MAIN HANDLER =============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const params = await req.json();
    
    // Sanitize and validate inputs
    const topicFilter = sanitizeTopicFilter(params.topicFilter);
    const sectionFilter = params.sectionFilter;
    const { dayNumber, difficulty = "medium", testType = "قدرات", track = "عام", mode } = params;
    
    // 1. Authenticate
    const { user, supabase } = await authenticateUser(req);
    console.log("✅ User authenticated:", user.id);
    
    const userId = user.id;
    
    // 2. Load content, KB, and AI settings in parallel
    const [content, kbResult, aiSettings, prevHashesData] = await Promise.all([
      loadContent(supabase, params),
      loadKnowledgeBase(supabase, { ...params, testType, track, topicFilter }),
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
    
    // 3. Calculate question counts with validation
    const isPractice = mode === 'practice';
    const isInitialAssessment = mode === 'initial_assessment';
    const questionCount = validateQuestionCount(params.questionCount, quizLimits);
    const baseQuestions = questionCount || (isInitialAssessment ? 25 : quizLimits.default_questions);
    const targetQuestions = Math.max(quizLimits.min_questions, Math.min(quizLimits.max_questions, baseQuestions));
    const bufferQuestions = Math.ceil(targetQuestions * 1.5);
    
    console.log(`🎯 Target: ${targetQuestions}, Buffer: ${bufferQuestions}`);
    
    // 4. Check cache status
    const cacheStatus = await checkCacheStatus(supabase, {
      testType,
      section: sectionFilter || 'عام',
      difficulty,
      track
    });
    console.log(`📦 Cache status: ${cacheStatus.available}/${cacheStatus.total} available`);
    
    // 5. Try to fetch from cache first
    const startTime = Date.now();
    let cachedQuestions: any[] = [];
    
    if (cacheStatus.available >= targetQuestions && sectionFilter) {
      cachedQuestions = await fetchFromCache(supabase, targetQuestions, {
        testType,
        section: sectionFilter,
        difficulty,
        track,
        userId: user.id
      });
    }
    
    // 6. If cache is sufficient, use it
    if (cachedQuestions.length >= targetQuestions) {
      const finalQuestions = cachedQuestions.slice(0, targetQuestions);
      const generationTime = Date.now() - startTime;
      
      console.log(`⚡ CACHE HIT: ${finalQuestions.length} questions in ${generationTime}ms`);
      
      // Mark as used
      await markCacheAsUsed(supabase, finalQuestions);
      
      // Log questions
      await logQuestions(supabase, user.id, finalQuestions, dayNumber);
      
      return new Response(
        JSON.stringify({
          questions: finalQuestions,
          dayNumber,
          contentTitle: content.title,
          testType,
          track,
          fromCache: true,
          generationTime
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // 7. Build prompts for AI generation
    console.log(`🤖 Cache insufficient (${cachedQuestions.length}/${targetQuestions}), generating with AI...`);
    
    // ============= LOAD STUDENT DATA FOR PERSONALIZATION =============
    console.log("📊 Loading student weaknesses and performance level...");
    
    const [weaknesses, studentLevel] = await Promise.all([
      loadUserWeaknesses(supabase, userId, sectionFilter || 'كمي', testType),
      calculateStudentLevel(supabase, userId)
    ]);
    
    console.log(`Student level: ${studentLevel.level} (${(studentLevel.overall_success_rate * 100).toFixed(0)}% success from ${studentLevel.total_attempts} attempts)`);
    console.log(`Found ${weaknesses.length} weakness areas`);
    
    // ============= DETERMINE TEST CONTEXT =============
    const testContext = topicFilter ? 'weakness_targeting' : 'daily_practice';
    console.log(`Test context: ${testContext}`);
    
    // ============= CALCULATE DYNAMIC TEMPERATURE =============
    const dynamicTemperature = calculateDynamicTemperature(studentLevel, testContext as any);
    console.log(`🌡️ Using dynamic temperature: ${dynamicTemperature}`);
    
    // ============= LOAD FEW-SHOT EXAMPLES =============
    console.log("🎓 Loading few-shot examples...");
    
    const fewShotCount = studentLevel.level === 'struggling' ? 5 : 3;
    const fewShotExamples = await selectFewShotExamples(supabase, {
      topic: weaknesses.length > 0 ? weaknesses[0].topic_name : undefined,
      section: sectionFilter || 'كمي',
      test_type: testType,
      difficulty: difficulty,
      count: fewShotCount
    });
    
    console.log(`✅ Selected ${fewShotExamples.length} few-shot examples`);
    
    // ============= BUILD DYNAMIC SYSTEM PROMPT =============
    console.log("🔨 Building dynamic system prompt...");
    
    const baseSystemPrompt = buildSystemPrompt({ 
      testType, sectionFilter, targetQuestions, difficulty, 
      availableTopics, allRelatedTopics, systemPromptOverride, isPractice 
    });
    
    const systemPrompt = buildDynamicSystemPrompt(
      baseSystemPrompt,
      weaknesses,
      studentLevel,
      testContext
    );
    
    // ============= BUILD USER PROMPT WITH FEW-SHOT EXAMPLES =============
    const baseUserPrompt = buildUserPrompt({ 
      mode, testType, targetQuestions, content, additionalKnowledge, 
      sectionFilter, isInitialAssessment, knowledgeData 
    });
    
    const userPrompt = injectFewShotExamples(baseUserPrompt, fewShotExamples);
    
    console.log("✅ Prompts enriched and ready");
    
    // 8. Generate questions with AI (using dynamic temperature)
    let allQuestions = await generateWithAI(LOVABLE_API_KEY, systemPrompt, userPrompt, quizModel, dynamicTemperature);
    console.log(`🤖 AI generated: ${allQuestions.length} questions`);
    
    // 9. Calculate hashes and filter duplicates
    const questionsWithHash = calculateQuestionHashes(allQuestions);
    let uniqueQuestions = questionsWithHash.filter((q: any) => !usedHashes.has(q.question_hash));
    console.log(`✅ Unique: ${uniqueQuestions.length}/${allQuestions.length}`);
    
    // 10. Add cached questions to the pool
    if (cachedQuestions.length > 0) {
      console.log(`📦 Adding ${cachedQuestions.length} cached questions to pool`);
      uniqueQuestions.push(...cachedQuestions);
    }
    
    // 11. Validate quality first
    uniqueQuestions = validateQuestionQuality(uniqueQuestions);
    console.log(`✅ Quality validated: ${uniqueQuestions.length}`);
    
    // 12. Filter by section
    uniqueQuestions = filterBySection(uniqueQuestions, sectionFilter, testType);
    uniqueQuestions = validateQuestions(uniqueQuestions);
    console.log(`✅ Section filtered: ${uniqueQuestions.length}`);
    
    // 13. Apply diversity engine
    console.log(`🎨 Applying diversity engine...`);
    const diverseQuestions = await ensureDiversity(
      uniqueQuestions,
      usedHashes,
      {
        supabase,
        userId: user.id,
        targetQuestions,
        LOVABLE_API_KEY,
        systemPrompt,
        sectionFilter,
        availableTopics
      }
    );
    
    // 14. Fill missing questions if needed
    let finalQuestions = diverseQuestions;
    let missing = targetQuestions - finalQuestions.length;
    
    if (missing > 0) {
      console.log(`⚠️ Missing ${missing} questions, filling from bank...`);
      
      const bankQuestions = await fillFromQuestionBank(supabase, missing, {
        sectionFilter, difficulty, testType, availableTopics, allRelatedTopics, isPractice
      });
      finalQuestions.push(...bankQuestions);
      missing = targetQuestions - finalQuestions.length;
      console.log(`📦 Added ${bankQuestions.length} from bank, still need: ${missing}`);
      
      if (missing > 0) {
        const topupQuestions = await topupWithAI(LOVABLE_API_KEY, missing, systemPrompt, {
          sectionFilter, availableTopics
        });
        const validTopup = validateQuestionQuality(validateQuestions(topupQuestions)).slice(0, missing);
        finalQuestions.push(...validTopup);
        console.log(`🔝 Added ${validTopup.length} from AI top-up`);
      }
    }
    
    // 11. Final check
    finalQuestions = finalQuestions.slice(0, targetQuestions);
    // بدل رمي خطأ 500، ارجع تحذيراً مع الأسئلة المتاحة لضمان تجربة سلسة في الواجهة
    const warning = finalQuestions.length < targetQuestions
      ? `عدد الأسئلة المتاحة أقل من المطلوب (${finalQuestions.length}/${targetQuestions}).`
      : undefined;
    
    const generationTime = Date.now() - startTime;
    console.log(`✅ Success: ${finalQuestions.length}/${targetQuestions} questions in ${generationTime}ms`);
    
    // 12. Calculate analytics metrics
    const uniqueCount = new Set(finalQuestions.map(q => q.question_hash)).size;
    const diversityScore = (uniqueCount / finalQuestions.length) * 100;
    const qualityScore = (finalQuestions.length / allQuestions.length) * 100;
    
    // 13. Mark cached questions as used
    if (cachedQuestions.length > 0) {
      const usedCached = finalQuestions.filter(fq => 
        cachedQuestions.some(cq => cq.question_hash === fq.question_hash)
      );
      await markCacheAsUsed(supabase, usedCached);
    }
    
    // 14. Log questions and analytics
    await Promise.all([
      logQuestions(supabase, user.id, finalQuestions, dayNumber, {
        generation_source: cachedQuestions.length > 0 ? 'cache' : 'ai_generated',
        generation_temperature: dynamicTemperature,
        model_used: quizModel,
        student_level: studentLevel.level,
        weaknesses_targeted: weaknesses.map(w => w.topic_name)
      }),
      logGenerationAnalytics(supabase, {
        userId: user.id,
        questionsGenerated: allQuestions.length,
        questionsUnique: uniqueCount,
        diversityScore: Math.round(diversityScore),
        qualityScore: Math.round(qualityScore),
        generationTime,
        model: quizModel,
        temperature: dynamicTemperature
      })
    ]);
    
    console.log(`📊 Analytics: Diversity=${diversityScore.toFixed(1)}%, Quality=${qualityScore.toFixed(1)}%`);
    
    // 15. Return response
    return new Response(
      JSON.stringify({
        questions: finalQuestions,
        dayNumber,
        contentTitle: content.title,
        testType,
        track,
        fromCache: cachedQuestions.length > 0,
        cacheHitRate: Math.round((cachedQuestions.length / targetQuestions) * 100),
        generationTime,
        warning
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
