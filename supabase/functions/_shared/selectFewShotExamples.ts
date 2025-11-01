import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

export interface FewShotExample {
  question_text: string;
  options: any;
  correct_answer: string;
  explanation: string;
  quality_score: number;
}

export async function selectFewShotExamples(
  supabase: SupabaseClient,
  params: {
    topic?: string;
    section: string;
    test_type: string;
    difficulty?: string;
    count?: number;
  }
): Promise<FewShotExample[]> {
  const { topic, section, test_type, difficulty, count = 3 } = params;
  
  console.log(`🎓 Selecting ${count} few-shot examples for ${test_type}/${section}`);
  
  let query = supabase
    .from("ai_training_examples")
    .select("question_text, options, correct_answer, explanation, quality_score")
    .eq("section", section)
    .eq("test_type", test_type)
    .order("quality_score", { ascending: false });
  
  if (topic) {
    query = query.eq("subject", topic);
  }
  
  if (difficulty) {
    query = query.eq("difficulty", difficulty);
  }
  
  query = query.limit(count * 2); // Get more to ensure diversity
  
  const { data, error } = await query;
  
  if (error) {
    console.error("❌ Error selecting few-shot examples:", error);
    return [];
  }
  
  if (!data || data.length === 0) {
    console.log("⚠️ No few-shot examples found");
    return [];
  }
  
  // Shuffle and select
  const shuffled = data.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);
  
  console.log(`✅ Selected ${selected.length} few-shot examples`);
  return selected;
}

export function injectFewShotExamples(
  basePrompt: string,
  examples: FewShotExample[]
): string {
  if (examples.length === 0) {
    console.log("⚠️ No examples to inject");
    return basePrompt;
  }
  
  const examplesSection = `

## 📚 أمثلة لأسئلة عالية الجودة (اتبع نفس المستوى):

${examples.map((ex, idx) => `
### مثال ${idx + 1}:
**السؤال:** ${ex.question_text}
**الخيارات:** ${JSON.stringify(ex.options, null, 2)}
**الإجابة الصحيحة:** ${ex.correct_answer}
**الشرح:** ${ex.explanation}
**لماذا هذا مثال ممتاز:**
- السؤال واضح ومباشر
- الخيارات متميزة ومختلفة
- الشرح مفصل وسهل الفهم
- يتبع المعايير الأكاديمية
`).join('\n---\n')}

**مهم جداً:** 
- اتبع **نفس مستوى الجودة والوضوح** في الأمثلة أعلاه
- استخدم نفس أسلوب الصياغة والشرح
- تأكد من تنوع الأسئلة وعدم تكرار المفاهيم بنفس الطريقة
`;
  
  return basePrompt + examplesSection;
}
