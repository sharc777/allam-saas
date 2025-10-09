import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Edit2, BookOpen, FileText, Filter, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Database } from "@/integrations/supabase/types";

type KnowledgeBase = Database["public"]["Tables"]["knowledge_base"]["Row"];
type TestType = Database["public"]["Enums"]["test_type"];
type AcademicTrack = Database["public"]["Enums"]["academic_track"];

type KBForm = {
  id?: string;
  title: string;
  content: string;
  content_type: string;
  test_type: TestType;
  track?: AcademicTrack;
  related_topics: string[];
  is_active: boolean;
};

export const KnowledgeBaseManager = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "قدرات" | "تحصيلي">("all");
  const [filterSection, setFilterSection] = useState<"all" | "كمي" | "لفظي">("all");
  const [form, setForm] = useState<KBForm>({
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
      return data as KnowledgeBase[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: KBForm) => {
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

  const handleEdit = (kb: KnowledgeBase) => {
    setForm({
      id: kb.id,
      title: kb.title,
      content: kb.content || "",
      content_type: kb.content_type,
      test_type: kb.test_type || "قدرات",
      track: kb.track || "عام",
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

  // Filtering logic
  const filteredKB = knowledgeBase?.filter((kb) => {
    const matchesSearch = kb.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         kb.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || kb.test_type === filterType;
    const matchesSection = filterSection === "all" ||
                          (filterSection === "كمي" && kb.content?.includes("كمي")) ||
                          (filterSection === "لفظي" && kb.content?.includes("لفظي"));
    return matchesSearch && matchesType && matchesSection;
  });

  // Statistics
  const stats = {
    total: knowledgeBase?.length || 0,
    quant: knowledgeBase?.filter(kb => kb.content?.includes("كمي")).length || 0,
    verbal: knowledgeBase?.filter(kb => kb.content?.includes("لفظي")).length || 0,
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
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المواضيع</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">مواضيع كمي</p>
                <p className="text-2xl font-bold">{stats.quant}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">مواضيع لفظي</p>
                <p className="text-2xl font-bold">{stats.verbal}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">مواضيع نشطة</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Add Button */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث في المواضيع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              <SelectItem value="قدرات">قدرات</SelectItem>
              <SelectItem value="تحصيلي">تحصيلي</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSection} onValueChange={(v: any) => setFilterSection(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأقسام</SelectItem>
              <SelectItem value="كمي">كمي</SelectItem>
              <SelectItem value="لفظي">لفظي</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة موضوع
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
                  placeholder="مثال: الجبر الأساسي"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
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

                <div>
                  <Label>نوع المحتوى</Label>
                  <Select
                    value={form.content_type}
                    onValueChange={(value) => setForm({ ...form, content_type: value })}
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
              </div>

              <div>
                <Label>المحتوى</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={10}
                  placeholder="أدخل محتوى الموضوع التعليمي..."
                />
              </div>

              <div>
                <Label>المواضيع المرتبطة</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="أضف موضوع"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTopic())}
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

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_active">تفعيل الموضوع</Label>
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
      </div>

      {/* Topics List */}
      <div className="grid gap-4">
        {filteredKB && filteredKB.length > 0 ? (
          filteredKB.map((kb) => (
            <Card key={kb.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{kb.title}</h3>
                      <Badge variant={kb.is_active ? "default" : "secondary"}>
                        {kb.is_active ? "نشط" : "غير نشط"}
                      </Badge>
                      <Badge variant="outline">{kb.test_type}</Badge>
                      {kb.track && <Badge variant="outline">{kb.track}</Badge>}
                      <Badge variant="secondary">{kb.content_type}</Badge>
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
                      onClick={() => {
                        if (confirm("هل أنت متأكد من حذف هذا الموضوع؟")) {
                          deleteMutation.mutate(kb.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد مواضيع مطابقة للبحث</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};