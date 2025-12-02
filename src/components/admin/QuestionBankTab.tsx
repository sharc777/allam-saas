import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { 
  Database, 
  Search, 
  Trash2, 
  Edit, 
  Loader2,
  CheckCircle2,
  XCircle,
  Filter
} from "lucide-react";
import { getSections, getTopicsWithSubTopics, getAllSubTopicsForSection } from "@/config/testStructure";

interface BankQuestion {
  id: string;
  subject: string;
  sub_topic: string | null;
  topic: string;
  difficulty: string;
  question_text: string;
  options: Record<string, string>;
  correct_answer: string;
  explanation: string | null;
  validation_status: string | null;
  usage_count: number | null;
  success_rate: number | null;
  created_at: string;
}

export const QuestionBankTab = () => {
  const queryClient = useQueryClient();
  const sections = getSections();
  
  // Filter state - use "__all__" instead of empty string
  const [filters, setFilters] = useState({
    section: "__all__",
    subTopic: "__all__",
    difficulty: "__all__",
    search: "",
  });
  
  // Edit dialog state
  const [editingQuestion, setEditingQuestion] = useState<BankQuestion | null>(null);
  const [editForm, setEditForm] = useState({
    question_text: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correct_answer: "",
    explanation: "",
    sub_topic: "__none__",
    difficulty: "",
  });

  // Fetch questions from bank
  const { data: questions, isLoading } = useQuery({
    queryKey: ["question-bank", filters],
    queryFn: async () => {
      let query = supabase
        .from("questions_bank")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filters.section && filters.section !== "__all__") {
        query = query.eq("subject", filters.section as any);
      }
      if (filters.subTopic && filters.subTopic !== "__all__") {
        query = query.eq("sub_topic", filters.subTopic);
      }
      if (filters.difficulty && filters.difficulty !== "__all__") {
        query = query.eq("difficulty", filters.difficulty as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let filtered = data as BankQuestion[];
      if (filters.search) {
        filtered = filtered.filter(q => 
          q.question_text.includes(filters.search)
        );
      }
      
      return filtered;
    },
  });

  // Delete question mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("questions_bank")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "تم حذف السؤال" });
      queryClient.invalidateQueries({ queryKey: ["question-bank"] });
      queryClient.invalidateQueries({ queryKey: ["bank-stats"] });
      queryClient.invalidateQueries({ queryKey: ["training-stats"] });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  // Update question mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingQuestion) return;
      
      const options = {
        أ: editForm.optionA,
        ب: editForm.optionB,
        ج: editForm.optionC,
        د: editForm.optionD,
      };

      const { error } = await supabase
        .from("questions_bank")
        .update({
          question_text: editForm.question_text,
          options,
          correct_answer: editForm.correct_answer,
          explanation: editForm.explanation || null,
          sub_topic: editForm.sub_topic === "__none__" ? null : editForm.sub_topic || null,
          difficulty: editForm.difficulty as "easy" | "medium" | "hard",
        })
        .eq("id", editingQuestion.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "تم تحديث السؤال" });
      setEditingQuestion(null);
      queryClient.invalidateQueries({ queryKey: ["question-bank"] });
      queryClient.invalidateQueries({ queryKey: ["bank-stats"] });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  // Open edit dialog
  const openEditDialog = (question: BankQuestion) => {
    const options = question.options || {};
    setEditForm({
      question_text: question.question_text,
      optionA: options["أ"] || options["A"] || "",
      optionB: options["ب"] || options["B"] || "",
      optionC: options["ج"] || options["C"] || "",
      optionD: options["د"] || options["D"] || "",
      correct_answer: question.correct_answer,
      explanation: question.explanation || "",
      sub_topic: question.sub_topic || "__none__",
      difficulty: question.difficulty,
    });
    setEditingQuestion(question);
  };

  // Get sub-topics for current filter section
  const availableSubTopics = filters.section && filters.section !== "__all__"
    ? getAllSubTopicsForSection(filters.section)
    : [];

  // Get all sub-topics for edit dialog
  const allSubTopics = editingQuestion?.subject
    ? getAllSubTopicsForSection(editingQuestion.subject)
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-green-500" />
          بنك الأسئلة ({questions?.length || 0} سؤال)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-4 gap-3 p-4 bg-muted/50 rounded-lg">
          <div>
            <Label className="text-xs mb-1 block">القسم</Label>
            <Select
              value={filters.section}
              onValueChange={(value) => setFilters({ ...filters, section: value, subTopic: "__all__" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">الكل</SelectItem>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nameAr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs mb-1 block">الموضوع الفرعي</Label>
            <Select
              value={filters.subTopic}
              onValueChange={(value) => setFilters({ ...filters, subTopic: value })}
              disabled={filters.section === "__all__"}
            >
              <SelectTrigger>
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">الكل</SelectItem>
                {availableSubTopics.map((st) => (
                  <SelectItem key={st.id} value={st.id}>{st.nameAr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs mb-1 block">الصعوبة</Label>
            <Select
              value={filters.difficulty}
              onValueChange={(value) => setFilters({ ...filters, difficulty: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">الكل</SelectItem>
                <SelectItem value="easy">سهل</SelectItem>
                <SelectItem value="medium">متوسط</SelectItem>
                <SelectItem value="hard">صعب</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs mb-1 block">بحث</Label>
            <div className="relative">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث في الأسئلة..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pr-8"
              />
            </div>
          </div>
        </div>

        {/* Questions List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : questions && questions.length > 0 ? (
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {questions.map((question) => (
                <div
                  key={question.id}
                  className="p-4 border rounded-lg hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge>{question.subject}</Badge>
                        {question.sub_topic && (
                          <Badge variant="outline" className="text-xs">
                            {question.sub_topic}
                          </Badge>
                        )}
                        <Badge variant="secondary">
                          {question.difficulty === "easy" ? "سهل" : question.difficulty === "medium" ? "متوسط" : "صعب"}
                        </Badge>
                        {question.validation_status === "approved" ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-yellow-500" />
                        )}
                        {question.usage_count !== null && question.usage_count > 0 && (
                          <span className="text-xs text-muted-foreground">
                            استخدم {question.usage_count} مرة
                          </span>
                        )}
                      </div>
                      <p className="text-sm line-clamp-2 mb-2">{question.question_text}</p>
                      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                        {question.options && Object.entries(question.options).map(([key, value]) => (
                          <span 
                            key={key} 
                            className={`${key === question.correct_answer ? 'text-green-600 font-medium' : ''}`}
                          >
                            {key}: {String(value).substring(0, 30)}...
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(question)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(question.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد أسئلة في البنك</p>
            <p className="text-sm">استخدم زر "ولّد أسئلة" في شجرة المواضيع لإضافة أسئلة</p>
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل السؤال</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>الموضوع الفرعي</Label>
                <Select
                  value={editForm.sub_topic}
                  onValueChange={(value) => setEditForm({ ...editForm, sub_topic: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الموضوع الفرعي" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">بدون</SelectItem>
                    {allSubTopics.map((st) => (
                      <SelectItem key={st.id} value={st.id}>{st.nameAr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>الصعوبة</Label>
                <Select
                  value={editForm.difficulty}
                  onValueChange={(value) => setEditForm({ ...editForm, difficulty: value })}
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
              <Label>نص السؤال</Label>
              <Textarea
                value={editForm.question_text}
                onChange={(e) => setEditForm({ ...editForm, question_text: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الخيار أ</Label>
                <Input
                  value={editForm.optionA}
                  onChange={(e) => setEditForm({ ...editForm, optionA: e.target.value })}
                />
              </div>
              <div>
                <Label>الخيار ب</Label>
                <Input
                  value={editForm.optionB}
                  onChange={(e) => setEditForm({ ...editForm, optionB: e.target.value })}
                />
              </div>
              <div>
                <Label>الخيار ج</Label>
                <Input
                  value={editForm.optionC}
                  onChange={(e) => setEditForm({ ...editForm, optionC: e.target.value })}
                />
              </div>
              <div>
                <Label>الخيار د</Label>
                <Input
                  value={editForm.optionD}
                  onChange={(e) => setEditForm({ ...editForm, optionD: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>الإجابة الصحيحة</Label>
              <Select
                value={editForm.correct_answer}
                onValueChange={(value) => setEditForm({ ...editForm, correct_answer: value })}
              >
                <SelectTrigger>
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

            <div>
              <Label>الشرح</Label>
              <Textarea
                value={editForm.explanation}
                onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingQuestion(null)}>
              إلغاء
            </Button>
            <Button 
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
