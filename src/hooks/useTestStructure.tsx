import { useMemo } from "react";
import { useProfile } from "./useProfile";
import {
  TEST_STRUCTURE,
  getSections,
  getTopics,
  getAllTopics,
  getSectionInfo,
  type TestSection,
} from "@/config/testStructure";

/**
 * Hook مخصص للوصول إلى هيكل الاختبار الديناميكي
 * يستخدم تفضيلات المستخدم لتحديد نوع الاختبار والأقسام المتاحة
 */
export function useTestStructure() {
  const { data: profile } = useProfile();
  const testType = profile?.test_type_preference || "قدرات";

  const structure = useMemo(() => {
    const config = TEST_STRUCTURE[testType];

    return {
      // النوع الحالي للاختبار
      testType,
      
      // الاسم العربي لنوع الاختبار
      testNameAr: config?.nameAr || "اختبار",
      
      // جميع الأقسام المتاحة
      sections: getSections(testType),
      
      // دالة للحصول على مواضيع قسم معين
      getTopicsForSection: (section: string) => getTopics(testType, section),
      
      // جميع المواضيع في الاختبار الحالي
      allTopics: getAllTopics(testType),
      
      // دالة للحصول على معلومات قسم معين
      getSectionInfo: (sectionId: string) => getSectionInfo(testType, sectionId),
      
      // عدد الأقسام
      sectionCount: config?.sections.length || 0,
      
      // التحقق من وجود قسم
      hasSection: (sectionId: string) => {
        return config?.sections.some((s) => s.id === sectionId) || false;
      },
      
      // التحقق من وجود موضوع في قسم
      hasTopic: (sectionId: string, topic: string) => {
        const topics = getTopics(testType, sectionId);
        return topics.includes(topic);
      },
    };
  }, [testType]);

  return structure;
}
