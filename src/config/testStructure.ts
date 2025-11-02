/**
 * هيكل اختبار القدرات فقط
 * يحتوي على قسمين: كمي ولفظي
 */

export interface TestSection {
  id: string;
  nameAr: string;
  icon: string;
  topics: string[];
}

// هيكل اختبار القدرات فقط
export const SECTIONS: TestSection[] = [
  {
    id: "كمي",
    nameAr: "الكمي",
    icon: "🔢",
    topics: [
      "الجبر",
      "الهندسة",
      "الإحصاء",
      "الأعداد",
      "النسب والتناسب",
      "المعادلات",
      "الهندسة التحليلية",
      "المتتاليات",
      "الاحتمالات",
      "القياس",
    ],
  },
  {
    id: "لفظي",
    nameAr: "اللفظي",
    icon: "📝",
    topics: [
      "القراءة والاستيعاب",
      "المفردات",
      "التناظر اللفظي",
      "إكمال الجمل",
      "الخطأ السياقي",
      "الارتباط والاختلاف",
      "التحليل النقدي",
      "الاستنتاج",
    ],
  },
] as const;

export function getSections(): TestSection[] {
  return SECTIONS;
}

export function getTopics(section: string): string[] {
  return SECTIONS.find((s) => s.id === section)?.topics || [];
}

export function getAllTopics(): string[] {
  return SECTIONS.flatMap((s) => s.topics);
}

export function validateSectionAndTopic(
  section: string,
  topic: string
): boolean {
  const topics = getTopics(section);
  return topics.includes(topic);
}

export function getSectionInfo(sectionId: string): TestSection | undefined {
  return SECTIONS.find((s) => s.id === sectionId);
}
