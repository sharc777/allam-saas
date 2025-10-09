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

    // Fetch knowledge base content
    let additionalKnowledge = "";
    
    if (isPracticeMode) {
      // In practice mode, fetch ALL relevant knowledge base content
      const { data: knowledgeData } = await supabase
        .from("knowledge_base")
        .select("*")
        .eq("test_type", testType)
        .eq("track", track)
        .eq("is_active", true)
        .limit(20); // More content for practice mode
      
      if (knowledgeData && knowledgeData.length > 0) {
        additionalKnowledge = "\n\n📚 **المحتوى المعرفي للاختبار:**\n" + 
          knowledgeData.map(kb => `- ${kb.title}: ${kb.content || ""}`).join("\n");
      }
    } else if (content.topics) {
      // For lesson-specific quizzes, fetch related knowledge
      const topicsData = content.topics as any;
      const sections = topicsData?.sections || [];
      const allTopics = sections.flatMap((section: any) => section.subtopics || []);
      
      if (allTopics.length > 0) {
        const { data: knowledgeData } = await supabase
          .from("knowledge_base")
          .select("*")
          .eq("test_type", testType)
          .eq("track", track)
          .eq("is_active", true)
          .limit(5);
        
        if (knowledgeData && knowledgeData.length > 0) {
          additionalKnowledge = "\n\n📚 **محتوى معرفي إضافي:**\n" + 
            knowledgeData.map(kb => `- ${kb.title}: ${kb.content || ""}`).join("\n");
        }
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating quiz - Day:", dayNumber, "Difficulty:", difficulty, "Test Type:", testType, "Track:", track);

    // Calculate question counts
    const actualDifficulty = isPracticeMode && !difficulty ? 'easy' : difficulty;
    const numQuestions = questionCount || (isInitialAssessment ? 25 : 10);
    const verbalQuestions = isInitialAssessment ? 13 : (questionCount ? Math.ceil(questionCount / 2) : 5);
    const quantQuestions = isInitialAssessment ? 12 : (questionCount ? Math.floor(questionCount / 2) : 5);
    
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

    // تحديد نوع الاختبار والمحتوى المطلوب
    let systemPrompt = "";

    if (testType === "قدرات") {
      // Phase 1: Section-specific prompts
      if (sectionFilter === "كمي") {
        systemPrompt = `أنت خبير في تصميم القسم الكمي من اختبار القدرات العامة (GAT) السعودي.

🔢 **القسم الكمي - رياضيات فقط:**
${isInitialAssessment ? `الاختبار يتكون من 12 سؤال كمي:` : `الاختبار يتكون من 10 أسئلة كمي:`}

**أنواع الأسئلة المطلوبة (رياضيات فقط):**
1. الحساب: عمليات حسابية، نسب مئوية، تناسب، متوسطات
2. الجبر: معادلات، متراجحات، أنماط، متتابعات
3. الهندسة: زوايا، مثلثات، مساحات، محيطات، حجوم
4. الإحصاء والاحتمالات: تحليل بيانات، رسوم بيانية، جداول
5. مسائل منطقية: استنتاج وحل مسائل تطبيقية

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
        systemPrompt = `أنت خبير في تصميم القسم اللفظي من اختبار القدرات العامة (GAT) السعودي.

📝 **القسم اللفظي - لغة عربية فقط:**
${isInitialAssessment ? `الاختبار يتكون من 13 سؤال لفظي:` : `الاختبار يتكون من 10 أسئلة لفظي:`}

**أنواع الأسئلة المطلوبة (لغة عربية فقط):**
1. استيعاب المقروء: نص قصير بالعربية + سؤال فهم
2. إكمال الجمل: جملة عربية ناقصة + اختيار الكلمة المناسبة
3. التناظر اللفظي: علاقة بين كلمتين عربيتين (ترادف، تضاد، جزء-كل، سبب-نتيجة)
4. الخطأ السياقي: جملة عربية بها كلمة غير مناسبة للسياق
5. الارتباط والاختلاف: تحديد الكلمة العربية المختلفة في المجموعة

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
            ? `اختبار قدرات - قسم ${sectionFilter} (10 أسئلة ${sectionFilter} فقط - لا تضع أي أسئلة من القسم الآخر)` 
            : "اختبار قدرات (5 لفظي + 5 كمي)"
          : `اختبار تحصيلي ${track} (10 أسئلة)`
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
- ⚠️ **مهم جداً:** يجب توليد 10 أسئلة ${sectionFilter} فقط
- ❌ **ممنوع منعاً باتاً:** إضافة أي أسئلة من القسم ${sectionFilter === "كمي" ? "اللفظي" : "الكمي"}
- ✅ ${sectionFilter === "كمي" ? "فقط أسئلة رياضية (جبر، هندسة، حساب، إحصاء)" : "فقط أسئلة لغة عربية (استيعاب، تناظر، إكمال جمل، خطأ سياقي)"}
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
        model: "google/gemini-2.5-flash",
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
                        question_text: { type: "string" },
                        options: { type: "array", items: { type: "string" } },
                        correct_answer: { type: "string" },
                        explanation: { type: "string" },
                        section: { type: "string" },
                        subject: { type: "string" },
                        question_type: { type: "string" },
                        difficulty: { type: "string" }
                      },
                      required: ["question_text", "options", "correct_answer", "explanation"]
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
    const uniqueQuestions = questionsWithHash.filter(q => !previousHashes.has(q.question_hash));
    console.log(`Filtered to ${uniqueQuestions.length} unique questions (removed ${questionsWithHash.length - uniqueQuestions.length} duplicates)`);
    
    // Phase 1: Validate section if sectionFilter is specified
    let sectionFilteredQuestions = uniqueQuestions;
    if (sectionFilter === "كمي") {
      sectionFilteredQuestions = uniqueQuestions.filter((q: any) => {
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
                       /\d/.test(text); // Contains numbers
        
        if (!isQuant) {
          console.warn(`Rejected non-quantitative question: ${q.question_text.substring(0, 50)}...`);
        }
        return isQuant;
      });
      console.log(`Section filter (كمي): ${sectionFilteredQuestions.length}/${uniqueQuestions.length} questions passed`);
    } else if (sectionFilter === "لفظي") {
      sectionFilteredQuestions = uniqueQuestions.filter((q: any) => {
        const section = q.section?.toLowerCase() || "";
        const type = q.question_type?.toLowerCase() || "";
        
        // Check if it's truly a verbal question
        const isVerbal = section.includes("لفظ") || 
                        section.includes("لفظي") ||
                        type.includes("استيعاب") || 
                        type.includes("إكمال") || 
                        type.includes("تناظر") ||
                        type.includes("خطأ") ||
                        type.includes("ارتباط");
        
        if (!isVerbal) {
          console.warn(`Rejected non-verbal question: ${q.question_text.substring(0, 50)}...`);
        }
        return isVerbal;
      });
      console.log(`Section filter (لفظي): ${sectionFilteredQuestions.length}/${uniqueQuestions.length} questions passed`);
    }
    
    // Validate questions quality
    const validatedQuestions = sectionFilteredQuestions.filter((q: any) => {
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

    const minQuestions = isInitialAssessment ? 20 : 8;
    const expectedQuestions = isInitialAssessment ? 25 : 10;
    
    console.log(`Validated ${validatedQuestions.length} out of ${allQuestions.length} questions (expected: ${expectedQuestions}, min: ${minQuestions})`);
    
    // Handle insufficient questions
    if (validatedQuestions.length < minQuestions) {
      if (validatedQuestions.length >= 10) {
        // Partial success: return with warning
        console.warn(`Returning ${validatedQuestions.length} questions (below target but acceptable)`);
        return new Response(
          JSON.stringify({
            questions: validatedQuestions.slice(0, validatedQuestions.length),
            warning: `تم توليد ${validatedQuestions.length} سؤالاً من أصل ${expectedQuestions} المطلوبة`,
            dayNumber,
            contentTitle: content.title,
            testType,
            track
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Too few questions - try fallback with simpler model
      console.log("Attempting fallback generation with simpler model...");
      const fallbackResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt + "\n\n**IMPORTANT: Return EXACTLY " + expectedQuestions + " questions in valid JSON array format.**" }
          ]
        }),
      });
      
      if (fallbackResponse.ok) {
        const fallbackResult = await fallbackResponse.json();
        const fallbackContent = fallbackResult.choices?.[0]?.message?.content;
        if (fallbackContent) {
          try {
            const fallbackQuestions = JSON.parse(fallbackContent);
            if (Array.isArray(fallbackQuestions) && fallbackQuestions.length >= 10) {
              console.log(`Fallback generated ${fallbackQuestions.length} questions`);
              return new Response(
                JSON.stringify({
                  questions: fallbackQuestions.slice(0, Math.min(fallbackQuestions.length, expectedQuestions)),
                  dayNumber,
                  contentTitle: content.title,
                  testType,
                  track
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          } catch {}
        }
      }
      
      throw new Error(`عدد الأسئلة الصالحة غير كافٍ (${validatedQuestions.length}/${expectedQuestions}). الرجاء المحاولة مرة أخرى.`);
    }

    // Phase 2: Save generated questions to log
    const finalQuestions = validatedQuestions.slice(0, expectedQuestions);
    
    // Save to generated_questions_log
    const questionsToLog = finalQuestions.map((q: any) => ({
      user_id: user.id,
      question_hash: q.question_hash,
      question_data: q,
      day_number: dayNumber || null,
    }));
    
    const { error: logError } = await supabase
      .from("generated_questions_log")
      .insert(questionsToLog);
    
    if (logError) {
      console.warn("Failed to log questions:", logError);
    } else {
      console.log(`Logged ${questionsToLog.length} questions to database`);
    }

    // Success: return requested number of questions
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