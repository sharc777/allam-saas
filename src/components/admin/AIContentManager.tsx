import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { KnowledgeBaseManager } from "./KnowledgeBaseManager";
import { AITrainingExamples } from "./AITrainingExamples";
import { BookOpen, Brain, Database } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useAISettings } from "@/hooks/useAISettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const AIContentManager = () => {
  // Fetch statistics with caching
  const { data: aiSettings } = useAISettings();
  
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

  const { data: trainingCount } = useQuery({
    queryKey: ['training-count'],
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { count } = await supabase
        .from('ai_training_examples')
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
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-2xl font-bold">إدارة المحتوى والذكاء الاصطناعي</h2>
        <p className="text-sm text-muted-foreground mt-1">
          إدارة قاعدة المعرفة وتدريب الذكاء الاصطناعي لتحسين جودة الأسئلة
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">قاعدة المعرفة</p>
                <p className="text-2xl font-bold">
                  {kbCount !== undefined ? kbCount : <Loader2 className="h-5 w-5 animate-spin" />}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <Brain className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">أمثلة التدريب</p>
                <p className="text-2xl font-bold">
                  {trainingCount !== undefined ? trainingCount : <Loader2 className="h-5 w-5 animate-spin" />}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <Database className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">بنك الأسئلة</p>
                <p className="text-2xl font-bold">
                  {questionsCount !== undefined ? questionsCount : <Loader2 className="h-5 w-5 animate-spin" />}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="knowledge" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="knowledge" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            قاعدة المعرفة
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            تدريب الذكاء الاصطناعي
          </TabsTrigger>
        </TabsList>

        <TabsContent value="knowledge" className="mt-6">
          <KnowledgeBaseManager />
        </TabsContent>

        <TabsContent value="training" className="mt-6">
          <AITrainingExamples />
        </TabsContent>
      </Tabs>
    </div>
  );
};