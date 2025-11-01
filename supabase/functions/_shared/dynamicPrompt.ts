import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

export interface UserWeakness {
  topic_name: string;
  success_rate: number;
  priority_score: number;
  trend: string;
  attempt_count: number;
}

export interface StudentLevel {
  level: 'struggling' | 'intermediate' | 'advanced';
  overall_success_rate: number;
  total_attempts: number;
}

export async function loadUserWeaknesses(
  supabase: SupabaseClient,
  userId: string,
  section: string,
  testType: string
): Promise<UserWeakness[]> {
  console.log(`📊 Loading weaknesses for user ${userId} - ${testType}/${section}`);
  
  const { data, error } = await supabase
    .from("user_weakness_profile")
    .select("topic_name, success_rate, priority_score, trend, attempt_count")
    .eq("user_id", userId)
    .eq("section", section)
    .eq("test_type", testType)
    .order("priority_score", { ascending: false })
    .limit(5);
  
  if (error) {
    console.error("❌ Error loading weaknesses:", error);
    return [];
  }
  
  console.log(`✅ Found ${data?.length || 0} weaknesses`);
  return data || [];
}

export async function calculateStudentLevel(
  supabase: SupabaseClient,
  userId: string
): Promise<StudentLevel> {
  console.log(`🎯 Calculating student level for ${userId}`);
  
  // Get recent performance (last 20 questions)
  const { data, error } = await supabase
    .from("user_performance_history")
    .select("is_correct")
    .eq("user_id", userId)
    .order("answered_at", { ascending: false })
    .limit(20);
  
  if (error || !data || data.length === 0) {
    console.log("⚠️ No performance history - using default intermediate level");
    return { 
      level: 'intermediate', 
      overall_success_rate: 0.5,
      total_attempts: 0
    };
  }
  
  const correctCount = data.filter(d => d.is_correct).length;
  const successRate = correctCount / data.length;
  
  let level: 'struggling' | 'intermediate' | 'advanced';
  if (successRate < 0.5) {
    level = 'struggling';
  } else if (successRate < 0.75) {
    level = 'intermediate';
  } else {
    level = 'advanced';
  }
  
  console.log(`✅ Student level: ${level} (${(successRate * 100).toFixed(0)}% success rate from ${data.length} attempts)`);
  
  return { 
    level, 
    overall_success_rate: successRate,
    total_attempts: data.length
  };
}

export function calculateDynamicTemperature(
  studentLevel: StudentLevel,
  testContext: 'initial_assessment' | 'weakness_targeting' | 'daily_practice' | 'strength_building'
): number {
  // Base temperatures by level
  const baseTemperatures = {
    struggling: 0.4,    // More focused, less creative
    intermediate: 0.7,  // Balanced
    advanced: 0.9       // More diverse and challenging
  };
  
  // Context modifiers
  const contextModifiers = {
    initial_assessment: 0.1,     // More diverse for assessment
    weakness_targeting: -0.1,    // More focused for weak areas
    strength_building: 0.15,     // More challenging for strengths
    daily_practice: 0.0          // Standard practice
  };
  
  const baseTemp = baseTemperatures[studentLevel.level];
  const modifier = contextModifiers[testContext];
  
  const finalTemp = Math.max(0.3, Math.min(1.0, baseTemp + modifier));
  
  console.log(`🌡️ Temperature: ${finalTemp} (base: ${baseTemp}, context: ${testContext}, modifier: ${modifier})`);
  
  return finalTemp;
}

export function buildDynamicSystemPrompt(
  basePrompt: string,
  weaknesses: UserWeakness[],
  studentLevel: StudentLevel,
  testContext: string
): string {
  let dynamicAdditions = '';
  
  console.log(`🔨 Building dynamic system prompt (level: ${studentLevel.level}, weaknesses: ${weaknesses.length})`);
  
  // Add weakness targeting section
  if (weaknesses.length > 0) {
    const weakTopics = weaknesses.map(w => 
      `- **${w.topic_name}** (معدل النجاح: ${(w.success_rate * 100).toFixed(0)}%, أولوية: ${(w.priority_score * 100).toFixed(0)}%, اتجاه: ${w.trend})`
    ).join('\n');
    
    dynamicAdditions += `

## 🎯 المفاهيم المستهدفة (نقاط ضعف الطالب):

${weakTopics}

**تعليمات مهمة للأسئلة:**
- ركز على هذه المواضيع بأولوية عالية (60-70% من الأسئلة)
- استخدم صيغ متنوعة جداً لنفس المفهوم (سياقات مختلفة، أنواع أسئلة مختلفة)
- اجعل الأسئلة واضحة مع شرح تفصيلي خطوة بخطوة
- ابدأ بأسئلة أسهل ثم تدرج في الصعوبة
`;
  }
  
  // Add student level instructions
  if (studentLevel.level === 'struggling') {
    dynamicAdditions += `

## 📘 تعليمات خاصة لمستوى الطالب (يواجه صعوبات):

**معدل نجاح الطالب:** ${(studentLevel.overall_success_rate * 100).toFixed(0)}% من ${studentLevel.total_attempts} محاولة

**يجب عليك:**
- استخدام لغة واضحة وبسيطة جداً
- تقديم أسئلة تدريجية الصعوبة (ابدأ بالسهل)
- جعل الخيارات متميزة وواضحة (لا لبس فيها)
- شرح الإجابة بالتفصيل مع خطوات الحل الكاملة
- استخدام أمثلة واقعية بسيطة ومألوفة
- تجنب الحالات الخاصة أو المعقدة
`;
  } else if (studentLevel.level === 'advanced') {
    dynamicAdditions += `

## 🎓 تعليمات خاصة لمستوى الطالب (متقدم):

**معدل نجاح الطالب:** ${(studentLevel.overall_success_rate * 100).toFixed(0)}% من ${studentLevel.total_attempts} محاولة

**يجب عليك:**
- تقديم أسئلة معقدة متعددة الخطوات
- استخدام سياقات واقعية متقدمة ومعقدة
- إضافة حالات خاصة وتحديات إضافية
- التركيز على التفكير النقدي والتحليل العميق
- دمج عدة مفاهيم في سؤال واحد
- استخدام أرقام وحسابات غير تقليدية
`;
  } else {
    dynamicAdditions += `

## 📖 تعليمات خاصة لمستوى الطالب (متوسط):

**معدل نجاح الطالب:** ${(studentLevel.overall_success_rate * 100).toFixed(0)}% من ${studentLevel.total_attempts} محاولة

**يجب عليك:**
- التوازن بين الوضوح والتحدي
- استخدام أسئلة متدرجة (سهلة، متوسطة، صعبة)
- تقديم شرح واضح مع خطوات الحل
- استخدام سياقات واقعية متنوعة
`;
  }
  
  console.log(`✅ Dynamic prompt built successfully`);
  
  return basePrompt + dynamicAdditions;
}
