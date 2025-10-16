import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

const CRITICAL_CONFIGS = [
  // قدرات - لفظي - مفقود
  { testType: "قدرات", section: "لفظي", difficulty: "medium", track: "عام", count: 50 },
  { testType: "قدرات", section: "لفظي", difficulty: "hard", track: "عام", count: 50 },
  
  // تحصيلي - رياضيات
  { testType: "تحصيلي", section: "رياضيات", difficulty: "easy", track: "علمي", count: 50 },
  { testType: "تحصيلي", section: "رياضيات", difficulty: "medium", track: "علمي", count: 50 },
  { testType: "تحصيلي", section: "رياضيات", difficulty: "hard", track: "علمي", count: 30 },
  
  // تحصيلي - فيزياء
  { testType: "تحصيلي", section: "فيزياء", difficulty: "easy", track: "علمي", count: 50 },
  { testType: "تحصيلي", section: "فيزياء", difficulty: "medium", track: "علمي", count: 50 },
  { testType: "تحصيلي", section: "فيزياء", difficulty: "hard", track: "علمي", count: 30 },
  
  // تحصيلي - كيمياء
  { testType: "تحصيلي", section: "كيمياء", difficulty: "easy", track: "علمي", count: 50 },
  { testType: "تحصيلي", section: "كيمياء", difficulty: "medium", track: "علمي", count: 50 },
  { testType: "تحصيلي", section: "كيمياء", difficulty: "hard", track: "علمي", count: 30 },
  
  // تحصيلي - أحياء
  { testType: "تحصيلي", section: "أحياء", difficulty: "easy", track: "علمي", count: 50 },
  { testType: "تحصيلي", section: "أحياء", difficulty: "medium", track: "علمي", count: 50 },
  { testType: "تحصيلي", section: "أحياء", difficulty: "hard", track: "علمي", count: 30 },
];

export const QuestionCachePreFiller = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ config: any; success: boolean; message: string }>>([]);

  const handlePreFill = async () => {
    try {
      setLoading(true);
      setResults([]);
      
      toast({
        title: "🚀 بدء ملء الكاش",
        description: `سيتم إنشاء ${CRITICAL_CONFIGS.length} مجموعة من الأسئلة...`,
      });

      const generationResults: Array<{ config: any; success: boolean; message: string }> = [];

      // Process configurations one by one to avoid rate limits
      for (const config of CRITICAL_CONFIGS) {
        try {
          console.log(`Generating questions for:`, config);
          
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
              break; // Stop if rate limited
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

      setResults(generationResults);

      const successCount = generationResults.filter(r => r.success).length;
      
      toast({
        title: successCount === CRITICAL_CONFIGS.length ? "✅ تم بنجاح!" : "⚠️ اكتمل جزئياً",
        description: `تم إنشاء ${successCount} من ${CRITICAL_CONFIGS.length} مجموعة`,
        variant: successCount === CRITICAL_CONFIGS.length ? "default" : "destructive",
      });

    } catch (error: any) {
      console.error('Pre-fill error:', error);
      toast({
        title: "❌ خطأ",
        description: error.message || "فشل ملء الكاش",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          ملء كاش الأسئلة التلقائي
        </CardTitle>
        <CardDescription>
          إنشاء أسئلة مسبقة للفئات الحرجة (اللفظي والتحصيلي)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            سيتم إنشاء {CRITICAL_CONFIGS.reduce((sum, c) => sum + c.count, 0)} سؤال تقريباً.
            قد تستغرق العملية عدة دقائق.
          </AlertDescription>
        </Alert>

        <Button
          onClick={handlePreFill}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              جاري الإنشاء...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 ml-2" />
              ابدأ ملء الكاش
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h4 className="font-semibold text-sm">النتائج:</h4>
            {results.map((result, idx) => (
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
                    {result.config.testType} - {result.config.section} - {result.config.difficulty}
                  </div>
                  <div className="text-muted-foreground text-xs">{result.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
