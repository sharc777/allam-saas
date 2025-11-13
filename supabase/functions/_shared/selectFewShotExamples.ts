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
  
  // Phase 3: NEW - Strict diversity enforcement
  // Rule 1: Determine target count based on student level (3-5 examples)
  const targetCount = studentLevel === 'مبتدئ' ? 3 : 
                      studentLevel === 'متوسط' ? 4 : 5;
  
  // Rule 2: Only use examples with quality_score >= 4
  const highQualityExamples = data.filter((ex: any) => (ex.quality_score || 0) >= 4);
  
  console.log(`📊 Quality filter: ${highQualityExamples.length}/${data.length} examples with score >= 4`);
  
  if (highQualityExamples.length === 0) {
    console.warn("⚠️ No high-quality examples found (score >= 4)");
    return [];
  }
  
  // Rule 3: Max 1 example per topic (subject)
  const selectedTopics = new Set<string>();
  const selectedSubjects = new Set<string>();
  let selected: any[] = [];
  
  // Phase 3: Apply diversity strategy with strict rules
  switch (diversityMode) {
    case 'weakness-focused':
      // Phase 3: Prioritize examples from weak topics (1 per topic)
      const weaknessExamples = highQualityExamples.filter((ex: any) => 
        weakTopics.includes(ex.subject) && !selectedSubjects.has(ex.subject)
      );
      const otherExamples = highQualityExamples.filter((ex: any) => 
        !weakTopics.includes(ex.subject) && !selectedSubjects.has(ex.subject)
      );
      
      // For beginners with weaknesses: easier examples from weak topics
      if (studentLevel === 'مبتدئ' && weaknessExamples.length > 0) {
        const easyWeak = weaknessExamples.filter((ex: any) => 
          ['easy', 'medium'].includes(ex.difficulty)
        );
        const hardWeak = weaknessExamples.filter((ex: any) => 
          ex.difficulty === 'hard'
        );
        
        // Add unique examples (max 1 per topic)
        for (const ex of easyWeak) {
          if (!selectedSubjects.has(ex.subject) && selected.length < Math.ceil(targetCount * 0.6)) {
            selected.push(ex);
            selectedSubjects.add(ex.subject);
          }
        }
        for (const ex of hardWeak) {
          if (!selectedSubjects.has(ex.subject) && selected.length < Math.ceil(targetCount * 0.8)) {
            selected.push(ex);
            selectedSubjects.add(ex.subject);
          }
        }
        for (const ex of otherExamples) {
          if (!selectedSubjects.has(ex.subject) && selected.length < targetCount) {
            selected.push(ex);
            selectedSubjects.add(ex.subject);
          }
        }
      } else {
        // Regular weakness-focused distribution
        for (const ex of weaknessExamples) {
          if (!selectedSubjects.has(ex.subject) && selected.length < Math.ceil(targetCount * 0.7)) {
            selected.push(ex);
            selectedSubjects.add(ex.subject);
          }
        }
        for (const ex of otherExamples) {
          if (!selectedSubjects.has(ex.subject) && selected.length < targetCount) {
            selected.push(ex);
            selectedSubjects.add(ex.subject);
          }
        }
      }
      break;
      
    case 'topic-focused':
      const topicMatches = topic ? highQualityExamples.filter((ex: any) => 
        ex.subject === topic && !selectedSubjects.has(ex.subject)
      ) : [];
      const others = topic ? highQualityExamples.filter((ex: any) => 
        ex.subject !== topic && !selectedSubjects.has(ex.subject)
      ) : highQualityExamples;
      
      // Add unique topic-focused examples
      for (const ex of topicMatches) {
        if (!selectedSubjects.has(ex.subject) && selected.length < Math.ceil(targetCount * 0.7)) {
          selected.push(ex);
          selectedSubjects.add(ex.subject);
        }
      }
      for (const ex of others) {
        if (!selectedSubjects.has(ex.subject) && selected.length < targetCount) {
          selected.push(ex);
          selectedSubjects.add(ex.subject);
        }
      }
      break;
      
    case 'difficulty-spread':
      const byDifficulty: Record<string, any[]> = { easy: [], medium: [], hard: [] };
      highQualityExamples.forEach((ex: any) => {
        const diff = ex.difficulty || 'medium';
        if (byDifficulty[diff]) byDifficulty[diff].push(ex);
      });
      
      const perLevel = Math.ceil(targetCount / 3);
      
      // Add examples ensuring uniqueness per topic
      for (const ex of byDifficulty.easy) {
        if (!selectedSubjects.has(ex.subject) && selected.length < perLevel) {
          selected.push(ex);
          selectedSubjects.add(ex.subject);
        }
      }
      for (const ex of byDifficulty.medium) {
        if (!selectedSubjects.has(ex.subject) && selected.length < perLevel * 2) {
          selected.push(ex);
          selectedSubjects.add(ex.subject);
        }
      }
      for (const ex of byDifficulty.hard) {
        if (!selectedSubjects.has(ex.subject) && selected.length < targetCount) {
          selected.push(ex);
          selectedSubjects.add(ex.subject);
        }
      }
      break;
      
    case 'balanced':
    default:
      // Shuffle high-quality examples for randomness
      const shuffled = highQualityExamples.sort(() => Math.random() - 0.5);
      
      // Add examples ensuring no topic repetition
      for (const ex of shuffled) {
        if (!selectedSubjects.has(ex.subject) && selected.length < targetCount) {
          selected.push(ex);
          selectedSubjects.add(ex.subject);
        }
      }
      break;
  }
  
  console.log(`✅ Phase 3: Selected ${selected.length} unique examples (${diversityMode} strategy, ${selectedSubjects.size} unique topics)`);
  console.log(`📌 Topics: ${Array.from(selectedSubjects).join(', ')}`);
  
  return selected.slice(0, targetCount);
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
