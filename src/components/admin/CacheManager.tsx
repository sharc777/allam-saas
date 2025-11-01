import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Database, RefreshCw, Zap, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Critical configurations for comprehensive generation
const CRITICAL_CONFIGS = [
  // قدرات - لفظي - مفقود
  { test_type: "قدرات", section: "لفظي", difficulty: "medium", track: "عام", count: 50 },
  { test_type: "قدرات", section: "لفظي", difficulty: "hard", track: "عام", count: 50 },
  
  // تحصيلي - رياضيات
  { test_type: "تحصيلي", section: "رياضيات", difficulty: "easy", track: "علمي", count: 50 },
  { test_type: "تحصيلي", section: "رياضيات", difficulty: "medium", track: "علمي", count: 50 },
  { test_type: "تحصيلي", section: "رياضيات", difficulty: "hard", track: "علمي", count: 30 },
  
  // تحصيلي - فيزياء
  { test_type: "تحصيلي", section: "فيزياء", difficulty: "easy", track: "علمي", count: 50 },
  { test_type: "تحصيلي", section: "فيزياء", difficulty: "medium", track: "علمي", count: 50 },
  { test_type: "تحصيلي", section: "فيزياء", difficulty: "hard", track: "علمي", count: 30 },
  
  // تحصيلي - كيمياء
  { test_type: "تحصيلي", section: "كيمياء", difficulty: "easy", track: "علمي", count: 50 },
  { test_type: "تحصيلي", section: "كيمياء", difficulty: "medium", track: "علمي", count: 50 },
  { test_type: "تحصيلي", section: "كيمياء", difficulty: "hard", track: "علمي", count: 30 },
  
  // تحصيلي - أحياء
  { test_type: "تحصيلي", section: "أحياء", difficulty: "easy", track: "علمي", count: 50 },
  { test_type: "تحصيلي", section: "أحياء", difficulty: "medium", track: "علمي", count: 50 },
  { test_type: "تحصيلي", section: "أحياء", difficulty: "hard", track: "علمي", count: 30 },
];

export function CacheManager() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [qualityStats, setQualityStats] = useState({
    excellent: 0,
    good: 0,
    acceptable: 0,
    low: 0,
    unknown: 0
  });
  const [generating, setGenerating] = useState(false);
  const [comprehensiveResults, setComprehensiveResults] = useState<Array<{ config: any; success: boolean; message: string }>>([]);
  const { toast } = useToast();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "غير مصرح",
          description: "يجب تسجيل الدخول أولاً",
          variant: "destructive"
        });
        return;
      }

      const token = session.access_token;
      const { data, error } = await supabase.functions.invoke('pre-generate-questions', {
        body: { action: 'stats' },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (error) {
        console.error('Stats error:', error);
        throw error;
      }
      setStats(data.stats || {});
      setQualityStats(data.qualityStats || {
        excellent: 0,
        good: 0,
        acceptable: 0,
        low: 0,
        unknown: 0
      });
      
      toast({
        title: "✅ تم تحديث الإحصائيات",
        description: `إجمالي الأسئلة المتاحة: ${Object.values(data.stats || {}).reduce((a: number, b: number) => a + b, 0)}`
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      
      let message = error?.message || "فشل جلب الإحصائيات";
      if (error?.context?.status === 429) {
        message = "تم تجاوز حد الطلبات. يرجى المحاولة لاحقاً.";
      } else if (error?.context?.status === 402) {
        message = "يرجى إضافة رصيد إلى Lovable AI من إعدادات المشروع.";
      }
      
      const details =
        (error?.context?.status ? `[${error.context.status}]` : '') +
        (error?.context?.body ? ` ${typeof error.context.body === 'string' ? error.context.body : JSON.stringify(error.context.body)}` : '');
      
      toast({
        title: "خطأ",
        description: `${message}${details ? " | " + details : ""}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateQuestions = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "غير مصرح",
          description: "يجب تسجيل الدخول أولاً",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "⏳ جاري التوليد السريع...",
        description: "توليد أسئلة قدرات (160 سؤال تقريباً)"
      });

      const { data, error } = await supabase.functions.invoke('pre-generate-questions', {
        body: { action: 'generate' },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) {
        console.error('Generate error:', error);
        throw error;
      }

      const totalGenerated = data.results?.reduce((sum: number, r: any) => sum + (r.cached || 0), 0) || 0;
      
      setStats(data.stats || {});
      setQualityStats(data.qualityStats || {
        excellent: 0,
        good: 0,
        acceptable: 0,
        low: 0,
        unknown: 0
      });
      
      toast({
        title: "✅ تم التوليد بنجاح",
        description: `تم توليد وحفظ ${totalGenerated} سؤال في الذاكرة المؤقتة`
      });
    } catch (error: any) {
      console.error('Error generating questions:', error);
      
      let message = error?.message || "فشل توليد الأسئلة";
      if (error?.context?.status === 429) {
        message = "تم تجاوز حد الطلبات. يرجى المحاولة لاحقاً.";
      } else if (error?.context?.status === 402) {
        message = "يرجى إضافة رصيد إلى Lovable AI من إعدادات المشروع.";
      }
      
      const details =
        (error?.context?.status ? `[${error.context.status}]` : '') +
        (error?.context?.body ? ` ${typeof error.context.body === 'string' ? error.context.body : JSON.stringify(error.context.body)}` : '');
      
      toast({
        title: "خطأ",
        description: `${message}${details ? " | " + details : ""}`,
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateComprehensive = async () => {
    try {
      setGenerating(true);
      setComprehensiveResults([]);
      
      toast({
        title: "🚀 بدء التوليد الشامل",
        description: `سيتم إنشاء ${CRITICAL_CONFIGS.length} مجموعة (620 سؤال تقريباً)`,
      });

      const generationResults: Array<{ config: any; success: boolean; message: string }> = [];

      // Process configurations one by one to avoid rate limits
      for (const config of CRITICAL_CONFIGS) {
        try {
          console.log(`Generating for:`, config);
          
          const { data, error } = await supabase.functions.invoke('pre-generate-questions', {
            body: {
              action: 'generate',
              configs: [config]
            }
          });

          if (error) {
            if (error.message?.includes('429')) {
              generationResults.push({
                config,
                success: false,
                message: 'تجاوز الحد - يرجى الانتظار'
              });
              toast({
                title: "⏸️ توقف مؤقت",
                description: "تم تجاوز الحد. يرجى الانتظار دقيقة ثم المتابعة.",
                variant: "destructive",
              });
              break;
            } else if (error.message?.includes('402')) {
              generationResults.push({
                config,
                success: false,
                message: 'يرجى إضافة رصيد'
              });
              toast({
                title: "⚠️ رصيد غير كافٍ",
                description: "يرجى إضافة رصيد إلى حساب Lovable AI.",
                variant: "destructive",
              });
              break;
            }
            throw error;
          }

          generationResults.push({
            config,
            success: true,
            message: `تم إنشاء ${data?.cached_count || 0} سؤال`
          });

          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (err: any) {
          console.error('Error generating questions:', err);
          generationResults.push({
            config,
            success: false,
            message: err.message || 'خطأ'
          });
        }
      }

      setComprehensiveResults(generationResults);

      const successCount = generationResults.filter(r => r.success).length;
      
      toast({
        title: successCount === CRITICAL_CONFIGS.length ? "✅ تم بنجاح!" : "⚠️ اكتمل جزئياً",
        description: `تم إنشاء ${successCount} من ${CRITICAL_CONFIGS.length} مجموعة`,
        variant: successCount === CRITICAL_CONFIGS.length ? "default" : "destructive",
      });

      // Refresh stats
      await fetchStats();

    } catch (error: any) {
      console.error('Comprehensive generation error:', error);
      toast({
        title: "❌ خطأ",
        description: error.message || "فشل التوليد الشامل",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const cleanCache = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const { error } = await supabase.functions.invoke('pre-generate-questions', {
        body: { action: 'clean' },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) {
        console.error('Clean error:', error);
        throw error;
      }
      
      toast({
        title: "✅ تم التنظيف",
        description: "تم إلغاء الحجوزات المنتهية"
      });
      
      await fetchStats();
    } catch (error: any) {
      console.error('Error cleaning cache:', error);
      const details =
        (error?.context?.status ? `status ${error.context.status}` : '') +
        (error?.context?.body ? ` | ${typeof error.context.body === 'string' ? error.context.body : JSON.stringify(error.context.body)}` : '');
      toast({
        title: "خطأ",
        description: `${error?.message || "فشل تنظيف الذاكرة"}${details ? " | " + details : ""}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const totalQuestions = Object.values(stats).reduce((sum: number, count: number) => sum + count, 0);
  const targetPerCategory = 30;
  const categories = ['قدرات_كمي_easy_عام', 'قدرات_كمي_medium_عام', 'قدرات_كمي_hard_عام', 
                      'قدرات_لفظي_easy_عام', 'قدرات_لفظي_medium_عام', 'قدرات_لفظي_hard_عام'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              إدارة ذاكرة الأسئلة المؤقتة
            </CardTitle>
            <CardDescription>
              نظام التوليد المسبق للأسئلة (تسريع 90%)
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-lg">
            <Database className="h-4 w-4 mr-2" />
            {totalQuestions} سؤال
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs defaultValue="quick" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quick">توليد سريع</TabsTrigger>
            <TabsTrigger value="comprehensive">توليد شامل</TabsTrigger>
          </TabsList>

          {/* Quick Generation Tab */}
          <TabsContent value="quick" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                توليد سريع لأسئلة قدرات فقط (كمي + لفظي) - حوالي 160 سؤال
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button 
                onClick={generateQuestions} 
                disabled={generating}
                className="flex-1"
              >
                {generating ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري التوليد...
                  </>
                ) : (
                  <>
                    <Zap className="ml-2 h-4 w-4" />
                    توليد سريع
                  </>
                )}
              </Button>
              
              <Button 
                onClick={fetchStats} 
                disabled={loading}
                variant="outline"
              >
                {loading ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="ml-2 h-4 w-4" />
                )}
                تحديث
              </Button>
              
              <Button 
                onClick={cleanCache}
                disabled={loading}
                variant="outline"
              >
                تنظيف
              </Button>
            </div>
          </TabsContent>

          {/* Comprehensive Generation Tab */}
          <TabsContent value="comprehensive" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                توليد شامل يغطي جميع الفئات الحرجة - حوالي {CRITICAL_CONFIGS.reduce((sum, c) => sum + c.count, 0)} سؤال.
                قد تستغرق العملية عدة دقائق.
              </AlertDescription>
            </Alert>

            <Button
              onClick={generateComprehensive}
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الإنشاء الشامل...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 ml-2" />
                  ابدأ التوليد الشامل
                </>
              )}
            </Button>

            {comprehensiveResults.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <h4 className="font-semibold text-sm">النتائج:</h4>
                {comprehensiveResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 p-3 rounded-lg border ${
                      result.success ? 'bg-success/10 border-success' : 'bg-destructive/10 border-destructive'
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 text-sm">
                      <div className="font-medium">
                        {result.config.test_type} - {result.config.section} - {result.config.difficulty}
                      </div>
                      <div className="text-muted-foreground text-xs">{result.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Stats Grid */}
        {totalQuestions > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">إحصائيات التخزين المؤقت</h3>
              <Badge variant="secondary">
                <TrendingUp className="h-3 w-3 ml-1" />
                {Math.round((totalQuestions / (categories.length * targetPerCategory)) * 100)}%
              </Badge>
            </div>

            {/* Quality Distribution */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <Card className="bg-green-500/10 border-green-500/20">
                <CardContent className="pt-4 pb-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{qualityStats.excellent}</div>
                    <div className="text-xs text-muted-foreground">ممتاز (≥4.5)</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/10 border-blue-500/20">
                <CardContent className="pt-4 pb-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{qualityStats.good}</div>
                    <div className="text-xs text-muted-foreground">جيد (≥4)</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-yellow-500/10 border-yellow-500/20">
                <CardContent className="pt-4 pb-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{qualityStats.acceptable}</div>
                    <div className="text-xs text-muted-foreground">مقبول (≥3)</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-red-500/10 border-red-500/20">
                <CardContent className="pt-4 pb-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{qualityStats.low}</div>
                    <div className="text-xs text-muted-foreground">ضعيف (&lt;3)</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/10 border-muted/20">
                <CardContent className="pt-4 pb-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-muted-foreground">{qualityStats.unknown}</div>
                    <div className="text-xs text-muted-foreground">غير محدد</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              {categories.map((category) => {
                const count = stats[category] || 0;
                const percentage = Math.min((count / targetPerCategory) * 100, 100);
                const [testType, section, difficulty] = category.split('_');
                
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {testType} - {section} ({difficulty})
                      </span>
                      <span className="font-medium">
                        {count}/{targetPerCategory}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
          <p className="font-medium">💡 كيف يعمل النظام:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>يولد الأسئلة مسبقاً ويحفظها في قاعدة البيانات</li>
            <li>عند طلب اختبار، يتم السحب الفوري من الذاكرة (&lt; 500ms)</li>
            <li>توفير 80% من تكلفة استخدام AI</li>
            <li>يُنصح بالتوليد المسبق عندما ينخفض العدد عن 20 لكل فئة</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
