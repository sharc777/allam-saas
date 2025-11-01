import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

export interface FewShotExample {
  question_text: string;
  options: any;
  correct_answer: string;
  explanation: string;
  quality_score: number;
  subject?: string;
  difficulty?: string;
  section?: string;
}

// Phase 3: Advanced Few-Shot Selection with Weakness Profile Integration
export async function selectFewShotExamples(
  supabase: SupabaseClient,
  params: {
    topic?: string;
    section: string;
    test_type: string;
    difficulty?: string;
    count?: number;
    useQualityScoring?: boolean;
    diversityMode?: 'balanced' | 'topic-focused' | 'difficulty-spread' | 'weakness-focused';
    userId?: string;
    weakTopics?: string[];
    studentLevel?: string;
  }
): Promise<FewShotExample[]> {
  const { 
    topic, 
    section, 
    test_type, 
    difficulty, 
    count = 3,
    useQualityScoring = true,
    diversityMode = 'balanced',
    userId,
    weakTopics = [],
    studentLevel = 'متوسط'
  } = params;
  
  console.log(`🎓 Phase 3: Weakness-aware few-shot selection for ${test_type}/${section}`, {
    topic, difficulty, count, useQualityScoring, diversityMode, weakTopics: weakTopics.length, studentLevel
  });
  
  // Phase 3: Adjust quality threshold based on student level
  const minQuality = studentLevel === 'مبتدئ' ? 4 : 3;
  
  let query = supabase
    .from("ai_training_examples")
    .select("*")
    .eq("section", section)
    .eq("test_type", test_type);
  
  // Phase 3: Quality-first ordering with dynamic threshold
  if (useQualityScoring) {
    query = query
      .order("quality_score", { ascending: false, nullsFirst: false })
      .gte("quality_score", minQuality);
  }
  
  // Fetch larger pool for diversity
  const fetchCount = Math.min(count * 4, 30);
  query = query.limit(fetchCount);
  
  const { data, error } = await query;
  
  if (error) {
    console.error("❌ Error selecting few-shot examples:", error);
    return [];
  }
  
  if (!data || data.length === 0) {
    console.log("⚠️ No few-shot examples found");
    return [];
  }
  
  // Phase 3: Apply diversity strategy with weakness awareness
  let selected: any[] = [];
  
  switch (diversityMode) {
    case 'weakness-focused':
      // Phase 3: Prioritize examples from weak topics
      const weaknessExamples = data.filter((ex: any) => 
        weakTopics.includes(ex.subject)
      );
      const otherExamples = data.filter((ex: any) => 
        !weakTopics.includes(ex.subject)
      );
      
      // For beginners with weaknesses: easier examples from weak topics
      if (studentLevel === 'مبتدئ' && weaknessExamples.length > 0) {
        const easyWeak = weaknessExamples.filter((ex: any) => 
          ['easy', 'medium'].includes(ex.difficulty)
        );
        const hardWeak = weaknessExamples.filter((ex: any) => 
          ex.difficulty === 'hard'
        );
        
        selected = [
          ...easyWeak.slice(0, Math.ceil(count * 0.6)),
          ...hardWeak.slice(0, Math.floor(count * 0.2)),
          ...otherExamples.slice(0, Math.floor(count * 0.2))
        ];
      } else {
        // Regular weakness-focused distribution
        selected = [
          ...weaknessExamples.slice(0, Math.ceil(count * 0.7)),
          ...otherExamples.slice(0, Math.floor(count * 0.3))
        ];
      }
      break;
      
    case 'topic-focused':
      const topicMatches = topic ? data.filter((ex: any) => ex.subject === topic) : [];
      const others = topic ? data.filter((ex: any) => ex.subject !== topic) : data;
      selected = [
        ...topicMatches.slice(0, Math.ceil(count * 0.7)),
        ...others.slice(0, Math.floor(count * 0.3))
      ];
      break;
      
    case 'difficulty-spread':
      const byDifficulty: Record<string, any[]> = { easy: [], medium: [], hard: [] };
      data.forEach((ex: any) => {
        const diff = ex.difficulty || 'medium';
        if (byDifficulty[diff]) byDifficulty[diff].push(ex);
      });
      
      const perLevel = Math.ceil(count / 3);
      selected = [
        ...byDifficulty.easy.slice(0, perLevel),
        ...byDifficulty.medium.slice(0, perLevel),
        ...byDifficulty.hard.slice(0, perLevel)
      ];
      break;
      
    case 'balanced':
    default:
      const topicRelevant = topic ? data.filter((ex: any) => ex.subject === topic) : [];
      const highQuality = data.filter((ex: any) => (ex.quality_score || 0) >= 4);
      const random = data.sort(() => Math.random() - 0.5);
      
      const pool = Array.from(new Set([...topicRelevant, ...highQuality, ...random]));
      selected = pool.slice(0, count);
      break;
  }
  
  console.log(`✅ Phase 3: Selected ${selected.length} examples (${diversityMode} strategy, weakTopics: ${weakTopics.length})`);
  return selected.slice(0, count);
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
