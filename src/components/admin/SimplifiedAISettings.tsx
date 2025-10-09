import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopicsManager } from "./TopicsManager";
import { AITrainingExamples } from "./AITrainingExamples";
import { KnowledgeBase } from "./KnowledgeBase";
import { BookOpen, Brain, Database } from "lucide-react";

export const SimplifiedAISettings = () => {
  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-2xl font-bold">إدارة المحتوى والذكاء الاصطناعي</h2>
        <p className="text-sm text-muted-foreground mt-1">
          إدارة المواضيع وتدريب الذكاء الاصطناعي لتحسين جودة الأسئلة
        </p>
      </div>

      <Tabs defaultValue="topics" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="topics" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            المواضيع والمحتوى
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            تدريب الذكاء الاصطناعي
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            قاعدة المعرفة (متقدم)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="mt-6">
          <TopicsManager />
        </TabsContent>

        <TabsContent value="training" className="mt-6">
          <AITrainingExamples />
        </TabsContent>

        <TabsContent value="knowledge" className="mt-6">
          <KnowledgeBase />
        </TabsContent>
      </Tabs>
    </div>
  );
};
