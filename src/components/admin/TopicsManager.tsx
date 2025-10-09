import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Edit2, BookOpen, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type TopicForm = {
  id?: string;
  title: string;
  content: string;
  content_type: string;
  test_type: "قدرات" | "تحصيلي";
  track?: "عام" | "علمي" | "نظري";
  related_topics: string[];
  is_active: boolean;
};

export const TopicsManager = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [form, setForm] = useState<TopicForm>({
    title: "",
    content: "",
    content_type: "text",
    test_type: "قدرات",
    track: "عام",
    related_topics: [],
    is_active: true,
  });

  // Fetch knowledge base
  const { data: knowledgeBase, isLoading } = useQuery({
    queryKey: ["knowledge-base"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_base")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: TopicForm) => {
      if (data.id) {
        const { error } = await supabase
          .from("knowledge_base")
          .update({
            title: data.title,
            content: data.content,
            content_type: data.content_type,
            test_type: data.test_type,
            track: data.track,
            related_topics: data.related_topics,
            is_active: data.is_active,
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("knowledge_base")
          .insert({
            title: data.title,
            content: data.content,
            content_type: data.content_type,
            test_type: data.test_type,
            track: data.track,
            related_topics: data.related_topics,
            is_active: data.is_active,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
      toast({ title: form.id ? "تم تحديث الموضوع" : "تم إضافة الموضوع" });
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
        .from("knowledge_base")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
      toast({ title: "تم حذف الموضوع" });
    },
  });

  const resetForm = () => {
    setForm({
      title: "",
      content: "",
      content_type: "text",
      test_type: "قدرات",
      track: "عام",
      related_topics: [],
      is_active: true,
    });
  };

  const handleEdit = (kb: any) => {
    setForm({
      id: kb.id,
      title: kb.title,
      content: kb.content || "",
      content_type: kb.content_type,
      test_type: kb.test_type,
      track: kb.track,
      related_topics: kb.related_topics || [],
      is_active: kb.is_active,
    });
    setIsOpen(true);
  };

  const addTopic = () => {
    if (newTopic.trim()) {
      setForm({
        ...form,
        related_topics: [...form.related_topics, newTopic.trim()],
      });
      setNewTopic("");
    }
  };

  const removeTopic = (index: number) => {
    setForm({
      ...form,
      related_topics: form.related_topics.filter((_, i) => i !== index),
    });
  };

  // Statistics
  const stats = {
    total: knowledgeBase?.length || 0,
    quant: knowledgeBase?.filter(kb => kb.test_type === "قدرات" && kb.content?.includes("كمي")).length || 0,
    verbal: knowledgeBase?.filter(kb => kb.test_type === "قدرات" && kb.content?.includes("لفظي")).length || 0,
    active: knowledgeBase?.filter(kb => kb.is_active).length || 0,
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
      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المواضيع</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">مواضيع كمي</p>
              <p className="text-2xl font-bold">{stats.quant}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">مواضيع لفظي</p>
              <p className="text-2xl font-bold">{stats.verbal}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">مواضيع نشطة</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Add Topic Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button onClick={resetForm}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة موضوع جديد
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{form.id ? "تعديل موضوع" : "إضافة موضوع جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>عنوان الموضوع</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="مثال: الحساب الأساسي"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Label>المسار</Label>
                <Select
                  value={form.track || "عام"}
                  onValueChange={(value: any) => setForm({ ...form, track: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="عام">عام</SelectItem>
                    <SelectItem value="علمي">علمي</SelectItem>
                    <SelectItem value="نظري">نظري</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>المحتوى</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={10}
                placeholder="أدخل محتوى الموضوع التعليمي هنا..."
              />
            </div>

            <div>
              <Label>المواضيع المرتبطة</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="أضف موضوع مرتبط"
                  onKeyPress={(e) => e.key === "Enter" && addTopic()}
                />
                <Button onClick={addTopic} type="button" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.related_topics.map((topic, index) => (
                  <Badge key={index} variant="secondary">
                    {topic}
                    <button
                      onClick={() => removeTopic(index)}
                      className="mr-2 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.title || !form.content}
              className="w-full"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              {form.id ? "تحديث" : "إضافة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Topics List */}
      <div className="grid gap-4">
        {knowledgeBase?.map((kb) => (
          <Card key={kb.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg">{kb.title}</h3>
                  <Badge variant={kb.is_active ? "default" : "secondary"}>
                    {kb.is_active ? "نشط" : "غير نشط"}
                  </Badge>
                  <Badge variant="outline">{kb.test_type}</Badge>
                  {kb.track && <Badge variant="outline">{kb.track}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {kb.content?.substring(0, 200)}...
                </p>
                {kb.related_topics && kb.related_topics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {kb.related_topics.map((topic: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(kb)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(kb.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
