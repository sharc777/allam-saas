import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { 
  Brain, 
  BookOpen, 
  Database, 
  Plus, 
  Trash2, 
  Save, 
  Loader2,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { 
  getSections, 
  getTopicsWithSubTopics, 
  getAllSubTopicsForSection,
  type SubTopic,
  type TopicWithSubTopics 
} from "@/config/testStructure";

type Difficulty = "easy" | "medium" | "hard";

interface TrainingExample {
  id: string;
  section: string;
  subject: string | null;
  question_text: string;
  options: any;
  correct_answer: string;
  explanation: string | null;
  difficulty: Difficulty;
  quality_score: number | null;
  created_at: string;
}

export const AITrainingManager = () => {
  const queryClient = useQueryClient();
  const sections = getSections();
  
  // Form state for new training example
  const [formData, setFormData] = useState({
    section: "كمي",
    topic: "",
    subTopic: "",
    difficulty: "medium" as Difficulty,
    questionText: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswer: "أ",
    explanation: "",
  });

  // Statistics queries
  const { data: trainingStats } = useQuery({
    queryKey: ["training-stats"],
    queryFn: async () => {
      const { count: examplesCount } = await supabase
        .from("ai_training_examples")
        .select("*", { count: "exact", head: true });

      const { count: skillsCount } = await supabase
        .from("skills_taxonomy")
        .select("*", { count: "exact", head: true });

      const { count: cacheCount } = await supabase
        .from("questions_cache")
        .select("*", { count: "exact", head: true })
        .eq("is_used", false);

      return {
        examples: examplesCount || 0,
        skills: skillsCount || 0,
        cache: cacheCount || 0,
      };
    },
  });

  // Fetch training examples
  const { data: trainingExamples, isLoading: examplesLoading } = useQuery({
    queryKey: ["training-examples"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_training_examples")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TrainingExample[];
    },
  });

  // Fetch examples count by section and topic
  const { data: examplesByTopic } = useQuery({
    queryKey: ["examples-by-topic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_training_examples")
        .select("section, subject");

      if (error) throw error;

      const counts: Record<string, Record<string, number>> = {};
      data?.forEach((ex) => {
        if (!counts[ex.section]) counts[ex.section] = {};
        const topic = ex.subject || "عام";
        counts[ex.section][topic] = (counts[ex.section][topic] || 0) + 1;
      });
      return counts;
    },
  });

  // Add training example mutation
  const addExampleMutation = useMutation({
    mutationFn: async () => {
      const options = {
        أ: formData.optionA,
        ب: formData.optionB,
        ج: formData.optionC,
        د: formData.optionD,
      };

      const { error } = await supabase.from("ai_training_examples").insert({
        section: formData.section,
        subject: formData.subTopic || formData.topic || null,
        question_text: formData.questionText,
        options,
        correct_answer: formData.correctAnswer,
        explanation: formData.explanation || null,
        difficulty: formData.difficulty,
        test_type: "قدرات",
        quality_score: 4,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "تم إضافة السؤال النموذجي بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["training-examples"] });
      queryClient.invalidateQueries({ queryKey: ["training-stats"] });
      queryClient.invalidateQueries({ queryKey: ["examples-by-topic"] });
      // Reset form
      setFormData({
        ...formData,
        questionText: "",
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctAnswer: "أ",
        explanation: "",
      });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  // Delete training example
  const deleteExampleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_training_examples").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "تم حذف السؤال" });
      queryClient.invalidateQueries({ queryKey: ["training-examples"] });
      queryClient.invalidateQueries({ queryKey: ["training-stats"] });
      queryClient.invalidateQueries({ queryKey: ["examples-by-topic"] });
    },
  });

  // Get topics for selected section
  const currentTopics = getTopicsWithSubTopics(formData.section);
  const currentSubTopics = formData.topic
    ? currentTopics.find((t) => t.id === formData.topic)?.subTopics || []
    : [];

  // Count examples for a topic
  const getTopicExamplesCount = (section: string, topic: string): number => {
    if (!examplesByTopic) return 0;
    return examplesByTopic[section]?.[topic] || 0;
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-2">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">أمثلة التدريب</p>
              <p className="text-2xl font-bold">{trainingStats?.examples || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
              <Brain className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">المهارات</p>
              <p className="text-2xl font-bold">{trainingStats?.skills || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
              <Database className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ذاكرة الأسئلة</p>
              <p className="text-2xl font-bold">{trainingStats?.cache || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="topics" className="space-y-4" dir="rtl">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="topics" className="gap-2">
            <Sparkles className="w-4 h-4" />
            شجرة المواضيع
          </TabsTrigger>
          <TabsTrigger value="examples" className="gap-2">
            <BookOpen className="w-4 h-4" />
            أمثلة التدريب
          </TabsTrigger>
          <TabsTrigger value="add" className="gap-2">
            <Plus className="w-4 h-4" />
            إضافة سؤال
          </TabsTrigger>
        </TabsList>

        {/* Topics Tree Tab */}
        <TabsContent value="topics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                شجرة المواضيع والمهارات الفرعية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Accordion type="multiple" className="space-y-2">
                  {sections.map((section) => (
                    <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{section.icon}</span>
                          <span className="font-bold text-lg">{section.nameAr}</span>
                          <Badge variant="outline">
                            {section.topics.length} موضوع
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pr-8">
                          {section.topics.map((topic) => (
                            <Accordion key={topic.id} type="single" collapsible>
                              <AccordionItem value={topic.id} className="border-r-2 border-primary/30 pr-4">
                                <AccordionTrigger className="hover:no-underline py-2">
                                  <div className="flex items-center gap-2">
                                    <ChevronRight className="w-4 h-4" />
                                    <span className="font-medium">{topic.nameAr}</span>
                                    <Badge 
                                      variant={getTopicExamplesCount(section.id, topic.id) > 0 ? "default" : "secondary"}
                                      className="text-xs"
                                    >
                                      {getTopicExamplesCount(section.id, topic.id)} مثال
                                    </Badge>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-2 pr-6">
                                    {topic.subTopics.map((subTopic) => {
                                      const count = getTopicExamplesCount(section.id, subTopic.id);
                                      return (
                                        <div
                                          key={subTopic.id}
                                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                                        >
                                          <div className="flex items-center gap-2">
                                            {count >= 3 ? (
                                              <CheckCircle2 className="w-4 h-4 text-success" />
                                            ) : count > 0 ? (
                                              <AlertCircle className="w-4 h-4 text-warning" />
                                            ) : (
                                              <AlertCircle className="w-4 h-4 text-muted-foreground" />
                                            )}
                                            <span className="text-sm">{subTopic.nameAr}</span>
                                          </div>
                                          <Badge variant="outline" className="text-xs">
                                            {count} مثال
                                          </Badge>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Training Examples Tab */}
        <TabsContent value="examples">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                أمثلة التدريب ({trainingExamples?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {examplesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : trainingExamples && trainingExamples.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {trainingExamples.map((example) => (
                      <div
                        key={example.id}
                        className="p-4 border rounded-lg hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge>{example.section}</Badge>
                              {example.subject && (
                                <Badge variant="outline">{example.subject}</Badge>
                              )}
                              <Badge variant="secondary">
                                {example.difficulty === "easy"
                                  ? "سهل"
                                  : example.difficulty === "medium"
                                  ? "متوسط"
                                  : "صعب"}
                              </Badge>
                            </div>
                            <p className="text-sm line-clamp-2">{example.question_text}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteExampleMutation.mutate(example.id)}
                            disabled={deleteExampleMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">لا توجد أمثلة تدريب</p>
                  <p className="text-sm">أضف أسئلة نموذجية لتدريب الذكاء الاصطناعي</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add Question Tab */}
        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                إضافة سؤال نموذجي للتدريب
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Section and Topic Selection */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>القسم</Label>
                    <Select
                      value={formData.section}
                      onValueChange={(v) =>
                        setFormData({ ...formData, section: v, topic: "", subTopic: "" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.icon} {s.nameAr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>الموضوع الرئيسي</Label>
                    <Select
                      value={formData.topic}
                      onValueChange={(v) =>
                        setFormData({ ...formData, topic: v, subTopic: "" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الموضوع" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentTopics.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nameAr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>الموضوع الفرعي</Label>
                    <Select
                      value={formData.subTopic}
                      onValueChange={(v) => setFormData({ ...formData, subTopic: v })}
                      disabled={!formData.topic}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الموضوع الفرعي" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentSubTopics.map((st) => (
                          <SelectItem key={st.id} value={st.id}>
                            {st.nameAr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <Label>مستوى الصعوبة</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(v) => setFormData({ ...formData, difficulty: v as Difficulty })}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">سهل</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="hard">صعب</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Question Text */}
                <div>
                  <Label>نص السؤال</Label>
                  <Textarea
                    value={formData.questionText}
                    onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                    placeholder="اكتب نص السؤال هنا..."
                    className="min-h-[100px]"
                  />
                </div>

                {/* Options */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>الخيار أ</Label>
                    <Input
                      value={formData.optionA}
                      onChange={(e) => setFormData({ ...formData, optionA: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>الخيار ب</Label>
                    <Input
                      value={formData.optionB}
                      onChange={(e) => setFormData({ ...formData, optionB: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>الخيار ج</Label>
                    <Input
                      value={formData.optionC}
                      onChange={(e) => setFormData({ ...formData, optionC: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>الخيار د</Label>
                    <Input
                      value={formData.optionD}
                      onChange={(e) => setFormData({ ...formData, optionD: e.target.value })}
                    />
                  </div>
                </div>

                {/* Correct Answer */}
                <div>
                  <Label>الإجابة الصحيحة</Label>
                  <Select
                    value={formData.correctAnswer}
                    onValueChange={(v) => setFormData({ ...formData, correctAnswer: v })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="أ">أ</SelectItem>
                      <SelectItem value="ب">ب</SelectItem>
                      <SelectItem value="ج">ج</SelectItem>
                      <SelectItem value="د">د</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Explanation */}
                <div>
                  <Label>الشرح (اختياري)</Label>
                  <Textarea
                    value={formData.explanation}
                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                    placeholder="اكتب شرح الإجابة الصحيحة..."
                    className="min-h-[80px]"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  onClick={() => addExampleMutation.mutate()}
                  disabled={
                    addExampleMutation.isPending ||
                    !formData.questionText ||
                    !formData.optionA ||
                    !formData.optionB ||
                    !formData.optionC ||
                    !formData.optionD
                  }
                  className="w-full"
                  size="lg"
                >
                  {addExampleMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <Save className="w-4 h-4 ml-2" />
                  )}
                  حفظ السؤال النموذجي
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AITrainingManager;
