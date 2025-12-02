import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
import { getSections, getTopics, validateSectionAndTopic } from "../_shared/testStructure.ts";
import { getSmartTrainingExamples, getTopicInfo, TrainingExample } from "../_shared/smartTrainingExamples.ts";
import { buildAdvancedPrompt, buildValidationPrompt } from "../_shared/advancedPromptBuilder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============= HELPER FUNCTIONS =============

// Simple hash function (faster than SHA-256)
function simpleHash(text: string): string {
  // Improved hash with salt to avoid collisions
  const salt = text.length.toString();
  const combined = `${text}|${salt}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
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

// دالة الكشف عن القسم الصحيح من الموضوع
function detectCorrectSection(topicFilter: string): string | null {
  const verbalKeywords = [
    'استيعاب', 'مقروء', 'قراءة', 'مفردات', 'تناظر', 'لفظي',
    'جمل', 'سياق', 'ارتباط', 'اختلاف', 'نقدي', 'استنتاج',
    'إكمال', 'خطأ', 'نص', 'فهم', 'تحليل'
  ];
  
  const quantKeywords = [
    'جبر', 'هندسة', 'إحصاء', 'أعداد', 'نسب', 'تناسب',
    'معادلات', 'متتاليات', 'احتمالات', 'قياس', 'حساب', 'رياضيات',
    'كسور', 'نسبة', 'مئوية', 'مساحة', 'محيط', 'زاوية'
  ];
  
  if (verbalKeywords.some(kw => topicFilter.includes(kw))) return 'لفظي';
  if (quantKeywords.some(kw => topicFilter.includes(kw))) return 'كمي';
  
  return null;
}

// ============= QUESTION BANK FUNCTIONS =============

// Fetch user's previously answered questions
async function getUserAnsweredHashes(supabase: any, userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('user_performance_history')
    .select('question_hash')
    .eq('user_id', userId);
  
  return new Set(data?.map((q: any) => q.question_hash).filter(Boolean) || []);
}

// Fetch from permanent question bank (no repeat per user)
async function fetchFromQuestionBank(
  supabase: any,
  targetCount: number,
  params: {
    section: string;
    subTopic?: string;
    difficulty: string;
    userId: string;
    answeredHashes: Set<string>;
  }
): Promise<any[]> {
  const { section, subTopic, difficulty, userId, answeredHashes } = params;
  
  console.log(`📚 Fetching from question bank: section=${section}, subTopic=${subTopic || 'any'}, difficulty=${difficulty}`);
  
  let query = supabase
    .from('questions_bank')
    .select('*')
    .eq('subject', section === 'كمي' ? 'كمي' : 'لفظي')
    .eq('difficulty', difficulty)
    .eq('validation_status', 'approved');
  
  // Filter by sub_topic if specified
  if (subTopic) {
    query = query.eq('sub_topic', subTopic);
  }
  
  const { data: questions, error } = await query.limit(targetCount * 3); // Get more to filter
  
  if (error) {
    console.error('Question bank fetch error:', error);
    return [];
  }
  
  if (!questions || questions.length === 0) {
    console.log('❌ No questions found in bank');
    return [];
  }
  
  // Filter out already answered questions
  const unanswered = questions.filter((q: any) => 
    !answeredHashes.has(q.question_hash)
  );
  
  console.log(`📚 Found ${unanswered.length}/${questions.length} unanswered questions for user`);
  
  // Shuffle and take what we need
  const shuffled = unanswered.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, targetCount);
  
  // Convert to quiz format
  // Helper function to normalize options to array format
  const normalizeOptions = (opts: any): string[] => {
    if (Array.isArray(opts)) return opts;
    if (typeof opts === 'object' && opts !== null) {
      // Convert { "أ": "...", "ب": "..." } to ["...", "..."]
      return Object.values(opts);
    }
    return [];
  };

  return selected.map((q: any) => ({
    question_text: q.question_text,
    options: normalizeOptions(q.options),
    correct_answer: q.correct_answer,
    explanation: q.explanation || '',
    topic: q.topic || q.sub_topic || section,
    subTopic: q.sub_topic,
    section: section,
    subject: section,
    difficulty: q.difficulty,
    question_type: 'multiple_choice',
    question_hash: q.question_hash || simpleHash(q.question_text),
    source: 'question_bank'
  }));
}

// Check question bank availability for a sub-topic
async function getQuestionBankStats(
  supabase: any,
  section: string,
  subTopic?: string
): Promise<{ total: number; byDifficulty: Record<string, number> }> {
  const sectionValue = section === 'كمي' ? 'كمي' : 'لفظي';
  
  let query = supabase
    .from('questions_bank')
    .select('difficulty')
    .eq('subject', sectionValue)
    .eq('validation_status', 'approved');
  
  if (subTopic) {
    query = query.eq('sub_topic', subTopic);
  }
  
  const { data, error } = await query;
  
  if (error || !data) return { total: 0, byDifficulty: {} };
  
  const byDifficulty: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
  data.forEach((q: any) => {
    if (byDifficulty[q.difficulty] !== undefined) {
      byDifficulty[q.difficulty]++;
    }
  });
  
  return { total: data.length, byDifficulty };
}

// Auto-generate and save to question bank
const BANK_MINIMUM_THRESHOLD = 10;
const BANK_REFILL_COUNT = 20;

async function autoRefillQuestionBank(
  supabase: any,
  section: string,
  subTopic: string,
  difficulty: string
): Promise<void> {
  console.log(`🔄 Auto-refill bank: ${section}/${subTopic}/${difficulty}...`);
  
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.error("❌ Auto-refill failed: LOVABLE_API_KEY not configured");
    return;
  }
  
  try {
    // 🆕 Use smart training examples instead of random selection
    const smartExamples = await getSmartTrainingExamples(
      supabase, 
      subTopic, 
      difficulty as 'easy' | 'medium' | 'hard', 
      5
    );
    
    console.log(`📚 Got ${smartExamples.length} smart training examples for ${subTopic}`);
    
    // 🆕 Get topic info for better prompt building
    const topicInfo = getTopicInfo(subTopic);
    
    // 🆕 Use advanced prompt builder
    const promptSection = (topicInfo.section || section) as 'كمي' | 'لفظي';
    const advancedPrompt = buildAdvancedPrompt({
      subTopic,
      difficulty: difficulty as 'easy' | 'medium' | 'hard',
      count: BANK_REFILL_COUNT,
      examples: smartExamples,
      section: promptSection,
      topic: topicInfo.topic || subTopic
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: advancedPrompt },
          { role: "user", content: `أنشئ ${BANK_REFILL_COUNT} سؤال متنوع عن "${subTopic}" الآن.` }
        ],
        temperature: 0.85,
        max_tokens: 15000
      })
    });

    if (!response.ok) {
      console.error(`❌ Auto-refill AI error: ${response.status}`);
      return;
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Parse questions
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("❌ Auto-refill: No valid JSON array found");
      return;
    }
    
    const questions = JSON.parse(jsonMatch[0]);
    const sectionValue = section === 'كمي' ? 'كمي' : 'لفظي';
    
    // Prepare bank entries
    const bankEntries = questions.slice(0, BANK_REFILL_COUNT).map((q: any) => ({
      subject: sectionValue,
      topic: topicInfo.topic || subTopic,
      sub_topic: subTopic,
      difficulty: difficulty,
      question_type: 'multiple_choice',
      question_text: q.question,
      options: q.options,
      correct_answer: q.correctAnswer,
      explanation: q.explanation,
      question_hash: simpleHash(q.question + q.correctAnswer),
      created_by: 'ai_smart_refill',
      validation_status: 'approved'
    }));
    
    // Insert with conflict handling
    const { error: insertError } = await supabase
      .from('questions_bank')
      .upsert(bankEntries, { 
        onConflict: 'question_hash',
        ignoreDuplicates: true 
      });
    
    if (insertError) {
      console.error("❌ Auto-refill insert error:", insertError);
    } else {
      console.log(`✅ Auto-refill complete: ${bankEntries.length} questions added to bank for ${section}/${subTopic}/${difficulty}`);
    }
    
  } catch (error) {
    console.error("❌ Auto-refill error:", error);
  }
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
      .eq('is_used', false),
    supabase
      .from('questions_cache')
      .select('id', { count: 'exact', head: true })
      .eq('test_type', testType)
      .eq('section', section)
      .eq('difficulty', difficulty)
  ]);
  
  return {
    available: availableResult.count || 0,
    total: totalResult.count || 0
  };
}

// ============= AUTO-REFILL CACHE =============
const CACHE_REFILL_THRESHOLD = 20;
const CACHE_REFILL_COUNT = 50;

async function triggerCacheRefill(
  section: string,
  difficulty: string,
  testType: string
): Promise<void> {
  console.log(`🔄 Auto-refill triggered for ${section}/${difficulty}...`);
  
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("❌ Auto-refill failed: LOVABLE_API_KEY not configured");
      return;
    }
    
    // Load knowledge base for this section
    const { data: kbData } = await supabaseAdmin
      .from('knowledge_base')
      .select('content, title, related_topics')
      .eq('section', section)
      .eq('test_type', testType)
      .eq('is_active', true)
      .limit(5);
    
    const knowledgeContext = kbData?.map(kb => kb.content || kb.title).join('\n') || '';
    const relatedTopics = kbData?.flatMap(kb => kb.related_topics || []).slice(0, 10) || [];
    
    // Generate questions using AI
    const systemPrompt = `أنت خبير في إنشاء أسئلة اختبار القدرات العامة السعودي.
قم بإنشاء ${CACHE_REFILL_COUNT} سؤال متنوع ومميز في قسم ${section} بمستوى صعوبة ${difficulty === 'easy' ? 'سهل' : difficulty === 'hard' ? 'صعب' : 'متوسط'}.

متطلبات صارمة:
- كل سؤال يجب أن يكون فريداً ومختلفاً تماماً
- الأسئلة باللغة العربية الفصحى
- كل سؤال له 4 خيارات (أ، ب، ج، د)
- شرح واضح ومفصل للإجابة الصحيحة
- تغطية مواضيع متنوعة: ${relatedTopics.join('، ')}

أرجع JSON array فقط بالصيغة:
[{
  "question": "نص السؤال",
  "options": {"أ": "...", "ب": "...", "ج": "...", "د": "..."},
  "correctAnswer": "أ",
  "explanation": "شرح مفصل",
  "topic": "اسم الموضوع",
  "difficulty": "${difficulty}"
}]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `سياق تعليمي:\n${knowledgeContext}\n\nأنشئ ${CACHE_REFILL_COUNT} سؤال متنوع الآن.` }
        ],
        temperature: 0.8,
        max_tokens: 15000
      })
    });

    if (!response.ok) {
      console.error(`❌ Auto-refill AI error: ${response.status}`);
      return;
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Parse questions
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("❌ Auto-refill: No valid JSON array found");
      return;
    }
    
    const questions = JSON.parse(jsonMatch[0]);
    
    // Prepare cache entries
    const cacheEntries = questions.slice(0, CACHE_REFILL_COUNT).map((q: any) => ({
      test_type: testType,
      section: section,
      difficulty: difficulty,
      question_hash: simpleHash(q.question + q.correctAnswer),
      question_data: {
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        topic: q.topic || section,
        section: section,
        difficulty: difficulty
      },
      generation_source: 'auto_refill',
      topic: q.topic || section
    }));
    
    // Insert with conflict handling
    const { error: insertError } = await supabaseAdmin
      .from('questions_cache')
      .upsert(cacheEntries, { 
        onConflict: 'question_hash',
        ignoreDuplicates: true 
      });
    
    if (insertError) {
      console.error("❌ Auto-refill insert error:", insertError);
    } else {
      console.log(`✅ Auto-refill complete: ${cacheEntries.length} questions added for ${section}/${difficulty}`);
    }
    
  } catch (error) {
    console.error("❌ Auto-refill error:", error);
  }
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
  
  if (mode === "weakness_practice") {
    return {
      title: "تدريب على نقاط الضعف",
      description: "اختبار مخصص لتقوية نقاط ضعفك",
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
  if (error && mode !== "practice" && mode !== "weakness_practice") throw new Error("المحتوى غير موجود");
  
  return data;
}

async function loadKnowledgeBase(supabase: any, params: any) {
  const { testType, track, mode, sectionFilter } = params;
  const isPractice = mode === 'practice';
  
  let query = supabase
    .from("knowledge_base")
    .select("*")
    .eq("test_type", testType)
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
  const { testType, sectionFilter, targetQuestions, difficulty, availableTopics, allRelatedTopics, systemPromptOverride, isPractice, topicFilter } = params;
  
  let prompt = systemPromptOverride ? `${systemPromptOverride}\n\n` : "";
  
  // Add topic filter requirement at the top if specified
  if (topicFilter) {
    prompt += `🎯 **الموضوع المطلوب حصرياً:**
"${topicFilter}"

⚠️ **تعليمات إلزامية:**
- جميع الأسئلة يجب أن تكون عن موضوع "${topicFilter}" فقط
- لا تولد أسئلة من مواضيع أخرى نهائياً
- كل سؤال يجب أن يتعلق بـ "${topicFilter}" بشكل مباشر
${sectionFilter ? `- من القسم ${sectionFilter} حصرياً` : ''}

`;
  }
  
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
  const { mode, testType, targetQuestions, content, additionalKnowledge, sectionFilter, isInitialAssessment, knowledgeData, topicFilter } = params;
  
  const templates = knowledgeData?.flatMap((kb: any) => kb.metadata?.templates || []) || [];
  const variations = knowledgeData?.flatMap((kb: any) => kb.metadata?.variation_strategies || []) || [];
  const subSkills = knowledgeData?.flatMap((kb: any) => kb.metadata?.sub_skills || []) || [];
  
  let prompt = `قم بتوليد ${targetQuestions} سؤال ${sectionFilter || ''} بناءً على ${mode === 'practice' || isInitialAssessment ? 'المنهج' : 'المحتوى'}:

📚 **المحتوى المعرفي:**
${mode === 'practice' || isInitialAssessment ? additionalKnowledge : `${content.title}\n${content.content_text || ""}\n${additionalKnowledge}`}`;

  // Add strong topic focus if topicFilter is specified
  if (topicFilter) {
    prompt += `\n\n🎯 **تعليمات إلزامية للموضوع:**
⚠️ جميع الأسئلة يجب أن تكون حصرياً عن: "${topicFilter}"
- كل سؤال يجب أن يتناول "${topicFilter}" بشكل مباشر ومحدد
- لا تولد أسئلة من مواضيع أخرى مثل ${getSampleOtherTopics(topicFilter, sectionFilter)}
- نوّع مستوى الصعوبة ولكن نفس الموضوع "${topicFilter}"
- استخدم مهارات فرعية مختلفة ضمن موضوع "${topicFilter}"`;
  }

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
${topicFilter ? `- جميع الأسئلة عن موضوع "${topicFilter}" فقط` : ''}
- 4 خيارات مختلفة لكل سؤال (الخيارات يجب أن تكون معقولة وليست واضحة الخطأ)
- تفسير تعليمي مفصل يشرح الحل خطوة بخطوة ويربط بالمهارة الأساسية

🚫 **ممنوع**:
- تكرار نفس الأرقام أو السياق
- أسئلة متشابهة في البنية
- خيارات واضحة الخطأ أو سهلة الاستبعاد
${topicFilter ? `- أسئلة من مواضيع غير "${topicFilter}"` : ''}`;

  return prompt;
}

// Helper function to suggest other topics to avoid
function getSampleOtherTopics(currentTopic: string, section: string | null): string {
  if (section === "لفظي") {
    const verbalTopics = ["القراءة والاستيعاب", "المفردات", "التناظر اللفظي", "إكمال الجمل", "الخطأ السياقي"];
    return verbalTopics.filter(t => t !== currentTopic).slice(0, 2).join("، ");
  } else if (section === "كمي") {
    const mathTopics = ["الجبر", "الهندسة", "الإحصاء", "الأعداد", "النسب والتناسب", "المعادلات"];
    return mathTopics.filter(t => t !== currentTopic).slice(0, 2).join("، ");
  }
  return "مواضيع أخرى";
}

async function generateWithAI(apiKey: string, systemPrompt: string, userPrompt: string, model: string, temp: number) {
  // ============= PHASE 4: SYSTEM PROMPT CLARITY =============
  // Build messages with clear separation between system instructions and user content
  const messages = [
    {
      role: "system",
      content: systemPrompt // ONLY instructions and requirements
    },
    {
      role: "user", 
      content: userPrompt // Context, examples, and specific request
    }
  ];
  
  console.log("📤 Phase 4: Sending structured prompt to AI...");
  console.log(`  - System Prompt: ${systemPrompt.substring(0, 100)}...`);
  console.log(`  - User Prompt: ${userPrompt.substring(0, 100)}...`);
  console.log(`  - Model: ${model}, Temperature: ${temp}`);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: temp,
      messages, // Use structured messages array (Phase 4)
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

// Helper function to check if topics are related
function areRelatedTopics(topic1: string, topic2: string): boolean {
  if (!topic1 || !topic2) return false;
  
  const t1 = topic1.toLowerCase().trim();
  const t2 = topic2.toLowerCase().trim();
  
  // Exact match
  if (t1 === t2) return true;
  
  // Partial match
  if (t1.includes(t2) || t2.includes(t1)) return true;
  
  // Topic synonyms/related terms
  const relatedGroups = [
    ["التناظر اللفظي", "التناظر", "المتناظرات"],
    ["إكمال الجمل", "إكمال", "الجمل"],
    ["الخطأ السياقي", "السياق", "الخطأ"],
    ["القراءة والاستيعاب", "الاستيعاب", "القراءة"],
    ["النسب والتناسب", "النسبة", "التناسب", "النسب المئوية"],
    ["الجبر", "المعادلات", "المتغيرات"],
    ["الهندسة", "المساحة", "المحيط", "الحجم"],
  ];
  
  for (const group of relatedGroups) {
    const hasT1 = group.some(term => t1.includes(term));
    const hasT2 = group.some(term => t2.includes(term));
    if (hasT1 && hasT2) return true;
  }
  
  return false;
}

function filterBySection(questions: any[], sectionFilter: string | null, testType: string, topicFilter?: string) {
  if (!sectionFilter && !topicFilter) return questions;
  
  const mathKeywords = ['نسبة', 'معادلة', 'مجموع', 'مساحة', 'محيط', 'جذر', 'ضرب', 'قسمة', 'رقم', 'عدد'];
  
  return questions.filter((q: any) => {
    // Filter by section first
    if (sectionFilter && testType === "قدرات") {
      const text = q.question_text?.toLowerCase() || "";
      const hasNumbers = /\d/.test(text);
      const hasMathWords = mathKeywords.some(kw => text.includes(kw));
      
      if (sectionFilter === "كمي") {
        const isQuantitative = q.section === "كمي" || hasNumbers || hasMathWords;
        if (!isQuantitative) return false;
      } else if (sectionFilter === "لفظي") {
        const isVerbal = q.section === "لفظي" && !hasNumbers && !hasMathWords;
        if (!isVerbal) return false;
      }
    }
    
    // Then filter by topic if specified
    if (topicFilter) {
      const questionText = q.question_text?.toLowerCase() || "";
      const questionTopic = q.topic?.toLowerCase() || "";
      const targetTopic = topicFilter.toLowerCase();
      
      // Check if topic matches
      const topicMatch = areRelatedTopics(questionTopic, targetTopic) ||
                        questionText.includes(targetTopic) ||
                        questionTopic.includes(targetTopic);
      
      if (!topicMatch) {
        console.log(`❌ Filtered out question with topic "${q.topic}" (expected "${topicFilter}")`);
        return false;
      }
    }
    
    return true;
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
  const { sectionFilter, difficulty, testType, availableTopics, allRelatedTopics, isPractice, topicFilter } = params;
  
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
      // Topic filter if specified
      if (topicFilter) {
        const questionTopic = q.topic?.toLowerCase() || "";
        if (!areRelatedTopics(questionTopic, topicFilter)) {
          return false;
        }
      }
      
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
  const { sectionFilter, availableTopics, topicFilter } = params;
  
  const topupPrompt = `قم بتوليد ${missing} سؤال ${sectionFilter || ''} فقط:

⚠️ **مهم:**
- ${missing} سؤال بالضبط
${sectionFilter ? `- ${sectionFilter} حصرياً` : ''}
${topicFilter ? `- جميع الأسئلة عن موضوع "${topicFilter}" حصرياً` : ''}
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
    question_data: {
      ...q,
      metadata: {
        topic: q.topic || 'عام',
        section: q.section || 'كمي',
        test_type: q.test_type || 'قدرات',
        difficulty: q.difficulty || 'medium',
        generation_source: metadata?.generation_source || 'ai_generated',
        generation_temperature: metadata?.generation_temperature,
        model_used: metadata?.model_used,
        student_level: metadata?.student_level,
        weaknesses_targeted: metadata?.weaknesses_targeted
      }
    },
    day_number: dayNumber || 0
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
    let sectionFilter = params.sectionFilter;
    const { dayNumber, difficulty = "medium", testType = "قدرات", track = "عام", mode } = params;
    
    // 🔧 تصحيح تلقائي للقسم إذا كان الموضوع لا يتطابق
    if (topicFilter) {
      const detectedSection = detectCorrectSection(topicFilter);
      if (detectedSection && detectedSection !== sectionFilter) {
        console.log(`⚠️ Section mismatch detected! Topic "${topicFilter}" requires "${detectedSection}", not "${sectionFilter}"`);
        console.log(`🔧 Auto-correcting section: ${sectionFilter} → ${detectedSection}`);
        sectionFilter = detectedSection;
      }
    }
    
    // 1. Authenticate
    const { user, supabase } = await authenticateUser(req);
    console.log("✅ User authenticated:", user.id);
    
    const userId = user.id;
    
    // 2. Load content, KB, AI settings, and user's answered questions in parallel
    const [content, kbResult, aiSettings, answeredHashes] = await Promise.all([
      loadContent(supabase, params),
      loadKnowledgeBase(supabase, { ...params, testType, track, topicFilter }),
      loadAISettings(supabase),
      getUserAnsweredHashes(supabase, user.id)
    ]);
    
    const { knowledgeData, availableTopics, allRelatedTopics, additionalKnowledge } = kbResult;
    console.log(`📚 KB loaded: ${availableTopics.length} topics`);
    
    const { quizLimits, quizModel, quizTemp, systemPromptOverride } = aiSettings;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    
    // Use answeredHashes to prevent question repetition per user
    const usedHashes = answeredHashes;
    console.log(`🔍 Preventing repetition: ${usedHashes.size} questions from last 7 days`);
    
    // 3. Calculate question counts with validation
    const isPractice = mode === 'practice';
    const isInitialAssessment = mode === 'initial_assessment';
    const questionCount = validateQuestionCount(params.questionCount, quizLimits);
    const baseQuestions = questionCount || (isInitialAssessment ? 25 : quizLimits.default_questions);
    const targetQuestions = Math.max(quizLimits.min_questions, Math.min(quizLimits.max_questions, baseQuestions));
    const bufferQuestions = Math.ceil(targetQuestions * 1.5);
    
    console.log(`🎯 Target: ${targetQuestions}, Buffer: ${bufferQuestions}`);
    
    // 4. First priority: Try to fetch from QUESTION BANK (permanent, per-user unique)
    const startTime = Date.now();
    let bankQuestions: any[] = [];
    
    if (sectionFilter) {
      bankQuestions = await fetchFromQuestionBank(supabase, targetQuestions, {
        section: sectionFilter,
        subTopic: topicFilter, // Use topic filter as sub_topic
        difficulty,
        userId: user.id,
        answeredHashes: usedHashes
      });
      console.log(`📚 Fetched ${bankQuestions.length} from question bank`);
      
      // Check if we need auto-refill for this sub-topic
      if (topicFilter && bankQuestions.length < targetQuestions) {
        const bankStats = await getQuestionBankStats(supabase, sectionFilter, topicFilter);
        if (bankStats.total < BANK_MINIMUM_THRESHOLD) {
          console.log(`⚠️ Question bank low for ${topicFilter} (${bankStats.total}/${BANK_MINIMUM_THRESHOLD}), triggering auto-refill...`);
          autoRefillQuestionBank(supabase, sectionFilter, topicFilter, difficulty)
            .catch(e => console.error("Bank auto-refill error:", e));
        }
      }
    }
    
    // 5. If bank is sufficient, return directly
    if (bankQuestions.length >= targetQuestions) {
      const finalQuestions = bankQuestions.slice(0, targetQuestions);
      const generationTime = Date.now() - startTime;
      
      console.log(`⚡ BANK HIT: ${finalQuestions.length} questions in ${generationTime}ms`);
      
      // Log questions
      await logQuestions(supabase, user.id, finalQuestions, dayNumber, {
        generation_source: 'question_bank'
      });
      
      return new Response(
        JSON.stringify({
          questions: finalQuestions,
          dayNumber,
          contentTitle: content.title,
          testType,
          track,
          fromBank: true,
          generationTime
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // 6. Second priority: Check cache for additional questions
    const cacheStatus = await checkCacheStatus(supabase, {
      testType,
      section: sectionFilter || 'عام',
      difficulty,
      track
    });
    console.log(`📦 Cache status: ${cacheStatus.available}/${cacheStatus.total} available`);
    
    let cachedQuestions: any[] = [];
    const remainingNeeded = targetQuestions - bankQuestions.length;
    
    if (sectionFilter && cacheStatus.available > 0 && remainingNeeded > 0) {
      cachedQuestions = await fetchFromCache(supabase, remainingNeeded, {
        testType,
        section: sectionFilter,
        difficulty,
        track,
        userId: user.id
      });
      console.log(`📦 Fetched ${cachedQuestions.length} from cache`);
    }
    
    // 7. Combine bank + cache
    const combinedQuestions = [...bankQuestions, ...cachedQuestions];
    
    if (combinedQuestions.length >= targetQuestions) {
      const finalQuestions = combinedQuestions.slice(0, targetQuestions);
      const generationTime = Date.now() - startTime;
      
      console.log(`⚡ BANK+CACHE HIT: ${finalQuestions.length} questions in ${generationTime}ms`);
      
      // Mark cache as used
      if (cachedQuestions.length > 0) {
        await markCacheAsUsed(supabase, cachedQuestions);
      }
      
      // Log questions
      await logQuestions(supabase, user.id, finalQuestions, dayNumber, {
        generation_source: 'bank_and_cache'
      });
      
      // Trigger auto-refill in background if cache is running low
      if (cacheStatus.available < CACHE_REFILL_THRESHOLD && sectionFilter) {
        console.log(`⚠️ Cache running low (${cacheStatus.available}/${CACHE_REFILL_THRESHOLD}), triggering auto-refill...`);
        triggerCacheRefill(sectionFilter, difficulty, testType).catch(e => console.error("Auto-refill error:", e));
      }
      
      return new Response(
        JSON.stringify({
          questions: finalQuestions,
          dayNumber,
          contentTitle: content.title,
          testType,
          track,
          fromBank: bankQuestions.length,
          fromCache: cachedQuestions.length,
          generationTime
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // 7. SMART FALLBACK: Calculate how many questions we still need from AI
    const questionsFromCache = cachedQuestions.length;
    const questionsNeededFromAI = targetQuestions - questionsFromCache;
    console.log(`🤖 Cache partial (${questionsFromCache}/${targetQuestions}), generating ${questionsNeededFromAI} with AI...`);
    
    // ============= LOAD STUDENT DATA FOR PERSONALIZATION =============
    console.log("📊 Loading student weaknesses and performance level...");
    
    const [weaknesses, studentLevel] = await Promise.all([
      loadUserWeaknesses(supabase, userId, sectionFilter || 'كمي'),
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
    
    // ============= LOAD FEW-SHOT EXAMPLES WITH WEAKNESS INTEGRATION =============
    console.log("🎓 Phase 3: Loading few-shot examples with weakness awareness...");
    
    // Determine diversityMode based on context
    let diversityMode: 'balanced' | 'topic-focused' | 'difficulty-spread' | 'weakness-focused' = 'balanced';
    
    if (mode === 'practice' || mode === 'weakness_practice') {
      // If student has clear weaknesses, focus on them
      if (weaknesses.length >= 3) {
        diversityMode = 'weakness-focused';
      } else {
        diversityMode = 'balanced';
      }
    } else if (mode === 'initial_assessment') {
      diversityMode = 'difficulty-spread'; // Variety in difficulty
    } else {
      diversityMode = 'topic-focused'; // Focus on daily topic
    }
    
    const fewShotCount = studentLevel.level === 'struggling' ? 5 : 3;
    const weakTopics = weaknesses.slice(0, 5).map(w => w.topic);
    
    const fewShotExamples = await selectFewShotExamples(supabase, {
      topic: weaknesses.length > 0 ? weaknesses[0].topic : undefined,
      section: sectionFilter || 'كمي',
      test_type: testType,
      difficulty: difficulty,
      count: fewShotCount,
      useQualityScoring: true,
      diversityMode,
      userId,
      weakTopics,
      studentLevel: studentLevel.level
    });
    
    console.log(`✅ Phase 3: Selected ${fewShotExamples.length} examples (${diversityMode} mode, ${weakTopics.length} weak topics)`);
    
    // ============= BUILD DYNAMIC SYSTEM PROMPT =============
    console.log("🔨 Building dynamic system prompt...");
    
    // Use questionsNeededFromAI instead of targetQuestions for AI generation
    const aiQuestionCount = Math.ceil(questionsNeededFromAI * 1.3); // Buffer for validation failures
    
    const baseSystemPrompt = buildSystemPrompt({ 
      testType, sectionFilter, targetQuestions: aiQuestionCount, difficulty, 
      availableTopics, allRelatedTopics, systemPromptOverride, isPractice, topicFilter 
    });
    
    const systemPrompt = buildDynamicSystemPrompt(
      baseSystemPrompt,
      weaknesses,
      studentLevel,
      testContext
    );
    
    // ============= BUILD USER PROMPT WITH FEW-SHOT EXAMPLES =============
    const baseUserPrompt = buildUserPrompt({ 
      mode, testType, targetQuestions: aiQuestionCount, content, additionalKnowledge, 
      sectionFilter, isInitialAssessment, knowledgeData, topicFilter 
    });
    
    // Add weakness information to prompt if in practice mode
    let enhancedUserPrompt = baseUserPrompt;
    if (weakTopics.length > 0 && (mode === 'weakness_practice' || mode === 'practice')) {
      enhancedUserPrompt += `\n\n🎯 **التركيز على نقاط الضعف:**
المتعلم يحتاج تحسين في: ${weakTopics.slice(0, 3).join('، ')}
قم بتوليد أسئلة مركزة على هذه المواضيع مع شرح تفصيلي وواضح.\n`;
    }
    
    const userPrompt = injectFewShotExamples(enhancedUserPrompt, fewShotExamples);
    
    console.log("✅ Phase 3: Prompts enriched with Few-Shot examples and weakness data");
    
    // 8. Generate questions with AI with timeout (Phase 3: Performance)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    let allQuestions;
    try {
      allQuestions = await generateWithAI(LOVABLE_API_KEY, systemPrompt, userPrompt, quizModel, dynamicTemperature);
      console.log(`🤖 AI generated: ${allQuestions.length} questions`);
      
      // ============= PHASE 2: AI SAFETY GUARD =============
      if (allQuestions.length > 0) {
        console.log("🛡️ Phase 2: Running AI Safety Guard validation...");
        
        try {
          const validationResponse = await supabase.functions.invoke('validate-questions', {
            body: { questions: allQuestions }
          });

          if (validationResponse.error) {
            console.error("⚠️ Validation service error:", validationResponse.error);
          } else if (validationResponse.data) {
            const validated = validationResponse.data;
            console.log(`✅ Validation: ${validated.valid}/${validated.total} questions passed`);
            
            // Use only valid questions
            if (validated.validQuestions && validated.validQuestions.length > 0) {
              allQuestions = validated.validQuestions;
              console.log(`🛡️ Using ${allQuestions.length} validated questions`);
            }
            
            // Log invalid questions for monitoring
            if (validated.invalid > 0 && validated.invalidDetails) {
              console.warn(`⚠️ ${validated.invalid} questions failed validation:`);
              validated.invalidDetails.forEach((detail: any) => {
                console.error(`  - Question ${detail.index}: Score ${detail.score}/100`);
                console.error(`    Errors: ${detail.errors.join(', ')}`);
                if (detail.warnings.length > 0) {
                  console.warn(`    Warnings: ${detail.warnings.join(', ')}`);
                }
              });
            }
          }
        } catch (validationError) {
          console.error("⚠️ Validation failed, proceeding with unvalidated questions:", validationError);
          // Continue with unvalidated questions - don't break user experience
        }
      }
      
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.error('⏱️ AI generation timeout after 30s');
        throw new Error('AI generation timeout - please try again');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
    
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
    
    // 12. Filter by section and topic
    uniqueQuestions = filterBySection(uniqueQuestions, sectionFilter, testType, topicFilter);
    uniqueQuestions = validateQuestions(uniqueQuestions);
    console.log(`✅ Section${topicFilter ? ' & topic' : ''} filtered: ${uniqueQuestions.length}`);
    
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
        sectionFilter, difficulty, testType, availableTopics, allRelatedTopics, isPractice, topicFilter
      });
      finalQuestions.push(...bankQuestions);
      missing = targetQuestions - finalQuestions.length;
      console.log(`📦 Added ${bankQuestions.length} from bank, still need: ${missing}`);
      
      if (missing > 0) {
        const topupQuestions = await topupWithAI(LOVABLE_API_KEY, missing, systemPrompt, {
          sectionFilter, availableTopics, topicFilter
        });
        const validTopup = validateQuestionQuality(validateQuestions(topupQuestions)).slice(0, missing);
        finalQuestions.push(...validTopup);
        console.log(`🔝 Added ${validTopup.length} from AI top-up`);
      }
    }
    
    // 11. Final validation for topic matching
    if (topicFilter) {
      const mismatchedQuestions = finalQuestions.filter(q => {
        const questionTopic = q.topic?.toLowerCase() || "";
        return !areRelatedTopics(questionTopic, topicFilter);
      });
      
      if (mismatchedQuestions.length > 0) {
        console.warn(`⚠️ Found ${mismatchedQuestions.length} mismatched questions for topic "${topicFilter}"`);
        mismatchedQuestions.forEach(q => {
          console.warn(`  - Question topic: "${q.topic}", Text preview: "${q.question_text?.substring(0, 50)}..."`);
        });
        
        // Remove mismatched questions
        finalQuestions = finalQuestions.filter(q => 
          areRelatedTopics(q.topic?.toLowerCase() || "", topicFilter)
        );
        console.log(`✅ After topic validation: ${finalQuestions.length} questions remain`);
      }
    }
    
    // 12. Final check
    finalQuestions = finalQuestions.slice(0, targetQuestions);
    // بدل رمي خطأ 500، ارجع تحذيراً مع الأسئلة المتاحة لضمان تجربة سلسة في الواجهة
    const warning = finalQuestions.length < targetQuestions
      ? `عدد الأسئلة المتاحة أقل من المطلوب (${finalQuestions.length}/${targetQuestions}).`
      : undefined;
    
    const generationTime = Date.now() - startTime;
    console.log(`✅ Success: ${finalQuestions.length}/${targetQuestions} questions in ${generationTime}ms`);
    
    // 11. Quality scoring and caching for training (fire-and-forget, async in background)
    console.log('💎 Starting background quality scoring...');
    const questionsToScore = finalQuestions.slice(0, Math.min(5, finalQuestions.length)).map(q => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      topic: q.topic,
      section: q.section,
      testType
    }));
    
    // Fire-and-forget: don't await this
    supabase.functions.invoke('quality-score-questions', {
      body: { questions: questionsToScore, mode: 'auto' }
    }).then(({ data: scoredData, error: scoreError }) => {
      if (scoreError || !scoredData?.questions) {
        console.log('⚠️ Background scoring skipped:', scoreError?.message);
        return;
      }
      
      const highQualityQuestions = scoredData.questions
        .filter((q: any) => q.overall_score >= 0.7 && q.approved)
        .slice(0, 3)
        .map((q: any) => ({
          section: sectionFilter || 'كمي',
          test_type: testType,
          question_text: q.question,
          options: q.options,
          correct_answer: q.correctAnswer,
          explanation: q.explanation,
          subject: q.topic || q.subject || 'عام',
          difficulty: q.difficulty || difficulty || 'medium',
          quality_score: Math.round(q.overall_score * 5)
        }));
      
      if (highQualityQuestions.length > 0) {
        supabase
          .from('ai_training_examples')
          .insert(highQualityQuestions)
          .then(({ error: cacheError }) => {
            if (!cacheError) {
              console.log(`✅ Cached ${highQualityQuestions.length} high-quality questions in background`);
            }
          });
      }
    }).catch(err => console.log('⚠️ Background scoring error:', err.message));
    
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
        weaknesses_targeted: weaknesses.map(w => w.topic)
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
    
    // 15. Collect debug information
    const debugInfo = topicFilter ? {
      requestedTopic: topicFilter,
      requestedSection: sectionFilter,
      generatedTopics: [...new Set(finalQuestions.map(q => q.topic))],
      generatedSections: [...new Set(finalQuestions.map(q => q.section))],
      topicMatchRate: Math.round((finalQuestions.filter(q => 
        areRelatedTopics(q.topic?.toLowerCase() || "", topicFilter)
      ).length / finalQuestions.length) * 100)
    } : undefined;
    
    // 16. Auto-refill cache if running low (background task)
    if (sectionFilter && cacheStatus.available < CACHE_REFILL_THRESHOLD) {
      console.log(`⚠️ Cache running low (${cacheStatus.available}/${CACHE_REFILL_THRESHOLD}), triggering auto-refill...`);
      // Fire-and-forget background refill
      triggerCacheRefill(sectionFilter, difficulty, testType).catch(e => 
        console.error('Auto-refill error:', e)
      );
    }
    
    // 17. Return response
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
        warning,
        debug: debugInfo
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
