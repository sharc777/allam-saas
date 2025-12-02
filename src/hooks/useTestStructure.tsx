import {
  getSections,
  getTopics,
  getAllTopics,
  getSectionInfo,
  getTopicsWithSubTopics,
  getSubTopics,
  getAllSubTopics,
  getAllSubTopicsForSection,
  findSubTopicSection,
  getSubTopicInfo,
  type TestSection,
  type SubTopic,
  type TopicWithSubTopics,
} from "@/config/testStructure";

/**
 * Hook مخصص للوصول إلى هيكل اختبار القدرات مع المواضيع الفرعية
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
    
    // دالة للحصول على مواضيع قسم معين (أسماء فقط)
    getTopicsForSection: (section: string) => getTopics(section),
    
    // دالة للحصول على مواضيع قسم معين مع المواضيع الفرعية
    getTopicsWithSubTopics: (section: string) => getTopicsWithSubTopics(section),
    
    // دالة للحصول على المواضيع الفرعية لموضوع معين
    getSubTopics: (section: string, topic: string) => getSubTopics(section, topic),
    
    // جميع المواضيع في الاختبار
    allTopics: getAllTopics(),
    
    // جميع المواضيع الفرعية
    allSubTopics: getAllSubTopics(),
    
    // جميع المواضيع الفرعية لقسم معين
    getAllSubTopicsForSection: (section: string) => getAllSubTopicsForSection(section),
    
    // دالة للحصول على معلومات قسم معين
    getSectionInfo: (sectionId: string) => getSectionInfo(sectionId),
    
    // دالة للبحث عن قسم وموضوع لموضوع فرعي
    findSubTopicSection: (subTopicId: string) => findSubTopicSection(subTopicId),
    
    // دالة للحصول على معلومات موضوع فرعي
    getSubTopicInfo: (subTopicId: string) => getSubTopicInfo(subTopicId),
    
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
