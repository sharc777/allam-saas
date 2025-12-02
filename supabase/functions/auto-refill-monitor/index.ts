import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getSmartTrainingExamples, getTopicInfo } from "../_shared/smartTrainingExamples.ts";
import { buildAdvancedPrompt } from "../_shared/advancedPromptBuilder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MINIMUM_THRESHOLD = 20;
const REFILL_COUNT = 20;
const MAX_TOPICS_PER_RUN = 3;

// Simple hash function
function simpleHash(text: string): string {
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

async function refillSubTopic(
  supabase: any,
  LOVABLE_API_KEY: string,
  params: { section: string; subTopic: string; difficulty: string; needed: number }
): Promise<number> {
  const { section, subTopic, difficulty, needed } = params;
  const count = Math.min(needed, REFILL_COUNT);
  
  console.log(`🔄 Refilling ${count} questions for ${section}/${subTopic}/${difficulty}`);
  
  try {
    // Get smart training examples
    const examples = await getSmartTrainingExamples(
      supabase, 
      subTopic, 
      difficulty as 'easy' | 'medium' | 'hard', 
      5
    );
    
    // Get topic info
    const topicInfo = getTopicInfo(subTopic);
    
    // Build advanced prompt
    const promptSection = (topicInfo.section || section) as 'كمي' | 'لفظي';
    const advancedPrompt = buildAdvancedPrompt({
      subTopic,
      difficulty: difficulty as 'easy' | 'medium' | 'hard',
      count,
      examples,
      section: promptSection,
      topic: topicInfo.topic || subTopic
    });
    
    // Call AI
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
          { role: "user", content: `أنشئ ${count} سؤال متنوع عن "${subTopic}" الآن.` }
        ],
        temperature: 0.85,
        max_tokens: 15000
      })
    });

    if (!response.ok) {
      console.error(`❌ AI error for ${subTopic}: ${response.status}`);
      return 0;
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Parse questions
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error(`❌ No valid JSON for ${subTopic}`);
      return 0;
    }
    
    const questions = JSON.parse(jsonMatch[0]);
    const sectionValue = section === 'كمي' ? 'كمي' : 'لفظي';
    
    // Prepare bank entries
    const bankEntries = questions.slice(0, count).map((q: any) => ({
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
      created_by: 'auto_refill_cron',
      validation_status: 'approved'
    }));
    
    // Insert with conflict handling
    const { error: insertError, data: insertedData } = await supabase
      .from('questions_bank')
      .upsert(bankEntries, { 
        onConflict: 'question_hash',
        ignoreDuplicates: true 
      })
      .select('id');
    
    if (insertError) {
      console.error(`❌ Insert error for ${subTopic}:`, insertError.message);
      return 0;
    }
    
    const insertedCount = insertedData?.length || bankEntries.length;
    console.log(`✅ Added ${insertedCount} questions for ${section}/${subTopic}/${difficulty}`);
    return insertedCount;
    
  } catch (error) {
    console.error(`❌ Error refilling ${subTopic}:`, error);
    return 0;
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Verify CRON_SECRET
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  
  if (cronSecret !== expectedSecret) {
    console.error("❌ Unauthorized: Invalid CRON_SECRET");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  
  const startTime = Date.now();
  console.log(`🚀 Auto-refill monitor started at ${new Date().toISOString()}`);
  
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }
    
    // Get stats from questions_bank grouped by sub_topic and difficulty
    const { data: bankData, error: bankError } = await supabase
      .from('questions_bank')
      .select('subject, sub_topic, difficulty')
      .eq('validation_status', 'approved');
    
    if (bankError) {
      throw new Error(`Failed to fetch bank stats: ${bankError.message}`);
    }
    
    // Count questions by sub_topic and difficulty
    const stats: Record<string, { section: string; count: number }> = {};
    bankData?.forEach((q: any) => {
      const key = `${q.subject}|${q.sub_topic}|${q.difficulty}`;
      if (!stats[key]) {
        stats[key] = { section: q.subject, count: 0 };
      }
      stats[key].count++;
    });
    
    // Find low-stock topics (below threshold)
    const lowStockTopics: Array<{
      section: string;
      subTopic: string;
      difficulty: string;
      count: number;
      needed: number;
    }> = [];
    
    // ✅ الأسماء موحدة مع testStructure.ts و smartTrainingExamples.ts
    const subTopicsToMonitor = [
      // كمي - الجبر
      { section: 'كمي', subTopic: 'حساب الكسور', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'كمي', subTopic: 'المعادلات الخطية', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'كمي', subTopic: 'الجذور والأسس', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'كمي', subTopic: 'المتباينات', difficulties: ['easy', 'medium', 'hard'] },
      // كمي - الهندسة
      { section: 'كمي', subTopic: 'المساحات والمحيطات', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'كمي', subTopic: 'الزوايا والمثلثات', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'كمي', subTopic: 'الدوائر', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'كمي', subTopic: 'الحجوم', difficulties: ['easy', 'medium', 'hard'] },
      // كمي - الإحصاء
      { section: 'كمي', subTopic: 'المتوسط والوسيط', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'كمي', subTopic: 'المنوال والمدى', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'كمي', subTopic: 'قراءة الرسوم البيانية', difficulties: ['easy', 'medium', 'hard'] },
      // كمي - الأعداد
      { section: 'كمي', subTopic: 'النسب والتناسب', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'كمي', subTopic: 'النسب المئوية', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'كمي', subTopic: 'الأعداد الأولية', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'كمي', subTopic: 'القواسم والمضاعفات', difficulties: ['easy', 'medium', 'hard'] },
      // كمي - المعادلات
      { section: 'كمي', subTopic: 'المقارنات الكمية', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'كمي', subTopic: 'المعادلات التربيعية', difficulties: ['easy', 'medium', 'hard'] },
      // كمي - الاحتمالات
      { section: 'كمي', subTopic: 'الاحتمالات البسيطة', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'كمي', subTopic: 'التباديل والتوافيق', difficulties: ['easy', 'medium', 'hard'] },
      // كمي - المتتاليات
      { section: 'كمي', subTopic: 'المتتاليات الحسابية', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'كمي', subTopic: 'المتتاليات الهندسية', difficulties: ['easy', 'medium', 'hard'] },
      // لفظي - القراءة والاستيعاب
      { section: 'لفظي', subTopic: 'فهم النص', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'لفظي', subTopic: 'الفكرة الرئيسية', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'لفظي', subTopic: 'الاستنتاج من النص', difficulties: ['easy', 'medium', 'hard'] },
      // لفظي - المفردات
      { section: 'لفظي', subTopic: 'معاني الكلمات', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'لفظي', subTopic: 'المترادفات', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'لفظي', subTopic: 'الأضداد', difficulties: ['easy', 'medium', 'hard'] },
      // لفظي - التناظر اللفظي
      { section: 'لفظي', subTopic: 'علاقات الكلمات', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'لفظي', subTopic: 'التناظر المركب', difficulties: ['easy', 'medium', 'hard'] },
      // لفظي - إكمال الجمل
      { section: 'لفظي', subTopic: 'السياق اللغوي', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'لفظي', subTopic: 'الروابط اللغوية', difficulties: ['easy', 'medium', 'hard'] },
      // لفظي - الخطأ السياقي
      { section: 'لفظي', subTopic: 'تحديد الخطأ', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'لفظي', subTopic: 'تصحيح الخطأ', difficulties: ['easy', 'medium', 'hard'] },
      // لفظي - الارتباط والاختلاف
      { section: 'لفظي', subTopic: 'التصنيف المنطقي', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'لفظي', subTopic: 'الشاذ المختلف', difficulties: ['easy', 'medium', 'hard'] },
      // لفظي - الاستنتاج
      { section: 'لفظي', subTopic: 'الاستنتاج المنطقي', difficulties: ['easy', 'medium', 'hard'] },
      { section: 'لفظي', subTopic: 'القياس المنطقي', difficulties: ['easy', 'medium', 'hard'] },
    ];
    
    // Check each sub-topic/difficulty combination
    for (const topic of subTopicsToMonitor) {
      for (const difficulty of topic.difficulties) {
        const key = `${topic.section}|${topic.subTopic}|${difficulty}`;
        const currentCount = stats[key]?.count || 0;
        
        if (currentCount < MINIMUM_THRESHOLD) {
          lowStockTopics.push({
            section: topic.section,
            subTopic: topic.subTopic,
            difficulty,
            count: currentCount,
            needed: MINIMUM_THRESHOLD - currentCount
          });
        }
      }
    }
    
    // Sort by lowest count first (most urgent)
    lowStockTopics.sort((a, b) => a.count - b.count);
    
    console.log(`📊 Found ${lowStockTopics.length} topics below threshold (${MINIMUM_THRESHOLD})`);
    
    // Process only top N topics per run to avoid timeout
    const topicsToProcess = lowStockTopics.slice(0, MAX_TOPICS_PER_RUN);
    let totalAdded = 0;
    
    for (const topic of topicsToProcess) {
      const added = await refillSubTopic(supabase, LOVABLE_API_KEY, {
        section: topic.section,
        subTopic: topic.subTopic,
        difficulty: topic.difficulty,
        needed: topic.needed
      });
      totalAdded += added;
      
      // Small delay between API calls
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Refresh materialized view if we added questions
    if (totalAdded > 0) {
      try {
        await supabase.rpc('refresh_questions_stats');
        console.log('✅ Refreshed questions stats view');
      } catch (e) {
        console.warn('⚠️ Could not refresh stats view:', e);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`🏁 Auto-refill completed in ${duration}ms. Added ${totalAdded} questions.`);
    
    return new Response(JSON.stringify({
      success: true,
      lowStockCount: lowStockTopics.length,
      processedCount: topicsToProcess.length,
      questionsAdded: totalAdded,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("❌ Auto-refill monitor error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
