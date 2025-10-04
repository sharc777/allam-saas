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
    const { dayNumber, difficulty = "medium", testType = "قدرات", track = "عام", contentId, mode } = await req.json();
    
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

    // Get daily content (by contentId or dayNumber) or use practice mode
    let content: any;
    let contentError: any;
    let isPracticeMode = false;
    
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
      isPracticeMode = true;
      content = {
        title: "اختبار تدريبي شامل",
        description: "اختبار تدريبي يغطي جميع المواضيع",
        content_text: "",
        topics: null
      };
    } else {
      throw new Error("يجب تحديد contentId أو dayNumber أو mode: practice");
    }

    if (!isPracticeMode && (contentError || !content)) {
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

    // تحديد نوع الاختبار والمحتوى المطلوب
    let systemPrompt = "";
    let questionStructure = {};

    if (testType === "قدرات") {
      systemPrompt = `أنت خبير في تصميم اختبار القدرات العامة (GAT) السعودي.

📋 **هيكل الاختبار:**
الاختبار يتكون من قسمين رئيسيين (10 أسئلة):

📝 **القسم اللفظي** (5 أسئلة):
1. استيعاب المقروء: نص قصير + سؤال فهم
2. إكمال الجمل: جملة ناقصة + اختيار الكلمة المناسبة
3. التناظر اللفظي: علاقة بين كلمتين (ترادف، تضاد، جزء-كل، سبب-نتيجة)
4. الخطأ السياقي: جملة بها كلمة غير مناسبة للسياق
5. الارتباط والاختلاف: تحديد الكلمة المختلفة في المجموعة

🔢 **القسم الكمي** (5 أسئلة):
1. الحساب: عمليات حسابية، نسب مئوية، تناسب، متوسطات
2. الجبر: معادلات، متراجحات، أنماط، متتابعات
3. الهندسة: زوايا، مثلثات، مساحات، محيطات، حجوم
4. الإحصاء والاحتمالات: تحليل بيانات، رسوم بيانية، جداول
5. مسائل منطقية: استنتاج وحل مسائل تطبيقية

**معايير الجودة:**
- أسئلة واضحة ومباشرة بدون غموض
- خيارات معقولة ومتجانسة في الطول
- مستوى: ${difficulty}
- لغة عربية فصحى صحيحة`;

      questionStructure = {
        verbal_questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question_type: { 
                type: "string", 
                enum: ["استيعاب_المقروء", "إكمال_الجمل", "التناظر_اللفظي", "الخطأ_السياقي", "الارتباط_والاختلاف"]
              },
              question_text: { type: "string" },
              passage: { type: "string", description: "النص المرجعي (للاستيعاب المقروء فقط)" },
              options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
              correct_answer: { type: "string" },
              explanation: { type: "string" }
            },
            required: ["question_type", "question_text", "options", "correct_answer", "explanation"]
          },
          minItems: 5,
          maxItems: 5
        },
        quantitative_questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question_type: { 
                type: "string", 
                enum: ["حساب", "جبر", "هندسة", "إحصاء", "منطق"]
              },
              question_text: { type: "string" },
              options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
              correct_answer: { type: "string" },
              explanation: { type: "string" }
            },
            required: ["question_type", "question_text", "options", "correct_answer", "explanation"]
          },
          minItems: 5,
          maxItems: 5
        }
      };
    } else if (testType === "تحصيلي" && track === "علمي") {
      systemPrompt = `أنت خبير في تصميم الاختبار التحصيلي العلمي (SAAT).

📚 **هيكل الاختبار:**
الاختبار يتكون من 10 أسئلة موزعة على المواد العلمية:

1. **الرياضيات** (3 أسئلة): جبر، هندسة، تفاضل وتكامل، حساب مثلثات
2. **الفيزياء** (3 أسئلة): ميكانيكا، كهرباء، مغناطيسية، بصريات
3. **الكيمياء** (2 أسئلة): كيمياء عامة، عضوية، تفاعلات، معادلات
4. **الأحياء** (2 أسئلة): الخلية، الوراثة، التصنيف، البيئة

**معايير الجودة:**
- أسئلة تقيس الفهم والتطبيق والتحليل
- خيارات دقيقة علمياً
- مستوى: ${difficulty}
- توزيع: 20% أول ثانوي، 30% ثاني ثانوي، 50% ثالث ثانوي`;

      questionStructure = {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              subject: { type: "string", enum: ["رياضيات", "فيزياء", "كيمياء", "أحياء"] },
              question_text: { type: "string" },
              options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
              correct_answer: { type: "string" },
              explanation: { type: "string" },
              grade_level: { type: "string", enum: ["أول_ثانوي", "ثاني_ثانوي", "ثالث_ثانوي"] }
            },
            required: ["subject", "question_text", "options", "correct_answer", "explanation", "grade_level"]
          },
          minItems: 10,
          maxItems: 10
        }
      };
    } else if (testType === "تحصيلي" && track === "نظري") {
      systemPrompt = `أنت خبير في تصميم الاختبار التحصيلي النظري (الأدبي).

📖 **هيكل الاختبار:**
الاختبار يتكون من 10 أسئلة موزعة على المواد النظرية:

1. **العلوم الشرعية** (4 أسئلة): توحيد، فقه، حديث وثقافة إسلامية
2. **اللغة العربية** (4 أسئلة): نحو وصرف، بلاغة ونقد، أدب
3. **العلوم الاجتماعية** (2 أسئلة): تاريخ، جغرافيا

**معايير الجودة:**
- أسئلة تقيس الفهم والتحليل
- دقة في المعلومات الشرعية والتاريخية
- مستوى: ${difficulty}
- توزيع: 20% أول ثانوي، 30% ثاني ثانوي، 50% ثالث ثانوي`;

      questionStructure = {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              subject: { type: "string", enum: ["توحيد", "فقه", "حديث", "نحو", "بلاغة", "أدب", "تاريخ", "جغرافيا"] },
              question_text: { type: "string" },
              options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
              correct_answer: { type: "string" },
              explanation: { type: "string" },
              grade_level: { type: "string", enum: ["أول_ثانوي", "ثاني_ثانوي", "ثالث_ثانوي"] }
            },
            required: ["subject", "question_text", "options", "correct_answer", "explanation", "grade_level"]
          },
          minItems: 10,
          maxItems: 10
        }
      };
    }

    const userPrompt = isPracticeMode 
      ? `قم بتوليد ${testType === "قدرات" ? "اختبار قدرات تدريبي شامل (5 لفظي + 5 كمي)" : `اختبار تحصيلي ${track} تدريبي شامل (10 أسئلة)`} بناءً على المنهج الكامل:

📚 **نوع الاختبار:** ${testType} ${testType === "تحصيلي" ? `- ${track}` : ""}
📊 **مستوى الصعوبة:** ${difficulty}

${additionalKnowledge}

⚠️ **متطلبات مهمة:**
- أسئلة متنوعة تغطي جميع جوانب المنهج
- كل سؤال يختبر فهماً حقيقياً وليس حفظاً
- الخيارات الخاطئة معقولة ومقنعة
- ${testType === "قدرات" ? "تنوع بين الأسئلة اللفظية والكمية" : "تغطية شاملة للمواد الدراسية"}
- كل تفسير تعليمي واضح ومفيد
${testType === "تحصيلي" ? `- التوزيع المطلوب: 2 أسئلة أول ثانوي، 3 أسئلة ثاني ثانوي، 5 أسئلة ثالث ثانوي` : ""}`
      : `قم بتوليد ${testType === "قدرات" ? "اختبار قدرات (5 لفظي + 5 كمي)" : `اختبار تحصيلي ${track} (10 أسئلة)`} بناءً على المحتوى التالي:

📚 **المحتوى:**
العنوان: ${content.title}
الوصف: ${content.description || ""}
المواضيع: ${JSON.stringify(content.topics || [])}
أهداف التعلم: ${content.learning_objectives?.join(", ") || ""}

📝 **النص الكامل:**
${content.content_text || ""}
${additionalKnowledge}

⚠️ **متطلبات مهمة:**
- كل سؤال يختبر فهماً حقيقياً وليس حفظاً
- الخيارات الخاطئة معقولة ومقنعة
- ${testType === "قدرات" ? "تنوع بين الأسئلة اللفظية والكمية" : "تغطية شاملة للمواد الدراسية"}
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
              name: testType === "قدرات" ? "generate_qudurat_quiz" : "generate_tahseeli_quiz",
              description: `Generate ${testType} quiz questions`,
              parameters: {
                type: "object",
                properties: questionStructure,
                required: testType === "قدرات" ? ["verbal_questions", "quantitative_questions"] : ["questions"]
              }
            }
          }
        ],
        tool_choice: { 
          type: "function", 
          function: { name: testType === "قدرات" ? "generate_qudurat_quiz" : "generate_tahseeli_quiz" } 
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "يرجى إضافة رصيد للمتابعة." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("Failed to generate quiz");
    }

    const quizData = JSON.parse(toolCall.function.arguments);
    
    // تحويل البيانات حسب نوع الاختبار
    let allQuestions: any[] = [];
    
    if (testType === "قدرات") {
      // دمج الأسئلة اللفظية والكمية
      const verbalQuestions = quizData.verbal_questions?.map((q: any) => ({
        ...q,
        section: "لفظي",
        topic: q.question_type
      })) || [];
      
      const quantQuestions = quizData.quantitative_questions?.map((q: any) => ({
        ...q,
        section: "كمي",
        topic: q.question_type
      })) || [];
      
      allQuestions = [...verbalQuestions, ...quantQuestions];
    } else {
      // أسئلة التحصيلي
      allQuestions = quizData.questions?.map((q: any) => ({
        ...q,
        section: track,
        topic: q.subject
      })) || [];
    }
    
    // Validate questions quality
    const validatedQuestions = allQuestions.filter((q: any) => {
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

    if (validatedQuestions.length < 8) {
      throw new Error(`عدد الأسئلة الصالحة غير كافٍ (${validatedQuestions.length}/10)`);
    }

    console.log(`Validated ${validatedQuestions.length} out of ${allQuestions.length} questions`);
    
    return new Response(
      JSON.stringify({
        questions: validatedQuestions.slice(0, 10),
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
      JSON.stringify({ error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});