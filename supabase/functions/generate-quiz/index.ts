import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dayNumber, difficulty = "medium", testType = "قدرات", track = "عام", contentId, mode, questionCount, sectionFilter, subjectsFilter, topics } = await req.json();
    
    const authHeader = req.headers.get("authorization");
    console.log("Auth header received:", authHeader ? "Present" : "Missing");
    
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Extract token from Bearer header
    const token = authHeader.replace("Bearer ", "");
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { 
        global: { 
          headers: { 
            Authorization: `Bearer ${token}` 
          } 
        } 
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    console.log("User auth result:", user ? `User: ${user.id}` : "No user", userError ? `Error: ${userError.message}` : "");
    
    if (userError || !user) {
      console.error("Authentication failed:", userError);
      throw new Error("Unauthorized");
    }

    // Determine mode early for use throughout the function
    const isPracticeMode = mode === 'practice';
    const isInitialAssessment = mode === 'initial_assessment';

    // Get daily content (by contentId or dayNumber) or use practice mode
    let content: any;
    let contentError: any;
    
    if (contentId) {
      // Fetch by contentId for lesson-specific quizzes
      const result = await supabase
        .from("daily_content")
        .select("*")
        .eq("id", contentId)
        .single();
      content = result.data;
      contentError = result.error;
    } else if (dayNumber) {
      // Fetch by dayNumber for daily quizzes
      const result = await supabase
        .from("daily_content")
        .select("*")
        .eq("day_number", dayNumber)
        .single();
      content = result.data;
      contentError = result.error;
    } else if (mode === "practice") {
      // Practice mode: no specific content, use knowledge base only
      content = {
        title: "اختبار تدريبي شامل",
        description: "اختبار تدريبي يغطي جميع المواضيع",
        content_text: "",
        topics: null
      };
    } else if (mode === "initial_assessment") {
      // Initial Assessment mode: comprehensive evaluation quiz
      content = {
        title: "التقييم الأولي",
        description: "اختبار شامل لتحديد مستواك الحالي",
        content_text: "",
        topics: null
      };
    } else {
      throw new Error("يجب تحديد contentId أو dayNumber أو mode: practice أو mode: initial_assessment");
    }

    if (mode !== "practice" && mode !== "initial_assessment" && (contentError || !content)) {
      throw new Error("المحتوى غير موجود");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating quiz - Day:", dayNumber, "Difficulty:", difficulty, "Test Type:", testType, "Track:", track);

    // Load AI settings from database FIRST
    const { data: aiSettingsData } = await supabase
      .from("ai_settings")
      .select("*");
    
    const aiSettings: Record<string, any> = {};
    aiSettingsData?.forEach(setting => {
      aiSettings[setting.setting_key] = setting.setting_value;
    });

    // Extract configuration with defaults
    const quizLimits = aiSettings.quiz_limits || { 
      min_questions: 5, 
      max_questions: 50, 
      default_questions: 10,
      min_ratio: 0.6 
    };
    const quizModel = aiSettings.quiz_model?.model || "google/gemini-2.5-flash";
    const quizTemp = aiSettings.quiz_generation_temperature?.temperature || 0.7;
    const sectionsConfig = aiSettings.quiz_sections_config || {};
    const kbLimits = aiSettings.kb_limits || { practice_fetch_limit: 20, lesson_fetch_limit: 5 };
    const systemPromptOverride = aiSettings.system_prompt?.ar || "";

    console.log("AI Settings loaded:", { quizModel, quizTemp, minRatio: quizLimits.min_ratio });

    // Phase 3: Fetch knowledge base content and extract available topics
    let additionalKnowledge = "";
    let availableTopics: string[] = [];
    let allRelatedTopics: string[] = [];
    let knowledgeData: any[] = [];
    
    if (isPracticeMode) {
      // In practice mode, fetch ALL relevant knowledge base content
      let kbQuery = supabase
        .from("knowledge_base")
        .select("*")
        .eq("test_type", testType)
        .eq("track", track)
        .eq("is_active", true);
      
      const { data: kbData } = await kbQuery.limit(kbLimits.practice_fetch_limit || 20);
      
      knowledgeData = kbData || [];
      
      // Plan #1: Filter knowledge base by section (لفظي/كمي)
      if (sectionFilter && knowledgeData.length > 0) {
        const sectionKeyword = sectionFilter === "لفظي" ? "القسم اللفظي" : "القسم الكمي";
        const filteredKB = knowledgeData.filter(kb => 
          kb.related_topics?.some((rt: string) => rt.includes(sectionKeyword))
        );
        
        if (filteredKB.length > 0) {
          knowledgeData = filteredKB;
          console.log(`Filtered knowledge base to ${knowledgeData.length} ${sectionFilter} topics`);
        } else {
          console.warn(`No ${sectionFilter} topics found in KB, using all topics with strict prompting`);
        }
      }
      
      if (knowledgeData.length > 0) {
        // Extract topics from knowledge base
        availableTopics = knowledgeData.map(kb => kb.title);
        allRelatedTopics = knowledgeData.flatMap(kb => kb.related_topics || []);
        
        additionalKnowledge = "\n\n📚 **المحتوى المعرفي المتاح:**\n" + 
          knowledgeData.map(kb => 
            `**${kb.title}:**\n${kb.content?.substring(0, 500) || 'لا يوجد محتوى'}...\n`
          ).join("\n");
        
        console.log(`Knowledge base topics: ${availableTopics.join(', ')}`);
      }
    } else if (content.topics) {
      // For lesson-specific quizzes, fetch related knowledge
      const topicsData = content.topics as any;
      const sections = topicsData?.sections || [];
      const allTopics = sections.flatMap((section: any) => section.subtopics || []);
      
      if (allTopics.length > 0) {
        const { data: kbData } = await supabase
          .from("knowledge_base")
          .select("*")
          .eq("test_type", testType)
          .eq("track", track)
          .eq("is_active", true)
          .limit(kbLimits.lesson_fetch_limit || 5);
        
        knowledgeData = kbData || [];
        
        if (knowledgeData.length > 0) {
          availableTopics = knowledgeData.map(kb => kb.title);
          allRelatedTopics = knowledgeData.flatMap(kb => kb.related_topics || []);
          
          additionalKnowledge = "\n\n📚 **محتوى معرفي إضافي:**\n" + 
            knowledgeData.map(kb => 
              `**${kb.title}:**\n${kb.content?.substring(0, 300) || 'لا يوجد محتوى'}...\n`
            ).join("\n");
        }
      }
    }

    // Fetch previous question hashes to avoid duplicates
    const { data: prevHashesData } = await supabase
      .from("generated_questions_log")
      .select("question_hash")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500); // Increased limit to avoid more duplicates

    const usedHashes = new Set(prevHashesData?.map(p => p.question_hash) || []);
    console.log(`Found ${usedHashes.size} previous question hashes to avoid`);

    // Phase 2: Calculate question counts with buffer
    const actualDifficulty = isPracticeMode && !difficulty ? 'easy' : difficulty;
    
    // Get section-specific config
    const sectionConfig = sectionFilter && sectionsConfig[testType]?.[sectionFilter];
    const defaultCount = sectionConfig?.default_count || quizLimits.default_questions;
    
    // Use questionCount if provided, else use config default, clamped to limits
    const baseQuestions = questionCount || (isInitialAssessment ? 25 : defaultCount);
    const targetQuestions = Math.max(quizLimits.min_questions, Math.min(quizLimits.max_questions, baseQuestions));
    
    // Plan #4: Increase buffer to 2.0 for better coverage
    const bufferMultiplier = 2.0;
    const numQuestions = Math.ceil(targetQuestions * bufferMultiplier);
    
    const verbalQuestions = isInitialAssessment ? 13 : (questionCount ? Math.ceil(questionCount / 2) : 5);
    const quantQuestions = isInitialAssessment ? 12 : (questionCount ? Math.floor(questionCount / 2) : 5);
    
    console.log("Question counts:", { targetQuestions, numQuestions, baseQuestions });
    
    // Fetch previous questions to avoid duplication (Phase 2)
    const { data: previousQuestions } = await supabase
      .from("generated_questions_log")
      .select("question_hash")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    
    const previousHashes = new Set(previousQuestions?.map(q => q.question_hash) || []);
    console.log(`Found ${previousHashes.size} previous question hashes to avoid`);

    // Build context for the AI based on available content
    let contextPrompt = '';
    let filterPrompt = '';
    
    if (sectionFilter) {
      filterPrompt += `\nالقسم المطلوب: ${sectionFilter}`;
    }
    if (subjectsFilter && subjectsFilter.length > 0) {
      filterPrompt += `\nالمواد المطلوبة: ${subjectsFilter.join('، ')}`;
    }
    if (topics && topics.length > 0) {
      filterPrompt += `\nالمواضيع المحددة: ${topics.join('، ')}`;
    }
    
    if (content) {
      contextPrompt = `
المحتوى التعليمي:
العنوان: ${content.title}
الوصف: ${content.description || 'غير متوفر'}

النقاط الأساسية:
${content.key_points?.join('\n') || 'غير متوفرة'}

محتوى الدرس:
${content.content_text || 'غير متوفر'}

نصائح سريعة:
${content.quick_tips?.join('\n') || 'غير متوفرة'}
${filterPrompt}

${isPracticeMode ? 'هذا تدريب عملي على مهارات الدرس. اجعل الأسئلة تطبيقية ومباشرة. يجب تضمين تفسير تعليمي مفصل وواضح لكل إجابة.' : ''}
`;
    } else if (isPracticeMode) {
      contextPrompt = `
هذا اختبار تدريبي عام لتحسين المهارات.
${filterPrompt}
`;
    } else {
      contextPrompt = `
هذا اختبار لليوم ${dayNumber} من البرنامج التدريبي.
قم بإنشاء أسئلة متنوعة ومناسبة للمستوى المطلوب.
${filterPrompt}
`;
    }

    // Phase 3: Build system prompt with knowledge base topics as primary source
    let systemPrompt = systemPromptOverride ? `${systemPromptOverride}\n\n` : "";
    
    // Plan #6: Add section-specific KB topics with strict instructions
    if (isPracticeMode && availableTopics.length > 0) {
      systemPrompt += `
📚 **المواضيع المتاحة في قاعدة المعرفة${sectionFilter ? ` (${sectionFilter} فقط)` : ''}:**
${availableTopics.map((topic, i) => `${i+1}. ${topic}`).join('\n')}

⚠️ **مهم جداً - قاعدة المعرفة هي المصدر الأساسي:**
- جميع الأسئلة يجب أن تكون من المواضيع المذكورة أعلاه فقط
- لا تولّد أسئلة خارج هذه المواضيع
- استخدم المحتوى المعرفي المتوفر كمرجع أساسي
${sectionFilter ? `- جميع الأسئلة يجب أن تكون ${sectionFilter} حصرياً` : ''}
- يمكنك استخدام المواضيع المرتبطة: ${allRelatedTopics.join('، ')}

`;
    }

    if (testType === "قدرات") {
      // Phase 1: Section-specific prompts with dynamic override
      if (sectionFilter === "كمي") {
        const customPrompt = sectionConfig?.prompt_override || "";
        const subjects = sectionConfig?.subjects || ["الحساب","الجبر","الهندسة","الإحصاء والاحتمالات","مسائل منطقية"];
        
        systemPrompt += customPrompt || `أنت خبير في تصميم القسم الكمي من اختبار القدرات العامة (GAT) السعودي.

🔢 **القسم الكمي - رياضيات فقط:**
${isInitialAssessment ? `الاختبار يتكون من 12 سؤال كمي:` : `الاختبار يتكون من ${targetQuestions} أسئلة كمي:`}

**أنواع الأسئلة المطلوبة (رياضيات فقط):**
${subjects.map((s: string, i: number) => `${i+1}. ${s}`).join('\n')}

⚠️ **مهم جداً:** 
- جميع الأسئلة يجب أن تكون رياضية فقط
- لا أسئلة لفظية نهائياً
- كل سؤال يحتوي على أرقام أو معادلات أو أشكال هندسية

**معايير الجودة:**
- أسئلة رياضية واضحة
- خيارات عددية معقولة
- مستوى: ${isPracticeMode ? "easy" : difficulty}
${isPracticeMode ? "- تفسير رياضي مفصل لكل إجابة" : ""}`;
      } else if (sectionFilter === "لفظي") {
        const customPrompt = sectionConfig?.prompt_override || "";
        const subjects = sectionConfig?.subjects || ["استيعاب المقروء","إكمال الجمل","التناظر اللفظي","الخطأ السياقي","الارتباط والاختلاف"];
        
        systemPrompt += customPrompt || `أنت خبير في تصميم القسم اللفظي من اختبار القدرات العامة (GAT) السعودي.

📝 **القسم اللفظي - لغة عربية فقط:**
${isInitialAssessment ? `الاختبار يتكون من 13 سؤال لفظي:` : `الاختبار يتكون من ${targetQuestions} أسئلة لفظي:`}

**أنواع الأسئلة المطلوبة (لغة عربية فقط):**
${subjects.map((s: string, i: number) => `${i+1}. ${s}`).join('\n')}

⚠️ **مهم جداً:**
- جميع الأسئلة يجب أن تكون لغوية فقط
- لا أسئلة كمية أو رياضية نهائياً
- كل سؤال يختبر مهارات لغوية بالعربية

**معايير الجودة:**
- أسئلة لغوية واضحة
- لغة عربية فصحى صحيحة
- مستوى: ${isPracticeMode ? "easy" : difficulty}
${isPracticeMode ? "- تفسير لغوي مفصل لكل إجابة" : ""}`;
      } else {
        // Mixed sections
        systemPrompt = `أنت خبير في تصميم اختبار القدرات العامة (GAT) السعودي.

📋 **هيكل الاختبار:**
${isInitialAssessment ? `الاختبار يتكون من 25 سؤالاً (13 لفظي + 12 كمي):` : `الاختبار يتكون من 10 أسئلة (5 لفظي + 5 كمي):`}

📝 **القسم اللفظي**:
1. استيعاب المقروء: نص قصير + سؤال فهم
2. إكمال الجمل: جملة ناقصة + اختيار الكلمة المناسبة
3. التناظر اللفظي: علاقة بين كلمتين (ترادف، تضاد، جزء-كل، سبب-نتيجة)
4. الخطأ السياقي: جملة بها كلمة غير مناسبة للسياق
5. الارتباط والاختلاف: تحديد الكلمة المختلفة في المجموعة

🔢 **القسم الكمي**:
1. الحساب: عمليات حسابية، نسب مئوية، تناسب، متوسطات
2. الجبر: معادلات، متراجحات، أنماط، متتابعات
3. الهندسة: زوايا، مثلثات، مساحات، محيطات، حجوم
4. الإحصاء والاحتمالات: تحليل بيانات، رسوم بيانية، جداول
5. مسائل منطقية: استنتاج وحل مسائل تطبيقية

**معايير الجودة:**
- أسئلة واضحة ومباشرة بدون غموض
- خيارات معقولة ومتجانسة في الطول
- مستوى: ${isPracticeMode ? "easy" : difficulty}
- لغة عربية فصحى صحيحة
${isPracticeMode ? "- تفسير تعليمي مفصل لكل إجابة (للتدريب)" : ""}`;
      }
    } else if (testType === "تحصيلي" && track === "علمي") {
      systemPrompt = `أنت خبير في تصميم الاختبار التحصيلي العلمي (SAAT).

📚 **هيكل الاختبار:**
الاختبار يتكون من ${numQuestions} أسئلة موزعة على المواد العلمية:

1. **الرياضيات** (3 أسئلة): جبر، هندسة، تفاضل وتكامل، حساب مثلثات
2. **الفيزياء** (3 أسئلة): ميكانيكا، كهرباء، مغناطيسية، بصريات
3. **الكيمياء** (2 أسئلة): كيمياء عامة، عضوية، تفاعلات، معادلات
4. **الأحياء** (2 أسئلة): الخلية، الوراثة، التصنيف، البيئة

**معايير الجودة:**
- أسئلة تقيس الفهم والتطبيق والتحليل
- خيارات دقيقة علمياً
- مستوى: ${difficulty}
- توزيع: 20% أول ثانوي، 30% ثاني ثانوي، 50% ثالث ثانوي`;
    } else if (testType === "تحصيلي" && track === "نظري") {
      systemPrompt = `أنت خبير في تصميم الاختبار التحصيلي النظري (الأدبي).

📖 **هيكل الاختبار:**
الاختبار يتكون من ${numQuestions} أسئلة موزعة على المواد النظرية:

1. **العلوم الشرعية** (4 أسئلة): توحيد، فقه، حديث وثقافة إسلامية
2. **اللغة العربية** (4 أسئلة): نحو وصرف، بلاغة ونقد، أدب
3. **العلوم الاجتماعية** (2 أسئلة): تاريخ، جغرافيا

**معايير الجودة:**
- أسئلة تقيس الفهم والتحليل
- دقة في المعلومات الشرعية والتاريخية
- مستوى: ${difficulty}
- توزيع: 20% أول ثانوي، 30% ثاني ثانوي، 50% ثالث ثانوي`;
    }
    
    const userPrompt = isPracticeMode
      ? `قم بتوليد ${testType === "قدرات" ? `اختبار قدرات ${isInitialAssessment ? "تقييم أولي" : "تدريبي"} (${verbalQuestions} لفظي + ${quantQuestions} كمي)` : `اختبار تحصيلي ${track} ${isInitialAssessment ? "تقييم أولي" : "تدريبي"} (${numQuestions} أسئلة)`} بناءً على المنهج الكامل:

📚 **نوع الاختبار:** ${testType} ${testType === "تحصيلي" ? `- ${track}` : ""}
📊 **مستوى الصعوبة:** ${difficulty}

${additionalKnowledge}

⚠️ **متطلبات مهمة:**
${isInitialAssessment ? `
- 📊 **توزيع الصعوبة للتقييم الأولي:**
  ${testType === "قدرات" ? `
  * الأسئلة اللفظية (${verbalQuestions}): 7 سهلة، 4 متوسطة، 2 صعبة
  * الأسئلة الكمية (${quantQuestions}): 5 سهلة، 4 متوسطة، 3 صعبة
  ` : `
  * ${Math.floor(numQuestions * 0.48)} سؤال سهل
  * ${Math.floor(numQuestions * 0.32)} سؤال متوسط
  * ${Math.ceil(numQuestions * 0.20)} سؤال صعب
  `}
- أسئلة متنوعة لتقييم جميع المهارات الأساسية` : `
- أسئلة متنوعة تغطي جميع جوانب المنهج`}
- كل سؤال يختبر فهماً حقيقياً وليس حفظاً
- الخيارات الخاطئة معقولة ومقنعة
- ${testType === "قدرات" ? "تنوع بين الأسئلة اللفظية والكمية" : "تغطية شاملة للمواد الدراسية"}
- كل تفسير تعليمي واضح ومفيد
${testType === "تحصيلي" && !isInitialAssessment ? `- التوزيع المطلوب: 2 أسئلة أول ثانوي، 3 أسئلة ثاني ثانوي، 5 أسئلة ثالث ثانوي` : ""}
${isInitialAssessment ? "- التنوع في مستويات الصعوبة لتحديد المستوى بدقة" : ""}`
      : `قم بتوليد ${
        testType === "قدرات" 
          ? sectionFilter 
            ? `${numQuestions} سؤال من قسم ${sectionFilter} فقط في اختبار قدرات${sectionFilter === "كمي" ? " (رياضيات بحتة - أرقام ومعادلات فقط)" : " (لغة عربية بحتة - نصوص وكلمات فقط)"}` 
            : "اختبار قدرات (5 لفظي + 5 كمي)"
          : `اختبار تحصيلي ${track} (${numQuestions} أسئلة)`
      } بناءً على المحتوى التالي:

📚 **المحتوى:**
العنوان: ${content.title}
الوصف: ${content.description || ""}
المواضيع: ${JSON.stringify(content.topics || [])}
أهداف التعلم: ${content.learning_objectives?.join(", ") || ""}

📝 **النص الكامل:**
${content.content_text || ""}
${additionalKnowledge}

⚠️ **متطلبات مهمة جداً:**
${sectionFilter ? `
- 🔴 **حرج جداً:** يجب توليد ${numQuestions} سؤال ${sectionFilter} فقط
- ❌ **ممنوع تماماً:** لا تضع حتى سؤال واحد من القسم ${sectionFilter === "كمي" ? "اللفظي (لغة عربية)" : "الكمي (رياضيات)"}
- ✅ ${sectionFilter === "كمي" ? "كل سؤال يجب أن يحتوي على أرقام أو معادلات رياضية (مثال: إذا كان 5 + x = 12، فما قيمة x؟)" : "كل سؤال يجب أن يكون عن اللغة العربية (مثال: ما معنى كلمة 'الفصاحة'؟)"}
- ✅ ${sectionFilter === "كمي" ? "فقط رياضيات: جبر، هندسة، حساب، إحصاء" : "فقط لغة: استيعاب نصوص، تناظر لفظي، إكمال جمل، خطأ سياقي"}
` : `- ${testType === "قدرات" ? "تنوع بين الأسئلة اللفظية والكمية (5 لفظي + 5 كمي بالضبط)" : "تغطية شاملة للمواد الدراسية"}`}
- كل سؤال يختبر فهماً حقيقياً وليس حفظاً
- الخيارات الخاطئة معقولة ومقنعة
- كل تفسير تعليمي واضح ومفيد
${testType === "تحصيلي" ? `- التوزيع المطلوب: 2 أسئلة أول ثانوي، 3 أسئلة ثاني ثانوي، 5 أسئلة ثالث ثانوي` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: quizModel,
        temperature: quizTemp,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
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
                        question_text: { 
                          type: "string",
                          description: "نص السؤال الكامل"
                        },
                        options: { 
                          type: "array", 
                          items: { type: "string" },
                          description: "4 خيارات للإجابة"
                        },
                        correct_answer: { 
                          type: "string",
                          description: "الإجابة الصحيحة (يجب أن تكون من ضمن الخيارات)"
                        },
                        explanation: { 
                          type: "string",
                          description: "تفسير واضح للإجابة"
                        },
                        section: { 
                          type: "string",
                          description: "القسم: 'لفظي' أو 'كمي'",
                          enum: ["لفظي", "كمي"]
                        },
                        subject: { 
                          type: "string",
                          description: "المادة أو الموضوع"
                        },
                        question_type: { 
                          type: "string",
                          description: "نوع السؤال (مثل: استيعاب المقروء، الجبر، إلخ)"
                        },
                        difficulty: { 
                          type: "string",
                          description: "مستوى الصعوبة",
                          enum: ["easy", "medium", "hard"]
                        },
                        topic: {
                          type: "string",
                          description: "الموضوع المحدد من قاعدة المعرفة"
                        }
                      },
                      required: ["question_text", "options", "correct_answer", "explanation", "section", "question_type", "topic"]
                    }
                  }
                },
                required: ["questions"]
              }
            }
          }
        ],
        tool_choice: { 
          type: "function", 
          function: { name: "generate_quiz" } 
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً.",
            details: errorText 
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "يرجى إضافة رصيد للمتابعة.",
            details: errorText 
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Parse error text for provider details
      let providerError = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.metadata?.raw) {
          providerError = errorJson.error.metadata.raw;
        }
      } catch {}

      return new Response(
        JSON.stringify({ 
          error: `فشل توليد الأسئلة. خطأ من المزود.`,
          details: `Status: ${response.status}. ${providerError}`
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("Failed to generate quiz");
    }

    const quizData = JSON.parse(toolCall.function.arguments);
    
    // Always expect questions array
    let allQuestions: any[] = [];
    
    if (Array.isArray(quizData.questions)) {
      allQuestions = quizData.questions.map((q: any) => {
        // Normalize section for قدرات if missing
        if (testType === "قدرات" && !q.section) {
          const qType = q.question_type?.toLowerCase() || "";
          if (qType.includes("لفظ") || qType.includes("مقروء") || qType.includes("جمل") || qType.includes("تناظر") || qType.includes("خطأ") || qType.includes("ارتباط")) {
            q.section = "لفظي";
          } else {
            q.section = "كمي";
          }
        }
        return q;
      });
    } else {
      // Fallback for unexpected structure
      allQuestions = [];
    }

    console.log(`Generated ${allQuestions.length} raw questions`);
    
    // Phase 2: Calculate hash for each question and filter duplicates
    const crypto = await import("https://deno.land/std@0.177.0/crypto/mod.ts");
    
    const questionsWithHash = await Promise.all(
      allQuestions.map(async (q: any) => {
        const questionText = q.question_text || "";
        const encoder = new TextEncoder();
        const data = encoder.encode(questionText);
        const hashBuffer = await crypto.crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        return {
          ...q,
          question_hash: hashHex
        };
      })
    );
    
    // Filter out duplicate questions  
    const uniqueQuestions = questionsWithHash.filter(q => !usedHashes.has(q.question_hash));
    console.log(`Filtered to ${uniqueQuestions.length} unique questions (removed ${questionsWithHash.length - uniqueQuestions.length} duplicates)`);
    
    // Plan #3: Improved section detection with dynamic assignment
    const mathKeywords = ['نسبة', 'معادلة', 'مجموع', 'مساحة', 'محيط', 'حجم', 'طول', 'عرض', 'ارتفاع', 'قطر', 'نصف قطر', 'زاوية', 'درجة', 'جذر', 'أس', 'كسر', 'ضرب', 'قسمة', 'جمع', 'طرح'];
    
    let sectionFilteredQuestions = uniqueQuestions.map((q: any) => {
      // Auto-assign section if missing
      if (!q.section && testType === "قدرات") {
        const text = q.question_text?.toLowerCase() || "";
        const hasNumbers = /\d/.test(text);
        const hasMathWords = mathKeywords.some(kw => text.includes(kw));
        
        if (hasNumbers || hasMathWords) {
          q.section = "كمي";
        } else {
          q.section = "لفظي";
        }
      }
      return q;
    });
    
    // Apply section filter
    if (sectionFilter === "كمي") {
      sectionFilteredQuestions = sectionFilteredQuestions.filter((q: any) => {
        const section = q.section?.toLowerCase() || "";
        const type = q.question_type?.toLowerCase() || "";
        const text = q.question_text?.toLowerCase() || "";
        
        // Check if it's truly a quantitative question
        const isQuant = section.includes("كمي") || 
                       section.includes("كم") ||
                       type.includes("حساب") || 
                       type.includes("جبر") || 
                       type.includes("هندسة") ||
                       type.includes("إحصاء") ||
                       type.includes("رياضي") ||
                       /\d/.test(text) ||
                       mathKeywords.some(kw => text.includes(kw));
        
        if (!isQuant) {
          console.warn(`Rejected non-quantitative question: ${q.question_text.substring(0, 50)}...`);
        }
        return isQuant;
      });
      console.log(`Section filter (كمي): ${sectionFilteredQuestions.length}/${uniqueQuestions.length} questions passed`);
    } else if (sectionFilter === "لفظي") {
      sectionFilteredQuestions = sectionFilteredQuestions.filter((q: any) => {
        const section = q.section?.toLowerCase() || "";
        const type = q.question_type?.toLowerCase() || "";
        const text = q.question_text?.toLowerCase() || "";
        
        // Plan #3: Improved verbal detection - no numbers and no math words
        const hasNumbers = /\d/.test(text);
        const hasMathWords = mathKeywords.some(kw => text.includes(kw));
        
        const isVerbal = (section.includes("لفظ") || 
                         section.includes("لفظي") ||
                         type.includes("استيعاب") || 
                         type.includes("إكمال") || 
                         type.includes("تناظر") ||
                         type.includes("خطأ") ||
                         type.includes("ارتباط")) && 
                         !hasNumbers && 
                         !hasMathWords;
        
        if (!isVerbal) {
          console.warn(`Rejected non-verbal question: ${q.question_text.substring(0, 50)}...`);
        }
        return isVerbal;
      });
      console.log(`Section filter (لفظي): ${sectionFilteredQuestions.length}/${uniqueQuestions.length} questions passed`);
    }
    
    // Validate questions quality
    let validatedQuestions = sectionFilteredQuestions.filter((q: any) => {
      // التحقق من أن كل سؤال لديه 4 خيارات مختلفة
      const uniqueOptions = new Set(q.options);
      if (uniqueOptions.size !== 4) {
        console.warn("Question rejected: does not have 4 unique options");
        return false;
      }
      
      // التحقق من أن الإجابة الصحيحة موجودة في الخيارات
      if (!q.options.includes(q.correct_answer)) {
        console.warn("Question rejected: correct answer not in options");
        return false;
      }
      
      // التحقق من أن السؤال والتفسير ليسوا فارغين
      if (!q.question_text || !q.explanation || q.question_text.trim() === "" || q.explanation.trim() === "") {
        console.warn("Question rejected: empty question or explanation");
        return false;
      }
      
      return true;
    });
    
    // Phase 3: Filter questions by knowledge base topics if available
    if (availableTopics.length > 0 && isPracticeMode) {
      const topicFilteredQuestions = validatedQuestions.filter((q: any) => {
        const topic = q.topic?.toLowerCase() || q.subject?.toLowerCase() || "";
        const questionText = q.question_text?.toLowerCase() || "";
        
        const matchesTopic = availableTopics.some(t => 
          topic.includes(t.toLowerCase()) || 
          t.toLowerCase().includes(topic) ||
          questionText.includes(t.toLowerCase()) ||
          allRelatedTopics.some(rt => 
            topic.includes(rt.toLowerCase()) || 
            questionText.includes(rt.toLowerCase())
          )
        );
        
        if (!matchesTopic) {
          console.warn(`Question rejected - not in KB topics: ${q.question_text.substring(0, 50)}...`);
        }
        
        return matchesTopic;
      });
      
      console.log(`Topic filter: ${topicFilteredQuestions.length}/${validatedQuestions.length} questions match KB topics`);
      validatedQuestions = topicFilteredQuestions;
    }

    console.log(`Validated ${validatedQuestions.length} out of ${allQuestions.length} questions (expected: ${targetQuestions}, min: ${targetQuestions})`);
    
    // Plan #4: Guarantee exact number of questions
    let finalQuestions = validatedQuestions.slice(0, targetQuestions);
    let missing = targetQuestions - finalQuestions.length;
    let attempts = 0;
    const MAX_ATTEMPTS = 3;
    
    while (missing > 0 && attempts < MAX_ATTEMPTS) {
      attempts++;
      console.log(`Attempt ${attempts}: Need ${missing} more questions to reach ${targetQuestions}`);
      
      // Step A: Try to fill from questions_bank with progressive relaxation
      if (missing > 0) {
        console.log(`Step A: Attempting to fill ${missing} questions from questions_bank...`);
        
        // Try 1: Exact match (section + difficulty)
        let bankQuery = supabase
          .from("questions_bank")
          .select("*");
        
        if (sectionFilter) {
          bankQuery = bankQuery.eq("subject", sectionFilter);
        }
        bankQuery = bankQuery.eq("difficulty", actualDifficulty);
        
        const { data: exactMatch } = await bankQuery.limit(missing * 2);
        
        let bankQuestions = exactMatch || [];
        
        // Try 2: If not enough, relax difficulty constraint
        if (bankQuestions.length < missing) {
          console.log(`Only ${bankQuestions.length} exact matches, relaxing difficulty...`);
          bankQuery = supabase
            .from("questions_bank")
            .select("*");
          
          if (sectionFilter) {
            bankQuery = bankQuery.eq("subject", sectionFilter);
          }
          
          const { data: relaxedMatch } = await bankQuery.limit(missing * 3);
          bankQuestions = relaxedMatch || [];
        }
        
        // Try 3: If still not enough, broaden to general قدرات
        if (bankQuestions.length < missing && testType === "قدرات") {
          console.log(`Still only ${bankQuestions.length}, broadening to general قدرات...`);
          bankQuery = supabase
            .from("questions_bank")
            .select("*")
            .eq("subject", "قدرات");
          
          const { data: broadMatch } = await bankQuery.limit(missing * 3);
          bankQuestions = broadMatch || [];
        }
        
        if (bankQuestions && bankQuestions.length > 0) {
          const usedTexts = new Set(finalQuestions.map(q => q.question_text?.trim().toLowerCase()));
          
          const bankQuestionsFormatted = bankQuestions
            .filter(q => {
              const text = q.question_text?.trim().toLowerCase();
              if (usedTexts.has(text)) return false;
              
              // Check topic matches if knowledge base filtering is active
              if (availableTopics.length > 0 && isPracticeMode) {
                const topic = q.topic?.toLowerCase() || "";
                const matchesTopic = availableTopics.some(t => 
                  topic.includes(t.toLowerCase()) || 
                  allRelatedTopics.some(rt => topic.includes(rt.toLowerCase()))
                );
                return matchesTopic;
              }
              
              return true;
            })
            .slice(0, missing)
            .map(q => ({
              question_text: q.question_text,
              options: q.options || [],
              correct_answer: q.correct_answer,
              explanation: q.explanation || "لا يوجد تفسير متاح",
              section: sectionFilter || q.subject || (testType === "قدرات" ? "عام" : track),
              subject: q.subject || "",
              question_type: q.question_type || "multiple_choice",
              difficulty: q.difficulty || actualDifficulty,
              topic: q.topic || "",
              question_hash: "" // Will be calculated if needed
            }));
          
          if (bankQuestionsFormatted.length > 0) {
            finalQuestions.push(...bankQuestionsFormatted);
            missing = targetQuestions - finalQuestions.length;
            console.log(`Added ${bankQuestionsFormatted.length} from questions_bank. Still need: ${missing}`);
          }
        }
      }
      
      // Step B: If still missing, use AI top-up call
      if (missing > 0 && attempts <= 2) {
        console.log(`Step B: Requesting ${missing} top-up questions from AI (attempt ${attempts})...`);
        
        const topupPrompt = `قم بتوليد ${missing} سؤال ${sectionFilter || ''} بالضبط لإكمال الاختبار.

⚠️ **مهم جداً:**
- يجب توليد ${missing} سؤال فقط
${sectionFilter ? `- جميع الأسئلة يجب أن تكون ${sectionFilter} حصرياً` : ''}
${sectionFilter === "لفظي" ? `- لا أرقام نهائياً، لغة عربية فقط` : ''}
${sectionFilter === "كمي" ? `- رياضيات فقط، كل سؤال يحتوي أرقام` : ''}
${availableTopics.length > 0 ? `- المواضيع المتاحة فقط: ${availableTopics.join('، ')}` : ''}

المواضيع: ${availableTopics.slice(0, 5).join('، ')}`;

        try {
          const topupResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              temperature: 0.8,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: topupPrompt }
              ],
              tools: [
                {
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
                            required: ["question_text", "options", "correct_answer", "explanation", "section", "question_type", "topic"]
                          }
                        }
                      },
                      required: ["questions"]
                    }
                  }
                }
              ],
              tool_choice: { 
                type: "function", 
                function: { name: "generate_quiz" } 
              }
            }),
          });
          
          if (topupResponse.ok) {
            const topupResult = await topupResponse.json();
            const topupToolCall = topupResult.choices?.[0]?.message?.tool_calls?.[0];
            
            if (topupToolCall) {
              const topupData = JSON.parse(topupToolCall.function.arguments);
              let topupQuestions = topupData.questions || [];
              
              // Validate and filter
              const usedTexts = new Set(finalQuestions.map(q => q.question_text?.trim().toLowerCase()));
              
              topupQuestions = topupQuestions
                .filter((q: any) => {
                  const text = q.question_text?.trim().toLowerCase();
                  if (usedTexts.has(text)) return false;
                  if (!q.question_text || !q.explanation) return false;
                  if (!q.options || q.options.length !== 4) return false;
                  if (!q.options.includes(q.correct_answer)) return false;
                  
                  // Section validation
                  if (sectionFilter === "لفظي") {
                    const hasNumbers = /\d/.test(q.question_text);
                    if (hasNumbers) return false;
                  } else if (sectionFilter === "كمي") {
                    const hasNumbers = /\d/.test(q.question_text);
                    if (!hasNumbers) return false;
                  }
                  
                  return true;
                })
                .slice(0, missing);
              
              if (topupQuestions.length > 0) {
                finalQuestions.push(...topupQuestions);
                missing = targetQuestions - finalQuestions.length;
                console.log(`AI top-up added ${topupQuestions.length} questions. Still need: ${missing}`);
              }
            }
          }
        } catch (topupError) {
          console.error("Top-up call failed:", topupError);
        }
      }
      
      // Exit if we have enough
      if (missing <= 0) break;
    }
    
    // Final check and trim to exact count
    finalQuestions = finalQuestions.slice(0, targetQuestions);
    
    if (finalQuestions.length < targetQuestions) {
      console.error(`Failed to generate ${targetQuestions} questions after ${attempts} attempts. Got: ${finalQuestions.length}`);
      throw new Error(`عدد الأسئلة الصالحة غير كافٍ (${finalQuestions.length}/${targetQuestions}). الرجاء المحاولة مرة أخرى.`);
    }
    
    console.log(`✅ Successfully generated exactly ${finalQuestions.length}/${targetQuestions} questions`);
    
    // Save to generated_questions_log with proper day_number
    const questionsToLog = finalQuestions.map((q: any) => ({
      user_id: user.id,
      question_hash: q.question_hash,
      question_data: q,
      day_number: dayNumber || 0,
    }));
    
    const { error: logError } = await supabase
      .from("generated_questions_log")
      .insert(questionsToLog);
    
    if (logError) {
      console.warn("Failed to log questions:", logError);
    } else {
      console.log(`✅ Logged ${questionsToLog.length} questions to database`);
    }

    // Return successful response
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