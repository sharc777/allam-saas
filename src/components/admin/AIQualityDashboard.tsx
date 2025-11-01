import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  BarChart3, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

export default function AIQualityDashboard() {
  const { toast } = useToast();
  const [selectedMode, setSelectedMode] = useState<'auto' | 'ai'>('auto');

  // Fetch recent questions for quality review
  const { data: recentQuestions, isLoading } = useQuery({
    queryKey: ['recent-generated-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generated_questions_log' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    }
  });

  // Quality scoring mutation
  const scoreMutation = useMutation({
    mutationFn: async (questions: any[]) => {
      const { data, error } = await supabase.functions.invoke('quality-score-questions', {
        body: { questions, mode: selectedMode }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: '✅ تم تقييم الجودة',
        description: `معدل الجودة: ${data.statistics.average_score.toFixed(1)}/5، معدل القبول: ${data.statistics.approval_rate.toFixed(0)}%`
      });
    }
  });

  // Fetch quality statistics
  const { data: qualityStats } = useQuery({
    queryKey: ['quality-statistics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_training_examples' as any)
        .select('quality_score')
        .not('quality_score', 'is', null);

      if (error) throw error;

      const scores = data.map((d: any) => d.quality_score);
      const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      const high = scores.filter((s: number) => s >= 4).length;
      const low = scores.filter((s: number) => s < 3).length;

      return {
        total: scores.length,
        average: avg,
        high_quality: high,
        low_quality: low,
        high_percentage: (high / scores.length) * 100,
        low_percentage: (low / scores.length) * 100
      };
    }
  });

  const handleScoreAll = () => {
    if (!recentQuestions) return;
    
    const questions = recentQuestions.map((log: any) => {
      const questionData = log.question_data;
      return {
        question: questionData.question,
        options: questionData.options,
        correctAnswer: questionData.correctAnswer,
        explanation: questionData.explanation,
        section: questionData.section || 'كمي',
        testType: 'قدرات',
        difficulty: questionData.difficulty || 'medium',
        topic: questionData.topic || ''
      };
    });

    scoreMutation.mutate(questions);
  };

  if (isLoading) {
    return <div className="p-8 text-center">جاري التحميل...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            نظام تقييم جودة الأسئلة
          </h1>
          <p className="text-muted-foreground mt-1">
            تقييم تلقائي وذكي لجودة الأسئلة المُولدة بالذكاء الاصطناعي
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={selectedMode === 'auto' ? 'default' : 'outline'}
            onClick={() => setSelectedMode('auto')}
          >
            🚀 تلقائي (سريع)
          </Button>
          <Button
            variant={selectedMode === 'ai' ? 'default' : 'outline'}
            onClick={() => setSelectedMode('ai')}
          >
            🤖 AI (دقيق)
          </Button>
        </div>
      </div>

      {/* Quality Overview */}
      {qualityStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                إجمالي الأسئلة المُقيّمة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{qualityStats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                متوسط الجودة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-3xl font-bold">
                  {qualityStats.average.toFixed(1)}
                </div>
                <Badge variant={qualityStats.average >= 4 ? 'default' : 'secondary'}>
                  / 5
                </Badge>
              </div>
              <Progress value={qualityStats.average * 20} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                جودة عالية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {qualityStats.high_quality}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {qualityStats.high_percentage.toFixed(0)}% من الإجمالي
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                تحتاج تحسين
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {qualityStats.low_quality}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {qualityStats.low_percentage.toFixed(0)}% من الإجمالي
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Panel */}
      <Card>
        <CardHeader>
          <CardTitle>تقييم الأسئلة الجديدة</CardTitle>
          <CardDescription>
            يوجد {recentQuestions?.length || 0} سؤال جديد غير مُقيّم
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={handleScoreAll}
              disabled={!recentQuestions || recentQuestions.length === 0 || scoreMutation.isPending}
              size="lg"
            >
              {scoreMutation.isPending ? (
                '⏳ جاري التقييم...'
              ) : (
                <>
                  <BarChart3 className="h-5 w-5 mr-2" />
                  تقييم جميع الأسئلة ({selectedMode === 'auto' ? 'سريع' : 'دقيق'})
                </>
              )}
            </Button>
            
            <div className="text-sm text-muted-foreground flex items-center">
              {selectedMode === 'auto' ? (
                '⚡ التقييم التلقائي يستخدم معايير برمجية سريعة'
              ) : (
                '🤖 تقييم AI يستخدم نماذج ذكاء اصطناعي متقدمة (أبطأ لكن أدق)'
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scoring Results */}
      {scoreMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle>نتائج التقييم</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="summary">
              <TabsList>
                <TabsTrigger value="summary">الملخص</TabsTrigger>
                <TabsTrigger value="details">التفاصيل</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="text-sm text-muted-foreground">معدل الجودة</div>
                    <div className="text-2xl font-bold">
                      {scoreMutation.data.statistics.average_score.toFixed(2)} / 5
                    </div>
                  </div>
                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="text-sm text-muted-foreground">معدل القبول</div>
                    <div className="text-2xl font-bold text-green-600">
                      {scoreMutation.data.statistics.approval_rate.toFixed(0)}%
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="details">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {scoreMutation.data.scored_questions.map((sq: any, idx: number) => (
                    <div key={idx} className="p-3 border rounded-lg flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={sq.approved ? 'default' : 'destructive'}>
                            {sq.approved ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          </Badge>
                          <span className="text-sm font-medium">
                            السؤال {idx + 1}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{sq.feedback}</p>
                      </div>
                      <div className="text-lg font-bold">
                        {sq.overall_score.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
