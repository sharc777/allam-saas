import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface TrainingExample {
  id: string;
  section: string;
  topic: string;
  sub_topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_text: string;
  options: Record<string, string>;
  correct_answer: string;
  explanation: string;
  quality_score: number;
  success_rate?: number;
  usage_count?: number;
  last_used_at?: string;
  generated_questions_count?: number;
}

/**
 * Topic mapping from testStructure - موحد مع src/config/testStructure.ts
 * ✅ جميع الأسماء تستخدم مسافات بدلاً من _
 */
const TOPIC_MAPPING: Record<string, { topic: string; section: string }> = {
  // كمي - الجبر
  'حساب الكسور': { topic: 'الجبر', section: 'كمي' },
  'المعادلات الخطية': { topic: 'الجبر', section: 'كمي' },
  'الجذور والأسس': { topic: 'الجبر', section: 'كمي' },
  'المتباينات': { topic: 'الجبر', section: 'كمي' },
  
  // كمي - الهندسة
  'المساحات والمحيطات': { topic: 'الهندسة', section: 'كمي' },
  'الزوايا والمثلثات': { topic: 'الهندسة', section: 'كمي' },
  'الدوائر': { topic: 'الهندسة', section: 'كمي' },
  'الحجوم': { topic: 'الهندسة', section: 'كمي' },
  
  // كمي - الإحصاء
  'المتوسط والوسيط': { topic: 'الإحصاء', section: 'كمي' },
  'المنوال والمدى': { topic: 'الإحصاء', section: 'كمي' },
  'قراءة الرسوم البيانية': { topic: 'الإحصاء', section: 'كمي' },
  
  // كمي - الأعداد
  'النسب والتناسب': { topic: 'الأعداد', section: 'كمي' },
  'النسب المئوية': { topic: 'الأعداد', section: 'كمي' },
  'الأعداد الأولية': { topic: 'الأعداد', section: 'كمي' },
  'القواسم والمضاعفات': { topic: 'الأعداد', section: 'كمي' },
  
  // كمي - المعادلات
  'المقارنات الكمية': { topic: 'المعادلات', section: 'كمي' },
  'المعادلات التربيعية': { topic: 'المعادلات', section: 'كمي' },
  
  // كمي - الاحتمالات
  'الاحتمالات البسيطة': { topic: 'الاحتمالات', section: 'كمي' },
  'التباديل والتوافيق': { topic: 'الاحتمالات', section: 'كمي' },
  
  // كمي - المتتاليات
  'المتتاليات الحسابية': { topic: 'المتتاليات', section: 'كمي' },
  'المتتاليات الهندسية': { topic: 'المتتاليات', section: 'كمي' },
  
  // لفظي - القراءة والاستيعاب
  'فهم النص': { topic: 'القراءة والاستيعاب', section: 'لفظي' },
  'الفكرة الرئيسية': { topic: 'القراءة والاستيعاب', section: 'لفظي' },
  'الاستنتاج من النص': { topic: 'القراءة والاستيعاب', section: 'لفظي' },
  
  // لفظي - المفردات
  'معاني الكلمات': { topic: 'المفردات', section: 'لفظي' },
  'المترادفات': { topic: 'المفردات', section: 'لفظي' },
  'الأضداد': { topic: 'المفردات', section: 'لفظي' },
  
  // لفظي - التناظر اللفظي
  'علاقات الكلمات': { topic: 'التناظر اللفظي', section: 'لفظي' },
  'التناظر المركب': { topic: 'التناظر اللفظي', section: 'لفظي' },
  
  // لفظي - إكمال الجمل
  'السياق اللغوي': { topic: 'إكمال الجمل', section: 'لفظي' },
  'الروابط اللغوية': { topic: 'إكمال الجمل', section: 'لفظي' },
  
  // لفظي - الخطأ السياقي
  'تحديد الخطأ': { topic: 'الخطأ السياقي', section: 'لفظي' },
  'تصحيح الخطأ': { topic: 'الخطأ السياقي', section: 'لفظي' },
  
  // لفظي - الارتباط والاختلاف
  'التصنيف المنطقي': { topic: 'الارتباط والاختلاف', section: 'لفظي' },
  'الشاذ المختلف': { topic: 'الارتباط والاختلاف', section: 'لفظي' },
  
  // لفظي - الاستنتاج
  'الاستنتاج المنطقي': { topic: 'الاستنتاج', section: 'لفظي' },
  'القياس المنطقي': { topic: 'الاستنتاج', section: 'لفظي' },
};

/**
 * Get topic and section from sub_topic
 */
export function getTopicInfo(subTopic: string): { topic: string; section: string } {
  return TOPIC_MAPPING[subTopic] || { topic: subTopic, section: 'كمي' };
}

/**
 * ✨ Smart function to select the best training examples
 * Uses tiered strategy:
 * 1. Exact match (same sub_topic + difficulty)
 * 2. Same sub_topic, different difficulty
 * 3. Same topic (parent)
 * 4. Same section as fallback
 */
export async function getSmartTrainingExamples(
  supabase: SupabaseClient,
  subTopic: string,
  difficulty: 'easy' | 'medium' | 'hard',
  minCount: number = 5
): Promise<TrainingExample[]> {
  
  const examples: TrainingExample[] = [];
  const { topic, section } = getTopicInfo(subTopic);
  
  console.log(`🔍 Finding training examples for: ${subTopic} (${difficulty}) - Topic: ${topic}, Section: ${section}`);
  
  // Strategy 1: Exact match (same sub_topic + difficulty)
  const { data: exactMatch, error: exactError } = await supabase
    .from('ai_training_examples')
    .select('*')
    .eq('sub_topic', subTopic)
    .eq('difficulty', difficulty)
    .eq('validation_status', 'approved')
    .gte('quality_score', 4)
    .order('success_rate', { ascending: false, nullsFirst: false })
    .order('quality_score', { ascending: false })
    .order('usage_count', { ascending: true })
    .limit(minCount);

  if (exactError) {
    console.error('❌ Error fetching exact match examples:', exactError);
  } else if (exactMatch && exactMatch.length > 0) {
    console.log(`✅ Strategy 1: Found ${exactMatch.length} exact match examples`);
    examples.push(...exactMatch);
  }

  // Strategy 2: Same sub_topic, different difficulty
  if (examples.length < minCount) {
    const existingIds = examples.map(e => e.id);
    
    const { data: sameSubTopic, error: subTopicError } = await supabase
      .from('ai_training_examples')
      .select('*')
      .eq('sub_topic', subTopic)
      .eq('validation_status', 'approved')
      .gte('quality_score', 3)
      .not('id', 'in', `(${existingIds.length > 0 ? existingIds.join(',') : 'null'})`)
      .order('success_rate', { ascending: false, nullsFirst: false })
      .order('quality_score', { ascending: false })
      .limit(minCount - examples.length);
    
    if (!subTopicError && sameSubTopic && sameSubTopic.length > 0) {
      console.log(`✅ Strategy 2: Found ${sameSubTopic.length} same sub_topic examples`);
      examples.push(...sameSubTopic);
    }
  }

  // Strategy 3: Same topic (parent)
  if (examples.length < minCount) {
    const existingIds = examples.map(e => e.id);
    
    const { data: sameTopic, error: topicError } = await supabase
      .from('ai_training_examples')
      .select('*')
      .eq('topic', topic)
      .eq('difficulty', difficulty)
      .eq('validation_status', 'approved')
      .gte('quality_score', 3)
      .not('id', 'in', `(${existingIds.length > 0 ? existingIds.join(',') : 'null'})`)
      .order('success_rate', { ascending: false, nullsFirst: false })
      .limit(minCount - examples.length);
    
    if (!topicError && sameTopic && sameTopic.length > 0) {
      console.log(`✅ Strategy 3: Found ${sameTopic.length} same topic examples`);
      examples.push(...sameTopic);
    }
  }

  // Strategy 4: Same section as fallback
  if (examples.length < 3) {
    const existingIds = examples.map(e => e.id);
    
    const { data: sameSection, error: sectionError } = await supabase
      .from('ai_training_examples')
      .select('*')
      .eq('section', section)
      .eq('difficulty', difficulty)
      .eq('validation_status', 'approved')
      .gte('quality_score', 4)
      .not('id', 'in', `(${existingIds.length > 0 ? existingIds.join(',') : 'null'})`)
      .order('success_rate', { ascending: false, nullsFirst: false })
      .limit(3 - examples.length);
    
    if (!sectionError && sameSection && sameSection.length > 0) {
      console.log(`✅ Strategy 4: Found ${sameSection.length} same section examples`);
      examples.push(...sameSection);
    }
  }

  // Update usage_count for used examples (increment each by 1)
  if (examples.length > 0) {
    for (const example of examples) {
      const newUsageCount = (example.usage_count || 0) + 1;
      
      const { error: updateError } = await supabase
        .from('ai_training_examples')
        .update({ 
          usage_count: newUsageCount,
          last_used_at: new Date().toISOString()
        })
        .eq('id', example.id);
      
      if (updateError) {
        console.warn('⚠️ Could not update usage_count for example:', example.id, updateError);
      }
    }
  }

  // Warning if not enough examples
  if (examples.length < 3) {
    console.warn(`⚠️ LOW TRAINING DATA: Only ${examples.length} examples found for ${subTopic} (${difficulty})`);
  } else {
    console.log(`📚 Total examples selected: ${examples.length}`);
  }

  return examples;
}

/**
 * Generate a unique hash for a training example
 */
export async function generateExampleHash(questionText: string, subTopic: string): Promise<string> {
  const content = `${questionText}-${subTopic}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}
