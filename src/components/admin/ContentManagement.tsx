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
import { Loader2, Plus, Edit, Trash2, FileUp } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type DailyContent = Database["public"]["Tables"]["daily_content"]["Row"];
type TestType = Database["public"]["Enums"]["test_type"];
type AcademicTrack = Database["public"]["Enums"]["academic_track"];

export const ContentManagement = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<DailyContent | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    day_number: 1,
    test_type: "قدرات" as TestType,
    track: "عام" as AcademicTrack,
    content_text: "",
    video_url: "",
    duration_minutes: 30,
    is_published: false,
  });

  const { data: contents, isLoading } = useQuery({
    queryKey: ["admin-daily-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_content")
        .select("*")
        .order("day_number", { ascending: true });

      if (error) throw error;
      return data as DailyContent[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("daily_content")
        .insert([data]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-daily-content"] });
      toast({ title: "تم إضافة المحتوى بنجاح" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Error creating content:", error);
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
        .from("daily_content")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-daily-content"] });
      toast({ title: "تم تحديث المحتوى بنجاح" });
      setIsDialogOpen(false);
      setEditingContent(null);
      resetForm();
    },
    onError: (error) => {
      console.error("Error updating content:", error);
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
        .from("daily_content")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-daily-content"] });
      toast({ title: "تم حذف المحتوى بنجاح" });
    },
    onError: (error) => {
      console.error("Error deleting content:", error);
      toast({
        title: "خطأ في حذف المحتوى",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = async (content: DailyContent) => {
    // التحقق من وجود نتائج اختبارات مرتبطة
    const { count } = await supabase
      .from('quiz_results')
      .select('*', { count: 'exact', head: true })
      .eq('daily_content_id', content.id);
    
    const relatedCount = count || 0;
    
    let confirmMessage = `هل أنت متأكد من حذف "${content.title}"؟`;
    if (relatedCount > 0) {
      confirmMessage = `⚠️ تحذير: يوجد ${relatedCount} نتيجة اختبار مرتبطة بهذا المحتوى.\n\nسيتم فصل هذه النتائج عن المحتوى (لن تُحذف).\n\nهل تريد المتابعة؟`;
    }
    
    if (confirm(confirmMessage)) {
      deleteMutation.mutate(content.id);
    }
  };

  const addToKnowledgeBaseMutation = useMutation({
    mutationFn: async (content: DailyContent) => {
      // استخراج المواضيع من المحتوى
      const relatedTopics = [];
      
      // إضافة التصنيف الأساسي
      if (content.test_type) relatedTopics.push(content.test_type);
      
      
      // استخراج المواضيع من أول 3 أسطر من المحتوى (إن وجدت)
      if (content.content_text) {
        const lines = content.content_text.split('\n').slice(0, 3);
        lines.forEach(line => {
          // البحث عن الكلمات المفتاحية
          if (line.includes('القسم الكمي') || line.includes('كمي')) relatedTopics.push('القسم الكمي');
          if (line.includes('القسم اللفظي') || line.includes('لفظي')) relatedTopics.push('القسم اللفظي');
          if (line.includes('الجبر')) relatedTopics.push('الجبر');
          if (line.includes('الهندسة')) relatedTopics.push('الهندسة');
          if (line.includes('الإحصاء')) relatedTopics.push('الإحصاء');
        });
      }

      // إزالة التكرار
      const uniqueTopics = [...new Set(relatedTopics)];

      const { error } = await supabase.from('knowledge_base').insert({
        title: content.title,
        content: content.content_text || content.description || '',
        content_type: 'lesson',
        test_type: content.test_type,
        related_topics: uniqueTopics,
        is_active: true,
        metadata: {
          source: 'daily_content',
          day_number: content.day_number,
          original_id: content.id
        }
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
      toast({
        title: "✅ تمت الإضافة بنجاح",
        description: "تم تحويل المحتوى إلى قاعدة معرفة يستخدمها الذكاء الاصطناعي"
      });
    },
    onError: (error) => {
      console.error('Error adding to knowledge base:', error);
      toast({
        title: "❌ خطأ",
        description: "فشل في إضافة المحتوى لقاعدة المعرفة",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      day_number: 1,
      test_type: "قدرات",
      track: "عام",
      content_text: "",
      video_url: "",
      duration_minutes: 30,
      is_published: false,
    });
  };

  const handleEdit = (content: DailyContent) => {
    setEditingContent(content);
    setFormData({
      title: content.title,
      description: content.description || "",
      day_number: content.day_number,
      test_type: content.test_type || "قدرات",
      track: "عام",
      content_text: content.content_text || "",
      video_url: content.video_url || "",
      duration_minutes: content.duration_minutes,
      is_published: content.is_published || false,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingContent) {
      updateMutation.mutate({ id: editingContent.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
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
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">إدارة المحتوى التعليمي</h2>
          <p className="text-sm text-muted-foreground mt-1">
            دروس وفيديوهات للطلاب (لا تُستخدم في توليد الأسئلة مباشرة)
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingContent(null); resetForm(); }}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة محتوى جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingContent ? "تعديل المحتوى" : "إضافة محتوى جديد"}</DialogTitle>
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
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="day_number">رقم اليوم</Label>
                  <Input
                    id="day_number"
                    type="number"
                    min="1"
                    value={formData.day_number}
                    onChange={(e) => setFormData({ ...formData, day_number: parseInt(e.target.value) })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="duration">المدة (دقيقة)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    required
                  />
                </div>
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
                <Label htmlFor="video_url">رابط الفيديو (اختياري)</Label>
                <Input
                  id="video_url"
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label htmlFor="content_text">المحتوى النصي</Label>
                <Textarea
                  id="content_text"
                  value={formData.content_text}
                  onChange={(e) => setFormData({ ...formData, content_text: e.target.value })}
                  rows={10}
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_published">نشر المحتوى</Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  )}
                  {editingContent ? "حفظ التعديلات" : "إضافة المحتوى"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {contents?.map((content) => (
          <Card key={content.id} className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">
                    اليوم {content.day_number}
                  </span>
                  <span className="px-2 py-1 bg-secondary/10 text-secondary-foreground rounded text-sm">
                    {content.test_type}
                  </span>
                  {content.is_published && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">منشور</span>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-2">{content.title}</h3>
                {content.description && (
                  <p className="text-muted-foreground mb-2">{content.description}</p>
                )}
                <p className="text-sm text-muted-foreground">المدة: {content.duration_minutes} دقيقة</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (confirm("تحويل هذا المحتوى لمعرفة الذكاء الاصطناعي؟")) {
                      addToKnowledgeBaseMutation.mutate(content);
                    }
                  }}
                  disabled={addToKnowledgeBaseMutation.isPending}
                  className="gap-2"
                  title="إضافة لقاعدة المعرفة"
                >
                  {addToKnowledgeBaseMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري التحويل...
                    </>
                  ) : (
                    <>
                      <FileUp className="h-4 w-4" />
                      تحويل لمعرفة الـ AI
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleEdit(content)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(content)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
