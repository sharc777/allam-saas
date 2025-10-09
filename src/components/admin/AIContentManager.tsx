import { Card, CardContent } from "@/components/ui/card";
import { KnowledgeBaseManager } from "./KnowledgeBaseManager";
import { BookOpen, Database, GraduationCap, Info } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const AIContentManager = () => {
  const { data: kbCount } = useQuery({
    queryKey: ['kb-count'],
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { count } = await supabase
        .from('knowledge_base')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const { data: questionsCount } = useQuery({
    queryKey: ['questions-bank-count'],
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { count } = await supabase
        .from('questions_bank')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  return (
    <TooltipProvider>
      <div className="space-y-6" dir="rtl">
        <div>
          <h2 className="text-2xl font-bold mb-2">🤖 نظام توليد الأسئلة الذكي</h2>
          <p className="text-sm text-muted-foreground">
            إدارة المصادر التي يستخدمها الذكاء الاصطناعي لتوليد أسئلة عالية الجودة
          </p>
        </div>

        {/* بطاقة توضيحية - كيف يعمل النظام */}
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">🎯 كيف يعمل نظام توليد الأسئلة؟</h3>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <span className="text-primary font-bold">1️⃣</span>
                      <p><strong className="text-foreground">قاعدة المعرفة</strong> - يقرأ الذكاء الاصطناعي المحتوى المنظم حسب التصنيف (اختبار، مسار، قسم) لفهم السياق</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary font-bold">2️⃣</span>
                      <p><strong className="text-foreground">توليد الأسئلة</strong> - يستخدم هذا السياق لتوليد أسئلة ذكية ومتنوعة بجودة عالية</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary font-bold">3️⃣</span>
                      <p><strong className="text-foreground">بنك الأسئلة</strong> - يُستخدم كبديل احتياطي عند الحاجة لضمان توفر الأسئلة دائماً</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-2 gap-4">
          {/* قاعدة المعرفة */}
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-bold text-lg">🧠 قاعدة المعرفة</p>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs" dir="rtl">
                        <div className="space-y-1">
                          <p className="font-semibold">المصدر الأساسي للذكاء الاصطناعي</p>
                          <p className="text-xs">• يُستخدم في generate-quiz لفهم السياق</p>
                          <p className="text-xs">• مُصنف حسب: اختبار، مسار، موضوع، قسم</p>
                          <p className="text-xs">• كلما زاد المحتوى، تحسنت جودة الأسئلة ✨</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-4xl font-bold mb-2 text-primary">
                    {kbCount !== undefined ? kbCount : <Loader2 className="h-6 w-6 animate-spin" />}
                  </p>
                  <p className="text-sm text-muted-foreground">موضوع تعليمي منظم</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* بنك الأسئلة */}
          <Card className="border-l-4 border-l-success">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                  <Database className="h-6 w-6 text-success" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-bold text-lg">🗄️ بنك الأسئلة</p>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs" dir="rtl">
                        <div className="space-y-1">
                          <p className="font-semibold">أسئلة جاهزة احتياطية</p>
                          <p className="text-xs">• تُستخدم عند نقص الأسئلة المولدة</p>
                          <p className="text-xs">• أسئلة كاملة مع الحل والشرح</p>
                          <p className="text-xs">• تضمن توفر الأسئلة دائماً 🛡️</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-4xl font-bold mb-2 text-success">
                    {questionsCount !== undefined ? questionsCount : <Loader2 className="h-6 w-6 animate-spin" />}
                  </p>
                  <p className="text-sm text-muted-foreground">سؤال جاهز للاستخدام</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* بطاقة معلومات - المحتوى اليومي */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-2 border-dashed border-blue-300 dark:border-blue-700">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="space-y-2 text-sm flex-1">
                <p className="font-bold text-base text-blue-900 dark:text-blue-100">📚 هل تعلم؟ المحتوى اليومي منفصل</p>
                <p className="text-blue-800 dark:text-blue-200">
                  <strong>المحتوى اليومي</strong> (الدروس والفيديوهات) مخصص للطلاب فقط ولا يُستخدم مباشرة في توليد الأسئلة.
                </p>
                <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    💡 <strong>نصيحة:</strong> يمكنك تحويل أي محتوى يومي إلى قاعدة معرفة من تبويب "إدارة المحتوى التعليمي" بضغطة زر واحدة!
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <KnowledgeBaseManager />
      </div>
    </TooltipProvider>
  );
};