import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Target,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  BarChart3,
  Award,
  Clock,
  LineChart
} from "lucide-react";
import AITutor from "@/components/AITutor";
import { useProfile } from "@/hooks/useProfile";
import { WeaknessNavigationBar } from "@/components/WeaknessNavigationBar";
import { BackToTopButton } from "@/components/BackToTopButton";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { CustomTestDialog, TestParams } from "@/components/CustomTestDialog";
import { usePerformanceAnalytics } from "@/hooks/usePerformanceAnalytics";
import { PerformanceLineChart } from "@/components/charts/PerformanceLineChart";
import { useWeaknessProfile } from "@/hooks/useWeaknessProfile";

const WeaknessAnalysis = () => {
  const [showAITutor, setShowAITutor] = useState(false);
  const [showCustomTestDialog, setShowCustomTestDialog] = useState(false);
  const [selectedWeaknessTopic, setSelectedWeaknessTopic] = useState("");
  const { data: profile } = useProfile();
  const navigate = useNavigate();

  // Section IDs for navigation - MUST be defined before early return
  const sectionIds = ["summary", "strengths", "critical", "moderate", "repeated", "recommendations"];
  const activeSection = useScrollSpy({ sectionIds, offset: 150 });

  const [isRepairingData, setIsRepairingData] = useState(false);

  const { data: weaknessData, isLoading, error: weaknessError, refetch } = useQuery({
    queryKey: ["weakness-analysis", profile?.id],
    enabled: !!profile?.id,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("analyze-weaknesses", {
        body: {
          userId: user.id,
          timeRange: 30,
        },
      });

      if (error) {
        console.error('Error fetching weakness analysis:', error);
        throw error;
      }
      return data;
    },
  });

  const handleRepairData = async () => {
    setIsRepairingData(true);
    try {
      const { data, error } = await supabase.functions.invoke("backfill-performance");
      
      if (error) throw error;
      
      console.log('✅ Backfill complete:', data);
      
      // Refetch analysis after repair
      await refetch();
    } catch (error) {
      console.error('❌ Backfill error:', error);
    } finally {
      setIsRepairingData(false);
    }
  };

  // Get performance analytics
  const { 
    getPerformanceTrends,
    calculateSuccessRateByTopic,
    calculateAverageTimeByDifficulty,
    isLoading: performanceLoading 
  } = usePerformanceAnalytics(profile?.id);

  // Get weakness profile with scores
  const { weaknessProfile } = useWeaknessProfile(profile?.id);

  if (isLoading || performanceLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (weaknessError) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-5 h-5" /> حدث خطأ أثناء جلب التحليل
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">يرجى المحاولة مرة أخرى. إذا استمر الخطأ، ابدأ تمرينًا قصيرًا ثم عد.</p>
                <div className="flex gap-3">
                  <Button onClick={() => refetch()} className="gradient-primary text-primary-foreground">إعادة المحاولة</Button>
                  <Button variant="outline" onClick={() => navigate('/daily-content')}>ابدأ تمرينًا الآن</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const hasStrengths = (weaknessData?.strengths?.length > 0) || (weaknessData?.weaknesses?.improving?.length > 0);
  const hasCritical = weaknessData?.weaknesses?.critical?.length > 0;
  const hasModerate = weaknessData?.weaknesses?.moderate?.length > 0;
  const isEmpty = weaknessData?.isEmpty || false;
  const isSparseData = weaknessData?.isSparseData || false;
  const sourceCounts = weaknessData?.sourceCounts || { performanceCount: 0, exercisesCount: 0, quizCount: 0 };
  const thresholds = weaknessData?.thresholds || { minAttemptsForStrength: 3, minSuccessRateForStrength: 80, minSuccessRateForPromising: 70 };
  const promisingTopics = weaknessData?.promisingTopics || [];

  // Calculate counts for navigation badges
  const counts = {
    strengths: (weaknessData?.strengths?.length || 0) + (weaknessData?.weaknesses?.improving?.length || 0),
    critical: weaknessData?.weaknesses?.critical?.length || 0,
    moderate: weaknessData?.weaknesses?.moderate?.length || 0,
    repeated: weaknessData?.repeatedMistakes?.length || 0,
  };

  // Show empty state if no data
  if (isEmpty || (weaknessData && !hasStrengths && !hasCritical && !hasModerate)) {
    const totalSources = sourceCounts.performanceCount + sourceCounts.exercisesCount + sourceCounts.quizCount;
    const shouldShowRepair = totalSources > 0 && isSparseData;
    
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2 gradient-text">تحليل نقاط القوة والضعف</h1>
              <p className="text-muted-foreground text-lg">
                تحليل شامل لأدائك وتحديد المجالات التي تحتاج تركيزاً
              </p>
            </div>

            {/* Data Source Badges */}
            <Card className="mb-4">
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-3 items-center">
                  <span className="text-sm font-medium">مصادر البيانات:</span>
                  <Badge variant="secondary">
                    📊 سجل الأداء: {sourceCounts.performanceCount}
                  </Badge>
                  <Badge variant="secondary">
                    ✏️ التمارين: {sourceCounts.exercisesCount}
                  </Badge>
                  <Badge variant="secondary">
                    📝 الاختبارات: {sourceCounts.quizCount}
                  </Badge>
                  <Badge variant="outline" className="mr-auto">
                    المطلوب للقوة: {thresholds.minAttemptsForStrength} محاولات و {thresholds.minSuccessRateForStrength}% نجاح
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="text-center py-16">
                <AlertCircle className="w-20 h-20 mx-auto mb-6 text-muted-foreground opacity-50" />
                <h2 className="text-2xl font-bold mb-3">
                  {isSparseData ? "بيانات غير كافية للتحليل الدقيق" : "لا توجد بيانات"}
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {isSparseData 
                    ? `لديك ${totalSources} سجل، لكن نحتاج ${thresholds.minAttemptsForStrength} محاولات على الأقل لكل موضوع لتحليل دقيق`
                    : profile?.test_type_preference === "تحصيلي" 
                      ? "قم بإكمال بعض تمارين التحصيلي في المواد العلمية لنتمكن من تحليل نقاط قوتك وضعفك"
                      : "قم بإكمال بعض التمارين اليومية لنتمكن من تحليل نقاط قوتك وضعفك وتقديم توصيات مخصصة"
                  }
                </p>
                
                {/* Instructional card */}
                <Card className="max-w-md mx-auto mb-6 bg-muted/30">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-3 flex items-center justify-center gap-2">
                      <Target className="w-4 h-4" />
                      كيف تحصل على تحليل دقيق؟
                    </h3>
                    <ul className="text-sm text-right space-y-2 text-muted-foreground">
                      <li>✓ حل {thresholds.minAttemptsForStrength} أسئلة على الأقل في كل موضوع</li>
                      <li>✓ تحقيق نسبة نجاح {thresholds.minSuccessRateForStrength}% أو أكثر للقوة</li>
                      <li>✓ نسبة {thresholds.minSuccessRateForPromising}% تظهرك كـ "قوة واعدة"</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {shouldShowRepair && (
                    <Button 
                      onClick={handleRepairData}
                      disabled={isRepairingData}
                      size="lg"
                      variant="secondary"
                    >
                      {isRepairingData ? (
                        <>
                          <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                          جاري إصلاح التحليل...
                        </>
                      ) : (
                        <>
                          🔧 إصلاح التحليل
                        </>
                      )}
                    </Button>
                  )}
                  <Button 
                    onClick={() => navigate('/daily-content')}
                    size="lg"
                    className="gradient-primary text-primary-foreground"
                  >
                    <Target className="w-5 h-5 ml-2" />
                    ابدأ التدريب الآن
                  </Button>
                  <Button 
                    onClick={() => navigate('/dashboard')}
                    size="lg"
                    variant="outline"
                  >
                    العودة للوحة التحكم
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 gradient-text">تحليل نقاط القوة والضعف</h1>
            <p className="text-muted-foreground text-lg">
              تحليل شامل لأدائك وتحديد المجالات التي تحتاج تركيزاً
            </p>
          </div>

          {/* Diagnostic Source Counts */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-sm font-medium">مصادر البيانات:</span>
                <Badge variant="secondary">
                  📊 سجل الأداء: {sourceCounts.performanceCount}
                </Badge>
                <Badge variant="secondary">
                  ✏️ التمارين: {sourceCounts.exercisesCount}
                </Badge>
                <Badge variant="secondary">
                  📝 الاختبارات: {sourceCounts.quizCount}
                </Badge>
                <Badge variant="outline" className="mr-auto">
                  للقوة: {thresholds.minAttemptsForStrength}+ محاولات • {thresholds.minSuccessRateForStrength}%+ نجاح
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Bar */}
          <WeaknessNavigationBar activeSection={activeSection} counts={counts} />

          {/* Summary Stats */}
          <div id="summary" className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي التمارين</p>
                    <p className="text-2xl font-bold">{weaknessData?.summary?.totalExercises || 0}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي الأخطاء</p>
                    <p className="text-2xl font-bold">{weaknessData?.summary?.totalMistakes || 0}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">معدل التحسن</p>
                    <p className={`text-2xl font-bold ${
                      (Number(weaknessData?.summary?.improvementRate) || 0) > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {Number(weaknessData?.summary?.improvementRate || 0).toFixed(1)}%
                    </p>
                  </div>
                  {(weaknessData?.summary?.improvementRate || 0) > 0 ? (
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  ) : (
                    <TrendingDown className="w-8 h-8 text-red-600" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">الأداء الأخير</p>
                    <p className="text-2xl font-bold">{Number(weaknessData?.summary?.recentPerformance || 0).toFixed(1)}%</p>
                  </div>
                  <Award className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Strengths Section */}
          {hasStrengths && (
            <Card id="strengths" className="mb-8 border-green-500/30">
              <CardHeader className="bg-green-500/10">
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="w-6 h-6" />
                  نقاط القوة - استمر بالتميز! 🎉
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-3">
                  {/* Strengths from quiz results */}
                  {weaknessData?.strengths?.map((strength: string, index: number) => (
                    <Badge 
                      key={`quiz-${index}`} 
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 text-base"
                    >
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                      {strength}
                    </Badge>
                  ))}
                  {/* Improving weaknesses as strengths */}
                  {weaknessData?.weaknesses?.improving?.map((strength: any, index: number) => (
                    <Badge 
                      key={`improving-${index}`} 
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 text-base"
                    >
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                      {strength.topic}
                      <span className="mr-2 opacity-90">
                        ({Number(strength.successRate || 0).toFixed(1)}%)
                      </span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Promising Topics Section */}
          {promisingTopics.length > 0 && (
            <Card id="promising" className="mb-8 border-yellow-500/30">
              <CardHeader className="bg-yellow-500/10">
                <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                  <TrendingUp className="w-6 h-6" />
                  نقاط قوة واعدة - على وشك التميز! ⭐
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-4">
                  مواضيع تظهر أداءً جيداً ({thresholds.minSuccessRateForPromising}%+) لكن تحتاج المزيد من التدريب للوصول للتميز
                </p>
                <div className="flex flex-wrap gap-3">
                  {promisingTopics.map((topic: any, index: number) => (
                    <Badge 
                      key={index} 
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 text-base"
                    >
                      <TrendingUp className="w-4 h-4 ml-2" />
                      {topic.topic}
                      <span className="mr-2 opacity-90">
                        ({Number(topic.successRate || 0).toFixed(1)}% • {topic.attempts} محاولة)
                      </span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Critical Weaknesses */}
          {hasCritical && (
            <Card id="critical" className="mb-8 border-red-600/50">
              <CardHeader className="bg-red-500/10">
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertCircle className="w-6 h-6" />
                  نقاط ضعف حرجة - تحتاج اهتماماً فورياً! 🎯
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {weaknessData.weaknesses.critical.map((weakness: any, index: number) => (
                    <div 
                      key={index}
                      className="p-4 rounded-lg bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-red-700 dark:text-red-400 mb-1">
                            {weakness.topic}
                          </h4>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>عدد الأخطاء: {weakness.errorCount}</span>
                            <span>نسبة النجاح: {weakness.successRate}%</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="destructive" className="bg-red-600">
                            حرج
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                            onClick={() => {
                              setSelectedWeaknessTopic(weakness.topic);
                              setShowCustomTestDialog(true);
                            }}
                          >
                            🎯 اختبار مخصص
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Moderate Weaknesses */}
          {hasModerate && (
            <Card id="moderate" className="mb-8 border-orange-500/30">
              <CardHeader className="bg-orange-500/10">
                <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <AlertTriangle className="w-6 h-6" />
                  نقاط ضعف متوسطة - قابلة للتحسين 💪
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {weaknessData.weaknesses.moderate.map((weakness: any, index: number) => (
                    <div 
                      key={index}
                      className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20 hover:bg-orange-500/10 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-orange-700 dark:text-orange-400 mb-1">
                            {weakness.topic}
                          </h4>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>عدد الأخطاء: {weakness.errorCount}</span>
                            <span>نسبة النجاح: {weakness.successRate}%</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge className="bg-orange-500 text-white">
                            متوسط
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                            onClick={() => {
                              setSelectedWeaknessTopic(weakness.topic);
                              setShowCustomTestDialog(true);
                            }}
                          >
                            🎯 اختبار مخصص
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Trends */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="w-6 h-6" />
                تطور الأداء - آخر 7 أيام
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceLineChart 
                data={getPerformanceTrends('day').slice(-7).map(trend => ({
                  date: new Date(trend.date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
                  score: trend.successRate,
                  time: trend.avgTime
                }))}
              />
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => navigate('/performance-analytics')}
                >
                  <LineChart className="w-4 h-4 ml-2" />
                  عرض التحليل الكامل
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Topics Performance with Time */}
          {calculateSuccessRateByTopic().length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-6 h-6" />
                  الأداء والوقت حسب الموضوع
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {calculateSuccessRateByTopic().slice(0, 10).map((topic, index) => {
                    const weaknessScore = weaknessProfile?.find(
                      w => w.topic === topic.topic
                    )?.weakness_score || 0;
                    
                    return (
                      <div key={index} className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-bold">{topic.topic}</h4>
                            <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                              <span>نسبة النجاح: {topic.successRate.toFixed(1)}%</span>
                              <span>متوسط الوقت: {topic.avgTime.toFixed(1)} دقيقة</span>
                              <span>المحاولات: {topic.totalAttempts}</span>
                            </div>
                          </div>
                          {weaknessScore > 0 && (
                            <Badge 
                              variant={weaknessScore > 7 ? "destructive" : weaknessScore > 4 ? "default" : "secondary"}
                              className="ml-2"
                            >
                              نقاط ضعف: {weaknessScore}
                            </Badge>
                          )}
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                            style={{ width: `${topic.successRate}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Repeated Mistakes */}
          {weaknessData?.repeatedMistakes?.length > 0 && (
            <Card id="repeated" className="mb-8 border-purple-500/30">
              <CardHeader className="bg-purple-500/10">
                <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                  <Target className="w-6 h-6" />
                  الأخطاء المتكررة
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {weaknessData.repeatedMistakes.slice(0, 5).map((mistake: any, index: number) => (
                    <div key={index} className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
                      <div className="mb-3">
                        <h4 className="font-bold text-lg mb-1">{mistake.topic}</h4>
                        <p className="text-sm text-muted-foreground">تكرر {mistake.errorCount} مرة</p>
                      </div>
                      
                      {mistake.commonMistakes?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm font-semibold mb-2">الأخطاء الشائعة:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {mistake.commonMistakes.map((cm: string, i: number) => (
                              <li key={i}>{cm}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {mistake.examples?.[0] && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm">
                          <p className="font-semibold mb-1">مثال:</p>
                          <p className="mb-2 text-muted-foreground">{mistake.examples[0].question}</p>
                          <div className="flex gap-4">
                            <span className="text-red-600">أجبت: {mistake.examples[0].wrongAnswer}</span>
                            <span className="text-green-600">الصحيح: {mistake.examples[0].correctAnswer}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {weaknessData?.recommendations?.length > 0 && (
            <Card id="recommendations" className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-6 h-6" />
                  توصيات للتحسين
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {weaknessData.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <p className="flex-1 text-foreground/90">{rec}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* AI Tutor CTA */}
          <Card className="gradient-primary text-primary-foreground">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold mb-2">جاهز للتحسين؟</h3>
                  <p className="text-primary-foreground/90">
                    المدرس الذكي جاهز لمساعدتك في التركيز على نقاط ضعفك وتحسين أدائك
                  </p>
                </div>
                <Button 
                  size="lg"
                  variant="secondary"
                  onClick={() => setShowAITutor(true)}
                  className="flex-shrink-0"
                >
                  <Brain className="w-5 h-5 ml-2" />
                  ابدأ مع المدرس الذكي
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showAITutor && (
        <AITutor
          onClose={() => setShowAITutor(false)}
          mode="general"
        />
      )}

      {showCustomTestDialog && (
        <CustomTestDialog
          open={showCustomTestDialog}
          onClose={() => {
            setShowCustomTestDialog(false);
            setSelectedWeaknessTopic("");
          }}
          onCreateTest={(params: TestParams) => {
            setShowCustomTestDialog(false);
            navigate("/custom-test", { 
              state: params
            });
          }}
          initialTopic={selectedWeaknessTopic}
        />
      )}

      <BackToTopButton />
    </div>
  );
};

export default WeaknessAnalysis;
