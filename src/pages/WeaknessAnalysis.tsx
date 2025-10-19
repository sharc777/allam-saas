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
  Award
} from "lucide-react";
import AITutor from "@/components/AITutor";
import { useProfile } from "@/hooks/useProfile";
import { WeaknessNavigationBar } from "@/components/WeaknessNavigationBar";
import { BackToTopButton } from "@/components/BackToTopButton";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { CustomTestDialog, TestParams } from "@/components/CustomTestDialog";

const WeaknessAnalysis = () => {
  const [showAITutor, setShowAITutor] = useState(false);
  const [showCustomTestDialog, setShowCustomTestDialog] = useState(false);
  const [selectedWeaknessTopic, setSelectedWeaknessTopic] = useState("");
  const { data: profile } = useProfile();
  const navigate = useNavigate();

  // Section IDs for navigation - MUST be defined before early return
  const sectionIds = ["summary", "strengths", "critical", "moderate", "repeated", "recommendations"];
  const activeSection = useScrollSpy({ sectionIds, offset: 150 });

  const { data: weaknessData, isLoading } = useQuery({
    queryKey: ["weakness-analysis", profile?.test_type_preference],
    enabled: !!profile?.test_type_preference,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("analyze-weaknesses", {
        body: {
          userId: user.id,
          testType: profile?.test_type_preference || "قدرات",
        },
      });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
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

  const hasStrengths = weaknessData?.weaknesses?.improving?.length > 0;
  const hasCritical = weaknessData?.weaknesses?.critical?.length > 0;
  const hasModerate = weaknessData?.weaknesses?.moderate?.length > 0;

  // Calculate counts for navigation badges
  const counts = {
    strengths: weaknessData?.weaknesses?.improving?.length || 0,
    critical: weaknessData?.weaknesses?.critical?.length || 0,
    moderate: weaknessData?.weaknesses?.moderate?.length || 0,
    repeated: weaknessData?.repeatedMistakes?.length || 0,
  };

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
                      (weaknessData?.summary?.improvementRate || 0) > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {weaknessData?.summary?.improvementRate?.toFixed(1) || 0}%
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
                    <p className="text-2xl font-bold">{weaknessData?.summary?.recentPerformance?.toFixed(1) || 0}%</p>
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
                  {weaknessData.weaknesses.improving.map((strength: any, index: number) => (
                    <Badge 
                      key={index} 
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 text-base"
                    >
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                      {strength.topic}
                      <span className="mr-2 opacity-90">
                        ({strength.successRate}%)
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
