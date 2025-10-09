import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Brain } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type ExampleForm = {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  section: string;
  subject: string;
  test_type: "قدرات" | "تحصيلي";
  difficulty: "easy" | "medium" | "hard";
};

export const AITrainingExamples = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<ExampleForm>({
    question_text: "",
    options: ["", "", "", ""],
    correct_answer: "",
    explanation: "",
    section: "كمي",
    subject: "",
    test_type: "قدرات",
    difficulty: "medium",
  });

  // Fetch training examples
  const { data: examples, isLoading } = useQuery({
    queryKey: ["ai-training-examples"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_training_examples")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: ExampleForm) => {
      const { error } = await supabase
        .from("ai_training_examples")
        .insert({
          question_text: data.question_text,
          options: data.options,
          correct_answer: data.correct_answer,
          explanation: data.explanation,
          section: data.section,
          subject: data.subject,
          test_type: data.test_type,
          difficulty: data.difficulty,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-training-examples"] });
      toast({ title: "تم إضافة المثال التدريبي" });
      setIsOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ai_training_examples")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-training-examples"] });
      toast({ title: "تم حذف المثال" });
    },
  });

  const resetForm = () => {
    setForm({
      question_text: "",
      options: ["", "", "", ""],
      correct_answer: "",
      explanation: "",
      section: "كمي",
      subject: "",
      test_type: "قدرات",
      difficulty: "medium",
    });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...form.options];
    newOptions[index] = value;
    setForm({ ...form, options: newOptions });
  };

  // Statistics
  const stats = {
    total: examples?.length || 0,
    quant: examples?.filter(ex => ex.section === "كمي").length || 0,
    verbal: examples?.filter(ex => ex.section === "لفظي").length || 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5" />
            أمثلة تدريب الذكاء الاصطناعي
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            أمثلة واقعية لتحسين جودة توليد الأسئلة (Few-shot Learning)
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة مثال
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>إضافة مثال تدريبي</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>نص السؤال</Label>
                <Textarea
                  value={form.question_text}
                  onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                  rows={3}
                  placeholder="أدخل نص السؤال..."
                />
              </div>

              <div>
                <Label>الخيارات (4 خيارات)</Label>
                {form.options.map((option, index) => (
                  <Input
                    key={index}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`الخيار ${index + 1}`}
                    className="mb-2"
                  />
                ))}
              </div>

              <div>
                <Label>الإجابة الصحيحة</Label>
                <Select
                  value={form.correct_answer}
                  onValueChange={(value) => setForm({ ...form, correct_answer: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الإجابة الصحيحة" />
                  </SelectTrigger>
                  <SelectContent>
                    {form.options.map((option, index) => (
                      option && (
                        <SelectItem key={index} value={option}>
                          {option}
                        </SelectItem>
                      )
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>التفسير</Label>
                <Textarea
                  value={form.explanation}
                  onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                  rows={3}
                  placeholder="اشرح سبب الإجابة الصحيحة..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>القسم</Label>
                  <Select
                    value={form.section}
                    onValueChange={(value) => setForm({ ...form, section: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="كمي">كمي</SelectItem>
                      <SelectItem value="لفظي">لفظي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>نوع الاختبار</Label>
                  <Select
                    value={form.test_type}
                    onValueChange={(value: any) => setForm({ ...form, test_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="قدرات">قدرات</SelectItem>
                      <SelectItem value="تحصيلي">تحصيلي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>الصعوبة</Label>
                  <Select
                    value={form.difficulty}
                    onValueChange={(value: any) => setForm({ ...form, difficulty: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">سهل</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="hard">صعب</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>الموضوع</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="مثال: الجبر، استيعاب المقروء..."
                />
              </div>

              <Button
                onClick={() => createMutation.mutate(form)}
                disabled={
                  createMutation.isPending ||
                  !form.question_text ||
                  !form.correct_answer ||
                  !form.explanation
                }
                className="w-full"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                إضافة المثال
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">إجمالي الأمثلة</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">أمثلة كمي</p>
          <p className="text-2xl font-bold">{stats.quant}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">أمثلة لفظي</p>
          <p className="text-2xl font-bold">{stats.verbal}</p>
        </Card>
      </div>

      {/* Examples List */}
      <div className="grid gap-4">
        {examples?.map((example) => (
          <Card key={example.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>{example.section}</Badge>
                  <Badge variant="outline">{example.test_type}</Badge>
                  <Badge variant="secondary">{example.difficulty}</Badge>
                  {example.subject && <Badge variant="outline">{example.subject}</Badge>}
                </div>
                <p className="font-medium mb-2">{example.question_text}</p>
                <div className="text-sm space-y-1 mb-2">
                  {Array.isArray(example.options) && example.options.map((option: string, idx: number) => (
                    <div
                      key={idx}
                      className={option === example.correct_answer ? "text-green-600 font-medium" : ""}
                    >
                      {idx + 1}. {option}
                      {option === example.correct_answer && " ✓"}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  <strong>التفسير:</strong> {example.explanation}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMutation.mutate(example.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
