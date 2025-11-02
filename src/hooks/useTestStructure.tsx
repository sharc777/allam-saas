import {
  getSections,
  getTopics,
  getAllTopics,
  getSectionInfo,
  type TestSection,
} from "@/config/testStructure";

/**
 * Hook مخصص للوصول إلى هيكل اختبار القدرات
 * جميع الأقسام والمواضيع ثابتة (كمي ولفظي)
 */
export function useTestStructure() {
  return {
    // النوع الحالي للاختبار (دائماً قدرات)
    testType: "قدرات" as const,
    
    // الاسم العربي لنوع الاختبار
    testNameAr: "القدرات العامة",
    
    // جميع الأقسام المتاحة (كمي ولفظي)
    sections: getSections(),
    
    // دالة للحصول على مواضيع قسم معين
    getTopicsForSection: (section: string) => getTopics(section),
    
    // جميع المواضيع في الاختبار
    allTopics: getAllTopics(),
    
    // دالة للحصول على معلومات قسم معين
    getSectionInfo: (sectionId: string) => getSectionInfo(sectionId),
    
    // عدد الأقسام (دائماً 2: كمي ولفظي)
    sectionCount: 2,
    
    // التحقق من وجود قسم
    hasSection: (sectionId: string) => {
      return sectionId === "كمي" || sectionId === "لفظي";
    },
    
    // التحقق من وجود موضوع في قسم
    hasTopic: (sectionId: string, topic: string) => {
      const topics = getTopics(sectionId);
      return topics.includes(topic);
    },
  };
}
