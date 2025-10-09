import Navbar from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar, Target, Trophy, BookOpen, MessageSquare, TrendingUp, Flame, CheckCircle2, Lock, Sparkles, Brain, Loader2, Settings, ChevronDown, Zap } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AITutor from "@/components/AITutor";
import { useProfile } from "@/hooks/useProfile";
import { useDailyContent } from "@/hooks/useDailyContent";
import { useStudentProgress } from "@/hooks/useStudentProgress";
import { useAchievements } from "@/hooks/useAchievements";
import { useQuizStats } from "@/hooks/useQuizStats";
import { useAllProgress } from "@/hooks/useAllProgress";
import { useSubscription } from "@/hooks/useSubscription";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
const Dashboard = () => {
  // All hooks MUST be called before any conditional returns
  const {
    loading: authLoading
  } = useAuth(true);
  const [showAIChat, setShowAIChat] = useState(false);
  const navigate = useNavigate();

  // Fetch data from Supabase
  const {
    data: profile,
    isLoading: profileLoading
  } = useProfile();

  // Check subscription status
  const {
    subscribed,
    isLoading: subscriptionLoading
  } = useSubscription();

  // Redirect to test selection if no preferences set
  if (profile && !profile.test_type_preference) {
    navigate("/test-selection");
    return null;
  }

  // Redirect to initial assessment if not completed
  if (profile && !profile.initial_assessment_completed) {
    navigate("/initial-assessment");
    return null;
  }
  const currentDay = profile?.current_day || 1;
  const testType = profile?.test_type_preference || "قدرات";
  const track = profile?.track_preference || "عام";
  const {
    data: dailyContent,
    isLoading: contentLoading
  } = useDailyContent(currentDay, testType, track);
  const {
    data: todayProgress,
    isLoading: progressLoading
  } = useStudentProgress(currentDay);
  const {
    data: achievementsData,
    isLoading: achievementsLoading
  } = useAchievements();
  const {
    data: quizStats,
    isLoading: quizLoading
  } = useQuizStats();
  const {
    data: allProgressData,
    isLoading: allProgressLoading
  } = useAllProgress();

  // Fetch quiz result for today's lesson
  const {
    data: todayQuizResult
  } = useQuery({
    queryKey: ["today-quiz-result", dailyContent?.id, profile?.id],
    queryFn: async () => {
      if (!profile?.id || !dailyContent?.id) return null;
      const {
        data,
        error
      } = await supabase.from("quiz_results").select("*").eq("user_id", profile.id).eq("daily_content_id", dailyContent.id).order("created_at", {
        ascending: false
      }).limit(1).maybeSingle();
      if (error && error.code !== 'PGRST116') return null;
      return data;
    },
    enabled: !!profile?.id && !!dailyContent?.id
  });
  const totalDays = 30;
  const progress = currentDay / totalDays * 100;

  // Conditional return AFTER all hooks
  const isLoading = authLoading || profileLoading || contentLoading || progressLoading || achievementsLoading || quizLoading || allProgressLoading || subscriptionLoading;
  if (isLoading) {
    return <DashboardSkeleton />;
  }
  const MIN_PASSING_SCORE = 70;
  const hasPassedQuiz = todayQuizResult && (todayQuizResult.percentage || 0) >= MIN_PASSING_SCORE;

  // المرحلة 1: حالة الدرس على المستوى الكامل (وليس لكل subtopic)
  const lessonStatus = {
    completed: hasPassedQuiz,
    attempted: !!todayQuizResult,
    score: todayQuizResult?.percentage || 0,
    passed: hasPassedQuiz
  };

  // Process topics with sections structure (works for both قدرات and تحصيلي)
  const topicSections = dailyContent?.topics ? (() => {
    const topics = dailyContent.topics as any;
    if (topics.sections && Array.isArray(topics.sections)) {
      return topics.sections.map((section: any) => ({
        name: section.name,
        subtopics: (section.subtopics || []).map((subtopic: string, index: number) => ({
          id: `${section.name}-${index}`,
          title: subtopic,
          duration: `${dailyContent.duration_minutes || 30} دقيقة`
        }))
      }));
    }
    return [];
  })() : [];

  // Prepare achievements data
  const achievements = achievementsData?.slice(0, 3).map(item => ({
    id: item.id,
    name: (item.achievement as any)?.name_ar || (item.achievement as any)?.name || "إنجاز",
    icon: (item.achievement as any)?.icon || "🏆",
    unlocked: true
  })) || [];
  return <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Welcome Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  مرحباً بك في <span className="text-primary">لوحة التحكم</span>
                </h1>
                <p className="text-muted-foreground text-lg">
                  استمر في التقدم وحقق أهدافك اليومية
                </p>
              </div>
              <Card className="p-4">
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">نوع الاختبار</div>
                    <div className="font-bold">{testType}</div>
                    {testType === "تحصيلي" && <Badge variant="secondary" className="mt-1">
                        {track === "علمي" ? "المسار العلمي" : "المسار النظري"}
                      </Badge>}
                  </div>
                  <Button variant="outline" size="icon" onClick={() => navigate("/test-selection")}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </div>

            {/* Trial Period Banner */}
            {!subscribed && !profile?.subscription_active && (profile?.trial_days || 0) > 0 && <Card className={`bg-gradient-to-r border-primary/20 ${(profile?.trial_days || 0) <= 2 ? 'from-destructive/10 via-destructive/5 to-background animate-pulse' : 'from-primary/10 via-primary/5 to-background'}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${(profile?.trial_days || 0) <= 2 ? 'bg-destructive/20' : 'bg-primary/20'}`}>
                        <Sparkles className={`w-6 h-6 ${(profile?.trial_days || 0) <= 2 ? 'text-destructive' : 'text-primary'}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">
                          {(profile?.trial_days || 0) <= 2 ? '⚠️ تنبيه: الفترة التجريبية تقارب الانتهاء' : 'الفترة التجريبية المجانية'}
                        </h3>
                        <p className="text-muted-foreground">
                          لديك <span className={`font-bold ${(profile?.trial_days || 0) <= 2 ? 'text-destructive' : 'text-primary'}`}>{profile?.trial_days || 0} {(profile?.trial_days || 0) === 1 ? 'يوم واحد' : 'أيام'}</span> متبقية من الفترة التجريبية
                        </p>
                        {(profile?.trial_days || 0) <= 2 && <p className="text-sm text-destructive font-medium mt-1">
                            اشترك الآن لتستمر في الوصول للمحتوى بدون انقطاع!
                          </p>}
                      </div>
                    </div>
                    <Button variant={(profile?.trial_days || 0) <= 2 ? "default" : "outline"} onClick={() => navigate("/subscription")} className={(profile?.trial_days || 0) <= 2 ? 'animate-pulse' : ''}>
                      الاشتراك الآن
                    </Button>
                  </div>
                </CardContent>
              </Card>}

            {/* Subscription Active Banner */}
            {(subscribed || profile?.subscription_active) && <Card className="bg-gradient-to-r from-green-500/10 via-green-500/5 to-background border-green-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-green-500/20">
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">اشتراك نشط 🎉</h3>
                        <p className="text-muted-foreground">
                          لديك وصول كامل لجميع ميزات المنصة
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={async () => {
                  try {
                    const {
                      data,
                      error
                    } = await supabase.functions.invoke("customer-portal");
                    if (error) throw error;
                    if (data?.url) {
                      window.open(data.url, "_blank");
                    }
                  } catch (error) {
                    console.error("Error opening portal:", error);
                  }
                }}>
                      إدارة الاشتراك
                    </Button>
                  </div>
                </CardContent>
              </Card>}

            {/* Trial Expired Banner */}
            {!subscribed && !profile?.subscription_active && (profile?.trial_days || 0) === 0 && <Card className="bg-gradient-to-r from-destructive/10 via-destructive/5 to-background border-destructive/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-destructive/20">
                        <Lock className="w-6 h-6 text-destructive" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">انتهت الفترة التجريبية</h3>
                        <p className="text-muted-foreground">
                          اشترك الآن للحصول على وصول كامل لجميع الميزات
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => navigate("/subscription")}>
                      اشترك الآن
                    </Button>
                  </div>
                </CardContent>
              </Card>}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Progress Card */}
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-6 h-6 text-primary" />
                      تقدم التحدي
                    </CardTitle>
                    <Badge className="gradient-primary text-primary-foreground">
                      اليوم {currentDay} من {totalDays}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">التقدم الإجمالي</span>
                      <span className="font-bold text-primary">{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <div className="text-center p-3 rounded-lg bg-primary/10">
                      <div className="text-2xl font-bold text-primary">{allProgressData?.completedLessons || 0}</div>
                      <div className="text-sm text-muted-foreground">دروس مكتملة</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/10">
                      <div className="text-2xl font-bold text-secondary">{quizStats?.averageScore.toFixed(0) || 0}%</div>
                      <div className="text-sm text-muted-foreground">نسبة النجاح</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-success/10">
                      <div className="text-2xl font-bold text-success">{profile?.streak_days || 0}</div>
                      <div className="text-sm text-muted-foreground">أيام متتالية</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Today's Content */}
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-6 h-6 text-secondary" />
                      {dailyContent?.title || `محتوى اليوم - اليوم ${currentDay}`}
                    </CardTitle>
                    {/* المرحلة 1: عرض حالة الدرس على المستوى الكامل */}
                    {lessonStatus.completed ? <Badge className="bg-success text-white">
                        ✓ مكتمل - {lessonStatus.score.toFixed(0)}%
                      </Badge> : lessonStatus.attempted ? <Badge variant="destructive">
                        🔄 إعادة محاولة - {lessonStatus.score.toFixed(0)}%
                      </Badge> : <Badge variant="outline">
                        جديد
                      </Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dailyContent?.description && <p className="text-muted-foreground mb-4">{dailyContent.description}</p>}
                  
                  {/* المرحلة 3: رسالة توضيحية للدرس الفاشل */}
                  {lessonStatus.attempted && !lessonStatus.passed && <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg mb-4">
                      <p className="text-sm text-destructive font-medium">
                        📊 نتيجتك: {lessonStatus.score.toFixed(0)}% - تحتاج {MIN_PASSING_SCORE}%+ للنجاح
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        راجع المحتوى وحاول مرة أخرى لتحقيق نتيجة أفضل
                      </p>
                    </div>}
                  
                  {topicSections.length > 0 ? <Accordion type="multiple" className="space-y-2" defaultValue={topicSections.map((_, i) => `section-${i}`)}>
                      {topicSections.map((section, sectionIndex) => <AccordionItem key={`section-${sectionIndex}`} value={`section-${sectionIndex}`} className="border-2 rounded-lg overflow-hidden">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-primary/5">
                            <div className="flex items-center gap-3 text-right w-full">
                              <div className={`w-2 h-2 rounded-full ${testType === "قدرات" ? section.name === "لفظي" || section.name === "القسم اللفظي" ? "bg-primary" : "bg-secondary" : "bg-accent"}`} />
                              <span className="font-bold text-lg">{section.name}</span>
                              <Badge variant="secondary" className="mr-auto">
                                {section.subtopics.length} مواضيع
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-2 pb-2">
                            <div className="space-y-2">
                              {section.subtopics.map(topic => <div key={topic.id} className="p-3 mx-2 rounded-lg border transition-smooth bg-card border-border hover:border-primary/30">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <BookOpen className="w-5 h-5 text-primary flex-shrink-0" />
                                      <div>
                                        <h4 className="font-medium text-sm">{topic.title}</h4>
                                        <p className="text-xs text-muted-foreground">{topic.duration}</p>
                                      </div>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => {
                              navigate(`/lesson/${dailyContent?.day_number}/${topic.id || '1'}`);
                            }}>
                                      عرض
                                    </Button>
                                  </div>
                                </div>)}
                            </div>
                          </AccordionContent>
                        </AccordionItem>)}
                    </Accordion> : <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>لا يوجد محتوى متاح لهذا اليوم</p>
                    </div>}
                </CardContent>
              </Card>

              {/* Quizzes Section */}
              <Card className="border-2 border-secondary/30">
                
                
              </Card>

              {/* AI Assistant Card */}
              <Card className="border-2 border-primary/30 shadow-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-6 h-6 text-primary" />
                    المدرس الذكي
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    مدرسك الشخصي متاح الآن للإجابة على أسئلتك وشرح المفاهيم الصعبة بطريقة مبسطة
                  </p>
                  <Button className="w-full gradient-primary text-primary-foreground shadow-elegant hover:shadow-glow" onClick={() => setShowAIChat(true)}>
                    <MessageSquare className="ml-2 w-5 h-5" />
                    تحدث مع المدرس الذكي
                  </Button>
                </CardContent>
              </Card>

              {/* Comprehensive Content Card */}
              <Card className="border-2 border-accent/30">
                
                
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Streak Card */}
              <Card className="border-2 gradient-secondary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="w-6 h-6 text-secondary" />
                    سلسلة الإنجازات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-2">
                    <div className="text-6xl font-bold text-secondary">🔥</div>
                    <div className="text-4xl font-bold">{profile?.streak_days || 0}</div>
                    <p className="text-sm text-muted-foreground">أيام متتالية من التعلم!</p>
                    <p className="text-xs text-muted-foreground pt-2">
                      استمر لتحافظ على سلسلتك
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Achievements */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-primary" />
                    الإنجازات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {achievements.length > 0 ? achievements.map(achievement => <div key={achievement.id} className={`p-3 rounded-lg border transition-smooth ${achievement.unlocked ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border opacity-50"}`}>
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{achievement.icon}</div>
                        <div className="flex-1">
                          <div className="font-medium">{achievement.name}</div>
                        </div>
                        {!achievement.unlocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>) : <div className="text-center py-4 text-muted-foreground">
                      <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">لا توجد إنجازات بعد</p>
                      <p className="text-xs">ابدأ التعلم لفتح الإنجازات!</p>
                    </div>}
                  <Button variant="outline" className="w-full">
                    عرض الكل
                  </Button>
                </CardContent>
              </Card>

              {/* Performance */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-success" />
                    الأداء
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {quizStats && quizStats.strengths.length > 0 && <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-muted-foreground">نقاط القوة</span>
                        <span className="text-sm font-bold text-success">ممتاز</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        {quizStats.strengths.slice(0, 3).map((strength, index) => <div key={index} className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            <span>{strength}</span>
                          </div>)}
                      </div>
                    </div>}
                  {quizStats && quizStats.weaknesses.length > 0 && <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-muted-foreground">يحتاج تحسين</span>
                        <span className="text-sm font-bold text-secondary">جيد</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        {quizStats.weaknesses.slice(0, 3).map((weakness, index) => <div key={index} className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-secondary" />
                            <span>{weakness}</span>
                          </div>)}
                      </div>
                    </div>}
                  {(!quizStats || quizStats.strengths.length === 0 && quizStats.weaknesses.length === 0) && <div className="text-center py-4 text-muted-foreground">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">لا توجد بيانات أداء بعد</p>
                      <p className="text-xs">أكمل بعض الاختبارات لرؤية أدائك</p>
                    </div>}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* AI Tutor */}
      {showAIChat && <AITutor onClose={() => setShowAIChat(false)} />}
    </div>;
};
export default Dashboard;