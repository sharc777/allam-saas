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
  const [filterTrack, setFilterTrack] = useState<"all" | "عام" | "علمي" | "نظري">("all");
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
    const matchesTrack = filterTrack === "all" || kb.track === filterTrack;
    const matchesSection = filterSection === "all" ||
                          kb.related_topics?.some((t: string) => 
                            (filterSection === "كمي" && t.includes("كمي")) ||
                            (filterSection === "لفظي" && t.includes("لفظي"))
                          );
    return matchesSearch && matchesType && matchesTrack && matchesSection;
  });

  // Statistics
  const stats = {
    total: knowledgeBase?.length || 0,
    qudurat: knowledgeBase?.filter(kb => kb.test_type === "قدرات").length || 0,
    tahseeli: knowledgeBase?.filter(kb => kb.test_type === "تحصيلي").length || 0,
    active: knowledgeBase?.filter(kb => kb.is_active).length || 0,
    byTrack: {
      general: knowledgeBase?.filter(kb => kb.track === "عام").length || 0,
      scientific: knowledgeBase?.filter(kb => kb.track === "علمي").length || 0,
      literary: knowledgeBase?.filter(kb => kb.track === "نظري").length || 0,
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
      {/* بانر توضيحي */}
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold mb-1">🧠 قاعدة المعرفة - عقل النظام الذكي</h4>
              <p className="text-sm text-muted-foreground mb-2">
                هذه هي المعلومات التي يقرأها الذكاء الاصطناعي عند توليد الأسئلة في <code className="bg-muted px-1 rounded">generate-quiz</code>
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>✅ مُصنفة حسب الاختبار والمسار</span>
                <span>•</span>
                <span>✅ تُستخدم لإثراء السياق</span>
                <span>•</span>
                <span>✅ كلما زادت، تحسنت الأسئلة</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="tracks">حسب المسار</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">قدرات</p>
                    <p className="text-2xl font-bold">{stats.qudurat}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">تحصيلي</p>
                    <p className="text-2xl font-bold">{stats.tahseeli}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">نشط</p>
                    <p className="text-2xl font-bold">{stats.active}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="tracks" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">مسار عام</p>
                    <p className="text-2xl font-bold">{stats.byTrack.general}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">مسار علمي</p>
                    <p className="text-2xl font-bold">{stats.byTrack.scientific}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">مسار نظري</p>
                    <p className="text-2xl font-bold">{stats.byTrack.literary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Filters and Add Button */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2 flex-1 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
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
                  <SelectValue placeholder="نوع الاختبار" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأنواع</SelectItem>
                  <SelectItem value="قدرات">قدرات</SelectItem>
                  <SelectItem value="تحصيلي">تحصيلي</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterTrack} onValueChange={(v: any) => setFilterTrack(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="المسار" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المسارات</SelectItem>
                  <SelectItem value="عام">عام</SelectItem>
                  <SelectItem value="علمي">علمي</SelectItem>
                  <SelectItem value="نظري">نظري</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSection} onValueChange={(v: any) => setFilterSection(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="القسم" />
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
        </CardContent>
      </Card>

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