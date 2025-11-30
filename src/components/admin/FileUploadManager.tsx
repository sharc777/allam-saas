import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, Image, Table, Loader2, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TestType = Database["public"]["Enums"]["test_type"];
type AcademicTrack = Database["public"]["Enums"]["academic_track"];

export const FileUploadManager = () => {
  const [uploadType, setUploadType] = useState<"knowledge" | "questions">("knowledge");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [testType, setTestType] = useState<TestType>("قدرات");
  const [track, setTrack] = useState<AcademicTrack>("عام");

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

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold mb-2">📁 نظام رفع الملفات المتقدم</h3>
        <p className="text-sm text-muted-foreground">
          رفع ومعالجة الملفات تلقائياً وإضافتها للنظام الذكي
        </p>
      </div>

      {/* Target Selection */}
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

      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents">📄 مستندات</TabsTrigger>
          <TabsTrigger value="images">📷 صور OCR</TabsTrigger>
          <TabsTrigger value="ai">🤖 توليد بالذكاء الاصطناعي</TabsTrigger>
        </TabsList>

        {/* Documents Upload */}
        <TabsContent value="documents" className="space-y-4">
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

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg text-sm">
                <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  💡 كيف تعمل المعالجة؟
                </p>
                <ul className="text-blue-800 dark:text-blue-200 space-y-1 text-xs">
                  <li>• استخراج النص من الملف تلقائياً</li>
                  <li>• تقسيم المحتوى لمواضيع منطقية</li>
                  <li>• استخراج التصنيفات والكلمات المفتاحية</li>
                  <li>• إضافة لقاعدة المعرفة أو بنك الأسئلة</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OCR Upload */}
        <TabsContent value="images" className="space-y-4">
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

        {/* AI Generation */}
        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                توليد محتوى بالذكاء الاصطناعي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-semibold mb-2">قريباً جداً! 🚀</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  قريباً ستتمكن من توليد محتوى تعليمي كامل باستخدام الذكاء الاصطناعي
                  بدون تكرار وبجودة عالية
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
