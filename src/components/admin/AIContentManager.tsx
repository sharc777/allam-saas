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
          <h2 className="text-2xl font-bold">إدارة محتوى الذكاء الاصطناعي</h2>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة المصادر المعرفية والأسئلة لتحسين توليد الاختبارات
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold">قاعدة المعرفة</p>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>معرفة الذكاء الاصطناعي - يستخدمها generate-quiz لإثراء السياق عند توليد الأسئلة</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-3xl font-bold mb-1">
                    {kbCount !== undefined ? kbCount : <Loader2 className="h-6 w-6 animate-spin" />}
                  </p>
                  <p className="text-xs text-muted-foreground">موضوع تعليمي</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                  <Database className="h-6 w-6 text-success" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold">بنك الأسئلة</p>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>أسئلة جاهزة احتياطية - تُستخدم عند نقص الأسئلة المولدة من الذكاء الاصطناعي</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-3xl font-bold mb-1">
                    {questionsCount !== undefined ? questionsCount : <Loader2 className="h-6 w-6 animate-spin" />}
                  </p>
                  <p className="text-xs text-muted-foreground">سؤال جاهز</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <GraduationCap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">💡 ملاحظة: المحتوى اليومي منفصل</p>
                <p className="text-muted-foreground">
                  المحتوى اليومي (الدروس والفيديوهات) موجود في صفحة منفصلة ولا يُستخدم في توليد الأسئلة.
                  يمكنك إضافة محتوى يومي إلى قاعدة المعرفة من صفحة إدارة المحتوى التعليمي.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <KnowledgeBaseManager />
      </div>
    </TooltipProvider>
  );
};