import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { 
  Upload, FileText, Image, Loader2, Sparkles, Play, 
  CheckCircle2, XCircle, Clock, RefreshCw 
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type TestType = Database["public"]["Enums"]["test_type"];
type AcademicTrack = Database["public"]["Enums"]["academic_track"];

export const UnifiedFileManager = () => {
  const queryClient = useQueryClient();
  const [uploadType, setUploadType] = useState<"knowledge" | "questions">("knowledge");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [testType, setTestType] = useState<TestType>("قدرات");
  const [track, setTrack] = useState<AcademicTrack>("عام");
  const [parsingId, setParsingId] = useState<string | null>(null);
  const [bulkParsing, setBulkParsing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  // Fetch all content for PDF parsing
  const { data: allContent, isLoading: contentLoading } = useQuery({
    queryKey: ["admin-all-content"],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_content")
        .select("*")
        .order("day_number", { ascending: true });
      return data || [];
    },
  });

  // Parse single content mutation
  const parseMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const content = allContent?.find(c => c.id === contentId);
      if (!content) throw new Error("Content not found");

      await supabase
        .from("daily_content")
        .update({ 
          parse_status: "parsing",
          last_parse_attempt: new Date().toISOString()
        })
        .eq("id", contentId);

      const { data, error } = await supabase.functions.invoke("parse-lesson-content", {
        body: {
          contentText: content.content_text,
          title: content.title,
        },
      });

      if (error) throw error;
      if (!data?.sections || data.sections.length === 0) {
        throw new Error("No sections returned");
      }

      await supabase
        .from("daily_content")
        .update({
          sections: data.sections,
          parse_status: "completed",
          parse_error: null,
        })
        .eq("id", contentId);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-content"] });
      toast({
        title: "✅ تم التحليل بنجاح",
        description: `تم إنشاء ${data.sections.length} أقسام`,
      });
      setParsingId(null);
    },
    onError: (error: any, contentId) => {
      supabase
        .from("daily_content")
        .update({
          parse_status: "failed",
          parse_error: error.message,
        })
        .eq("id", contentId);
      
      toast({
        title: "❌ فشل التحليل",
        description: error.message,
        variant: "destructive",
      });
      setParsingId(null);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadPDF = async () => {
    if (!selectedFile) {
      toast({
        title: "⚠️ لم يتم اختيار ملف",
        description: "يرجى اختيار ملف PDF أو Word أو Excel",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('test_type', testType);
      formData.append('track', track);

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('upload-knowledge-content', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "✅ تم الرفع بنجاح",
        description: "تم معالجة الملف وإضافته لقاعدة المعرفة"
      });
      
      setSelectedFile(null);
      if (document.getElementById('file-upload') as HTMLInputElement) {
        (document.getElementById('file-upload') as HTMLInputElement).value = '';
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "❌ خطأ في الرفع",
        description: error.message || "فشل في رفع الملف",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleOCRUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "⚠️ لم يتم اختيار صورة",
        description: "يرجى اختيار صورة لاستخراج النص منها",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('test_type', testType);
      formData.append('track', track);
      formData.append('target', uploadType);

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('ocr-content', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "✅ تم الاستخراج بنجاح",
        description: "تم استخراج النص من الصورة وإضافته للنظام"
      });
      
      setSelectedFile(null);
      if (document.getElementById('image-upload') as HTMLInputElement) {
        (document.getElementById('image-upload') as HTMLInputElement).value = '';
      }
    } catch (error: any) {
      console.error('OCR error:', error);
      toast({
        title: "❌ خطأ في الاستخراج",
        description: error.message || "فشل في استخراج النص من الصورة",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleBulkParse = async () => {
    const unparsedContent = allContent?.filter(
      (c) => c.content_text && (!c.sections || (c.sections as any).length === 0)
    );

    if (!unparsedContent || unparsedContent.length === 0) {
      toast({
        title: "لا يوجد محتوى للتحليل",
        description: "جميع الدروس محللة بالفعل",
      });
      return;
    }

    setBulkParsing(true);
    setBulkProgress({ current: 0, total: unparsedContent.length });

    for (let i = 0; i < unparsedContent.length; i++) {
      const content = unparsedContent[i];
      try {
        await parseMutation.mutateAsync(content.id);
        setBulkProgress({ current: i + 1, total: unparsedContent.length });
        
        if (i < unparsedContent.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`Failed to parse content ${content.id}:`, error);
      }
    }

    setBulkParsing(false);
    toast({
      title: "✅ اكتملت المعالجة الجماعية",
      description: `تم معالجة ${unparsedContent.length} درس`,
    });
  };

  const getStatusBadge = (content: any) => {
    const sections = content.sections as any;
    const hasSections = sections && Array.isArray(sections) && sections.length > 0;

    if (content.parse_status === "parsing" || parsingId === content.id) {
      return (
        <Badge className="bg-blue-500/20 text-blue-700">
          <Loader2 className="w-3 h-3 ml-1 animate-spin" />
          جاري التحليل
        </Badge>
      );
    }

    if (content.parse_status === "failed") {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 ml-1" />
          فشل
        </Badge>
      );
    }

    if (hasSections) {
      return (
        <Badge className="bg-green-500/20 text-green-700">
          <CheckCircle2 className="w-3 h-3 ml-1" />
          {sections.length} أقسام
        </Badge>
      );
    }

    if (!content.content_text) {
      return (
        <Badge variant="outline">
          <FileText className="w-3 h-3 ml-1" />
          لا يوجد محتوى
        </Badge>
      );
    }

    return (
      <Badge variant="outline">
        <Clock className="w-3 h-3 ml-1" />
        بانتظار التحليل
      </Badge>
    );
  };

  const unparsedCount = allContent?.filter(
    (c) => c.content_text && (!c.sections || (c.sections as any).length === 0)
  ).length || 0;

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h3 className="text-2xl font-bold mb-2">📁 نظام إدارة الملفات المتقدم</h3>
        <p className="text-sm text-muted-foreground">
          رفع ومعالجة وتحليل الملفات تلقائياً بالذكاء الاصطناعي
        </p>
      </div>

      <Tabs defaultValue="analyze" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analyze">🔍 تحليل PDF موجود</TabsTrigger>
          <TabsTrigger value="upload">📤 رفع ملفات جديدة</TabsTrigger>
          <TabsTrigger value="ocr">📷 OCR للصور</TabsTrigger>
        </TabsList>

        {/* Analyze Existing PDFs */}
        <TabsContent value="analyze" className="space-y-4">
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  تحليل المحتوى الموجود
                </CardTitle>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    {allContent?.length || 0} درس • {unparsedCount} بحاجة للتحليل
                  </p>
                  <Button
                    onClick={handleBulkParse}
                    disabled={bulkParsing || unparsedCount === 0}
                    className="gradient-primary"
                  >
                    {bulkParsing ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        معالجة...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 ml-2" />
                        معالجة الكل ({unparsedCount})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {bulkParsing && (
                <Card className="border-primary bg-primary/5">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>المعالجة الجماعية قيد التنفيذ...</span>
                        <span className="font-bold">
                          {bulkProgress.current} / {bulkProgress.total}
                        </span>
                      </div>
                      <Progress 
                        value={(bulkProgress.current / bulkProgress.total) * 100} 
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {contentLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {allContent?.map((content) => (
                    <div
                      key={content.id}
                      className="flex items-center justify-between p-4 border-2 rounded-lg hover:border-primary/30 transition-smooth"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-lg">
                            اليوم {content.day_number}: {content.title}
                          </h4>
                          {getStatusBadge(content)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{content.test_type}</span>
                          {content.track && <span>• {content.track}</span>}
                          {content.content_text && (
                            <span>• {content.content_text.length} حرف</span>
                          )}
                        </div>

                        {content.parse_error && (
                          <p className="text-xs text-destructive mt-2">
                            خطأ: {content.parse_error}
                          </p>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setParsingId(content.id);
                          parseMutation.mutate(content.id);
                        }}
                        disabled={
                          parsingId === content.id || 
                          !content.content_text ||
                          bulkParsing
                        }
                      >
                        {parsingId === content.id ? (
                          <>
                            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                            جاري التحليل
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 ml-2" />
                            تحليل
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upload New Documents */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <Label className="mb-2 block">الوجهة</Label>
              <Select value={uploadType} onValueChange={(v: any) => setUploadType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="knowledge">
                    🧠 قاعدة المعرفة (لتوليد الأسئلة)
                  </SelectItem>
                  <SelectItem value="questions">
                    🗄️ بنك الأسئلة (أسئلة جاهزة)
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                رفع ملفات PDF / Word / Excel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>نوع الاختبار</Label>
                  <Select value={testType} onValueChange={(v: any) => setTestType(v)}>
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
                  <Select value={track} onValueChange={(v: any) => setTrack(v)}>
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
                <Label htmlFor="file-upload">اختر الملف</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  الصيغ المدعومة: PDF, Word, Excel
                </p>
              </div>

              {selectedFile && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">الملف المحدد:</p>
                  <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}

              <Button
                onClick={handleUploadPDF}
                disabled={!selectedFile || isUploading}
                className="w-full"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 ml-2" />
                    رفع ومعالجة الملف
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OCR Upload */}
        <TabsContent value="ocr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                استخراج النص من الصور (OCR)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>نوع الاختبار</Label>
                  <Select value={testType} onValueChange={(v: any) => setTestType(v)}>
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
                  <Select value={track} onValueChange={(v: any) => setTrack(v)}>
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
                <Label htmlFor="image-upload">اختر الصورة</Label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  الصيغ المدعومة: JPG, PNG, WebP
                </p>
              </div>

              {selectedFile && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">الصورة المحددة:</p>
                  <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
                </div>
              )}

              <Button
                onClick={handleOCRUpload}
                disabled={!selectedFile || isUploading}
                className="w-full"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    جاري الاستخراج...
                  </>
                ) : (
                  <>
                    <Image className="h-4 w-4 ml-2" />
                    استخراج النص من الصورة
                  </>
                )}
              </Button>

              <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg text-sm">
                <p className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  🔍 تقنية OCR + الذكاء الاصطناعي
                </p>
                <ul className="text-purple-800 dark:text-purple-200 space-y-1 text-xs">
                  <li>• استخراج النص من الصورة بدقة عالية</li>
                  <li>• تحليل المحتوى بالذكاء الاصطناعي</li>
                  <li>• استخراج الأسئلة والخيارات تلقائياً</li>
                  <li>• تصنيف المحتوى حسب الموضوع</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};