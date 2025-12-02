/**
 * نسخة Deno من هيكل اختبار القدرات مع المواضيع الفرعية
 * يستخدم في Edge Functions للتحقق من صحة البيانات
 * ⚠️ مهم: يجب أن تتطابق أسماء sub_topic مع src/config/testStructure.ts و smartTrainingExamples.ts
 */

export interface SubTopic {
  id: string;
  nameAr: string;
  description?: string;
}

export interface TopicWithSubTopics {
  id: string;
  nameAr: string;
  subTopics: SubTopic[];
}

export interface TestSection {
  id: string;
  nameAr: string;
  icon: string;
  topics: TopicWithSubTopics[];
}

// هيكل اختبار القدرات مع المواضيع الفرعية
// ✅ الأسماء موحدة مع جميع الملفات الأخرى (تستخدم مسافات بدلاً من _)
export const SECTIONS: TestSection[] = [
  {
    id: "كمي",
    nameAr: "الكمي",
    icon: "🔢",
    topics: [
      {
        id: "الجبر",
        nameAr: "الجبر",
        subTopics: [
          { id: "حساب الكسور", nameAr: "حساب الكسور", description: "جمع وطرح وضرب وقسمة الكسور" },
          { id: "المعادلات الخطية", nameAr: "المعادلات الخطية", description: "حل معادلات بمتغير واحد أو أكثر" },
          { id: "الجذور والأسس", nameAr: "الجذور والأسس", description: "قوانين الأسس والجذور التربيعية" },
          { id: "المتباينات", nameAr: "المتباينات", description: "حل المتباينات وتمثيلها" },
        ],
      },
      {
        id: "الهندسة",
        nameAr: "الهندسة",
        subTopics: [
          { id: "المساحات والمحيطات", nameAr: "المساحات والمحيطات", description: "حساب مساحة ومحيط الأشكال" },
          { id: "الزوايا والمثلثات", nameAr: "الزوايا والمثلثات", description: "خصائص الزوايا والمثلثات" },
          { id: "الدوائر", nameAr: "الدوائر", description: "محيط ومساحة الدائرة والقطاعات" },
          { id: "الحجوم", nameAr: "الحجوم", description: "حساب حجوم الأشكال ثلاثية الأبعاد" },
        ],
      },
      {
        id: "الإحصاء",
        nameAr: "الإحصاء",
        subTopics: [
          { id: "المتوسط والوسيط", nameAr: "المتوسط والوسيط", description: "مقاييس النزعة المركزية" },
          { id: "المنوال والمدى", nameAr: "المنوال والمدى", description: "المنوال ومقاييس التشتت" },
          { id: "قراءة الرسوم البيانية", nameAr: "قراءة الرسوم البيانية", description: "تفسير وتحليل الرسوم البيانية" },
        ],
      },
      {
        id: "الأعداد",
        nameAr: "الأعداد",
        subTopics: [
          { id: "النسب والتناسب", nameAr: "النسب والتناسب", description: "حل مسائل النسب والتناسب" },
          { id: "النسب المئوية", nameAr: "النسب المئوية", description: "حساب النسب المئوية والزيادة والنقصان" },
          { id: "الأعداد الأولية", nameAr: "الأعداد الأولية", description: "خصائص الأعداد الأولية والتحليل" },
          { id: "القواسم والمضاعفات", nameAr: "القواسم والمضاعفات", description: "ق.م.أ و م.م.أ" },
        ],
      },
      {
        id: "المعادلات",
        nameAr: "المعادلات",
        subTopics: [
          { id: "المقارنات الكمية", nameAr: "المقارنات الكمية", description: "مقارنة قيمتين وتحديد العلاقة" },
          { id: "المعادلات التربيعية", nameAr: "المعادلات التربيعية", description: "حل المعادلات من الدرجة الثانية" },
        ],
      },
      {
        id: "الاحتمالات",
        nameAr: "الاحتمالات",
        subTopics: [
          { id: "الاحتمالات البسيطة", nameAr: "الاحتمالات البسيطة", description: "حساب احتمال حدث بسيط" },
          { id: "التباديل والتوافيق", nameAr: "التباديل والتوافيق", description: "عد الترتيبات والاختيارات" },
        ],
      },
      {
        id: "المتتاليات",
        nameAr: "المتتاليات",
        subTopics: [
          { id: "المتتاليات الحسابية", nameAr: "المتتاليات الحسابية", description: "إيجاد الحد العام والمجموع" },
          { id: "المتتاليات الهندسية", nameAr: "المتتاليات الهندسية", description: "إيجاد الحد العام والمجموع" },
        ],
      },
    ],
  },
  {
    id: "لفظي",
    nameAr: "اللفظي",
    icon: "📝",
    topics: [
      {
        id: "القراءة والاستيعاب",
        nameAr: "القراءة والاستيعاب",
        subTopics: [
          { id: "فهم النص", nameAr: "فهم النص", description: "استخراج المعلومات من النص" },
          { id: "الفكرة الرئيسية", nameAr: "الفكرة الرئيسية", description: "تحديد الفكرة العامة للنص" },
          { id: "الاستنتاج من النص", nameAr: "الاستنتاج من النص", description: "استنتاج معلومات ضمنية" },
        ],
      },
      {
        id: "المفردات",
        nameAr: "المفردات",
        subTopics: [
          { id: "معاني الكلمات", nameAr: "معاني الكلمات", description: "معرفة معاني المفردات" },
          { id: "المترادفات", nameAr: "المترادفات", description: "الكلمات ذات المعنى المتشابه" },
          { id: "الأضداد", nameAr: "الأضداد", description: "الكلمات ذات المعنى المتعاكس" },
        ],
      },
      {
        id: "التناظر اللفظي",
        nameAr: "التناظر اللفظي",
        subTopics: [
          { id: "علاقات الكلمات", nameAr: "علاقات الكلمات", description: "إيجاد العلاقة بين كلمتين" },
          { id: "التناظر المركب", nameAr: "التناظر المركب", description: "علاقات متعددة بين الكلمات" },
        ],
      },
      {
        id: "إكمال الجمل",
        nameAr: "إكمال الجمل",
        subTopics: [
          { id: "السياق اللغوي", nameAr: "السياق اللغوي", description: "اختيار الكلمة المناسبة للسياق" },
          { id: "الروابط اللغوية", nameAr: "الروابط اللغوية", description: "استخدام أدوات الربط" },
        ],
      },
      {
        id: "الخطأ السياقي",
        nameAr: "الخطأ السياقي",
        subTopics: [
          { id: "تحديد الخطأ", nameAr: "تحديد الخطأ", description: "إيجاد الكلمة الخاطئة في الجملة" },
          { id: "تصحيح الخطأ", nameAr: "تصحيح الخطأ", description: "اقتراح الكلمة الصحيحة" },
        ],
      },
      {
        id: "الارتباط والاختلاف",
        nameAr: "الارتباط والاختلاف",
        subTopics: [
          { id: "التصنيف المنطقي", nameAr: "التصنيف المنطقي", description: "تصنيف العناصر حسب خصائصها" },
          { id: "الشاذ المختلف", nameAr: "الشاذ المختلف", description: "إيجاد العنصر المختلف" },
        ],
      },
      {
        id: "الاستنتاج",
        nameAr: "الاستنتاج",
        subTopics: [
          { id: "الاستنتاج المنطقي", nameAr: "الاستنتاج المنطقي", description: "استخلاص نتائج من مقدمات" },
          { id: "القياس المنطقي", nameAr: "القياس المنطقي", description: "تطبيق قواعد القياس" },
        ],
      },
    ],
  },
];

// دوال مساعدة
export function getSections(): TestSection[] {
  return SECTIONS;
}

export function getTopics(sectionId: string): string[] {
  const section = SECTIONS.find((s) => s.id === sectionId);
  return section?.topics.map((t) => t.id) || [];
}

export function getTopicsWithSubTopics(sectionId: string): TopicWithSubTopics[] {
  const section = SECTIONS.find((s) => s.id === sectionId);
  return section?.topics || [];
}

export function getSubTopics(sectionId: string, topicId: string): SubTopic[] {
  const section = SECTIONS.find((s) => s.id === sectionId);
  const topic = section?.topics.find((t) => t.id === topicId);
  return topic?.subTopics || [];
}

export function getAllTopics(): string[] {
  return SECTIONS.flatMap((s) => s.topics.map((t) => t.id));
}

export function getAllSubTopics(): SubTopic[] {
  return SECTIONS.flatMap((s) => s.topics.flatMap((t) => t.subTopics));
}

export function getAllSubTopicsForSection(sectionId: string): SubTopic[] {
  const section = SECTIONS.find((s) => s.id === sectionId);
  return section?.topics.flatMap((t) => t.subTopics) || [];
}

export function validateSectionAndTopic(section: string, topic: string): boolean {
  const topics = getTopics(section);
  return topics.includes(topic);
}

export function findSubTopicSection(subTopicId: string): { section: string; topic: string } | null {
  for (const section of SECTIONS) {
    for (const topic of section.topics) {
      const found = topic.subTopics.find((st) => st.id === subTopicId);
      if (found) {
        return { section: section.id, topic: topic.id };
      }
    }
  }
  return null;
}

export function getSubTopicInfo(subTopicId: string): SubTopic | undefined {
  for (const section of SECTIONS) {
    for (const topic of section.topics) {
      const found = topic.subTopics.find((st) => st.id === subTopicId);
      if (found) return found;
    }
  }
  return undefined;
}
