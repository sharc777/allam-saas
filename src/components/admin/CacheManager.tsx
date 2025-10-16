import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Database, RefreshCw, Zap, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export function CacheManager() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [generating, setGenerating] = useState(false);
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
      
      toast({
        title: "✅ تم تحديث الإحصائيات",
        description: `إجمالي الأسئلة المتاحة: ${Object.values(data.stats || {}).reduce((a: number, b: number) => a + b, 0)}`
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      const details =
        (error?.context?.status ? `status ${error.context.status}` : '') +
        (error?.context?.body ? ` | ${typeof error.context.body === 'string' ? error.context.body : JSON.stringify(error.context.body)}` : '');
      toast({
        title: "خطأ",
        description: `${error?.message || "فشل جلب الإحصائيات"}${details ? " | " + details : ""}`,
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
        title: "⏳ جاري التوليد...",
        description: "هذا قد يستغرق عدة دقائق"
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
      
      toast({
        title: "✅ تم التوليد بنجاح",
        description: `تم توليد وحفظ ${totalGenerated} سؤال في الذاكرة المؤقتة`
      });
    } catch (error: any) {
      console.error('Error generating questions:', error);
      const details =
        (error?.context?.status ? `status ${error.context.status}` : '') +
        (error?.context?.body ? ` | ${typeof error.context.body === 'string' ? error.context.body : JSON.stringify(error.context.body)}` : '');
      toast({
        title: "خطأ",
        description: `${error?.message || "فشل توليد الأسئلة"}${details ? " | " + details : ""}`,
        variant: "destructive"
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
        {/* Actions */}
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
                توليد أسئلة جديدة
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
