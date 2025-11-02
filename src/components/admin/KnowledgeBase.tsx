import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Trash2, FileText, Upload } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type KnowledgeBase = Database["public"]["Tables"]["knowledge_base"]["Row"];
type TestType = Database["public"]["Enums"]["test_type"];
type AcademicTrack = Database["public"]["Enums"]["academic_track"];

export const KnowledgeBase = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeBase | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content_type: "text",
    content: "",
    related_topics: [] as string[],
    test_type: "قدرات" as TestType,
    is_active: true,
  });
  const [topicInput, setTopicInput] = useState("");

  const { data: knowledgeBase, isLoading } = useQuery({
    queryKey: ["knowledge-base"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_base")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as KnowledgeBase[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("knowledge_base")
        .insert([data]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
      toast({ title: "تم إضافة المحتوى بنجاح" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Error creating knowledge base:", error);
      toast({
        title: "خطأ في إضافة المحتوى",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const { error } = await supabase
        .from("knowledge_base")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
      toast({ title: "تم تحديث المحتوى بنجاح" });
      setIsDialogOpen(false);
      setEditingItem(null);
      resetForm();
    },
    onError: (error) => {
      console.error("Error updating knowledge base:", error);
      toast({
        title: "خطأ في تحديث المحتوى",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
      toast({ title: "تم حذف المحتوى بنجاح" });
    },
    onError: (error) => {
      console.error("Error deleting knowledge base:", error);
      toast({
        title: "خطأ في حذف المحتوى",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      content_type: "text",
      content: "",
      related_topics: [],
      test_type: "قدرات",
      track: "عام",
      is_active: true,
    });
    setTopicInput("");
  };

  const handleEdit = (item: KnowledgeBase) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      content_type: item.content_type,
      content: item.content || "",
      related_topics: item.related_topics || [],
      test_type: item.test_type || "قدرات",
      is_active: item.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addTopic = () => {
    if (topicInput.trim() && !formData.related_topics.includes(topicInput.trim())) {
      setFormData({
        ...formData,
        related_topics: [...formData.related_topics, topicInput.trim()],
      });
      setTopicInput("");
    }
  };

  const removeTopic = (topic: string) => {
    setFormData({
      ...formData,
      related_topics: formData.related_topics.filter(t => t !== topic),
    });
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">قاعدة المعرفة</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingItem(null); resetForm(); }}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة محتوى جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "تعديل المحتوى" : "إضافة محتوى جديد"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">العنوان</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="content_type">نوع المحتوى</Label>
                <Select
                  value={formData.content_type}
                  onValueChange={(value) => setFormData({ ...formData, content_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">نص</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="video">فيديو</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="content">المحتوى</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={10}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="test_type">نوع الاختبار</Label>
                  <Select
                    value={formData.test_type}
                    onValueChange={(value) => setFormData({ ...formData, test_type: value as TestType })}
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
                  <Label htmlFor="track">المسار</Label>
                  <Select
                    value={formData.track}
                    onValueChange={(value) => setFormData({ ...formData, track: value as AcademicTrack })}
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
                <Label htmlFor="topics">المواضيع المرتبطة</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    id="topics"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="أدخل موضوع..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                  />
                  <Button type="button" onClick={addTopic} variant="outline">
                    إضافة
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.related_topics.map((topic) => (
                    <span key={topic} className="px-3 py-1 bg-primary/10 rounded-full text-sm flex items-center gap-2">
                      {topic}
                      <button type="button" onClick={() => removeTopic(topic)} className="text-red-500 hover:text-red-700">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_active">تفعيل المحتوى</Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  )}
                  {editingItem ? "حفظ التعديلات" : "إضافة المحتوى"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {knowledgeBase?.map((item) => (
          <Card key={item.id} className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="px-2 py-1 bg-secondary/10 text-secondary-foreground rounded text-sm">
                    {item.content_type}
                  </span>
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                    {item.test_type}
                  </span>
                  {item.is_active && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">نشط</span>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                {item.content && (
                  <p className="text-muted-foreground text-sm mb-2 line-clamp-2">{item.content}</p>
                )}
                {item.related_topics && item.related_topics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.related_topics.map((topic) => (
                      <span key={topic} className="px-2 py-1 bg-muted rounded text-xs">
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm("هل أنت متأكد من حذف هذا المحتوى؟")) {
                      deleteMutation.mutate(item.id);
                    }
                  }}
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
