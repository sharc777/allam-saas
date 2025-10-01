import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Target, 
  Trophy, 
  BookOpen, 
  MessageSquare, 
  TrendingUp,
  Flame,
  CheckCircle2,
  Lock,
  Sparkles,
  Brain,
  Loader2,
  Settings
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import AITutor from "@/components/AITutor";
import { useProfile } from "@/hooks/useProfile";
import { useDailyContent } from "@/hooks/useDailyContent";
import { useStudentProgress } from "@/hooks/useStudentProgress";
import { useAchievements } from "@/hooks/useAchievements";
import { useQuizStats } from "@/hooks/useQuizStats";
import { useAllProgress } from "@/hooks/useAllProgress";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  // All hooks MUST be called before any conditional returns
  const { loading: authLoading } = useAuth(true);
  const [showAIChat, setShowAIChat] = useState(false);
  const navigate = useNavigate();
  
  // Fetch data from Supabase
  const { data: profile, isLoading: profileLoading } = useProfile();
  
  // Redirect to test selection if no preferences set
  if (profile && !profile.test_type_preference) {
    navigate("/test-selection");
    return null;
  }
  
  const currentDay = profile?.current_day || 1;
  const testType = profile?.test_type_preference || "قدرات";
  const track = profile?.track_preference || "عام";
  const { data: dailyContent, isLoading: contentLoading } = useDailyContent(currentDay, testType, track);
  const { data: todayProgress, isLoading: progressLoading } = useStudentProgress(currentDay);
  const { data: achievementsData, isLoading: achievementsLoading } = useAchievements();
  const { data: quizStats, isLoading: quizLoading } = useQuizStats();
  const { data: allProgressData, isLoading: allProgressLoading } = useAllProgress();
  
  const totalDays = 30;
  const progress = (currentDay / totalDays) * 100;

  // Conditional return AFTER all hooks
  const isLoading = authLoading || profileLoading || contentLoading || progressLoading || achievementsLoading || quizLoading || allProgressLoading;
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Prepare today's topics from daily content
  const isProgressCompleted = todayProgress && !Array.isArray(todayProgress) 
    ? todayProgress.content_completed 
    : false;
    
  const todayTopics = dailyContent?.topics ? (dailyContent.topics as any[]).map((topic: any, index: number) => ({
    id: index + 1,
    title: topic.title || topic,
    duration: `${dailyContent.duration_minutes || 30} دقيقة`,
    completed: isProgressCompleted,
  })) : [];

  // Prepare achievements data
  const achievements = achievementsData?.slice(0, 3).map(item => ({
    id: item.id,
    name: (item.achievement as any)?.name_ar || (item.achievement as any)?.name || "إنجاز",
    icon: (item.achievement as any)?.icon || "🏆",
    unlocked: true,
  })) || [];

  return (
    <div className="min-h-screen bg-background">
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
                    {testType === "تحصيلي" && (
                      <Badge variant="secondary" className="mt-1">
                        {track === "علمي" ? "المسار العلمي" : "المسار النظري"}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigate("/test-selection")}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </div>
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
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-secondary" />
                    {dailyContent?.title || `محتوى اليوم - اليوم ${currentDay}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dailyContent?.description && (
                    <p className="text-muted-foreground mb-4">{dailyContent.description}</p>
                  )}
                  {todayTopics.length > 0 ? todayTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className={`p-4 rounded-lg border-2 transition-smooth ${
                        topic.completed
                          ? "bg-success/5 border-success/20"
                          : "bg-card border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {topic.completed ? (
                            <CheckCircle2 className="w-6 h-6 text-success" />
                          ) : (
                            <BookOpen className="w-6 h-6 text-primary" />
                          )}
                          <div>
                            <h4 className="font-bold">{topic.title}</h4>
                            <p className="text-sm text-muted-foreground">{topic.duration}</p>
                          </div>
                        </div>
                        {!topic.completed && (
                          <Button className="gradient-primary text-primary-foreground">
                            ابدأ
                          </Button>
                        )}
                        {topic.completed && (
                          <Badge variant="outline" className="border-success text-success">
                            مكتمل ✓
                          </Badge>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>لا يوجد محتوى متاح لهذا اليوم</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quiz Card */}
              <Card className="border-2 border-secondary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-6 h-6 text-secondary" />
                    الاختبار اليومي
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    اختبر معلوماتك في محتوى اليوم مع 10 أسئلة مولّدة بالذكاء الاصطناعي
                  </p>
                  {todayProgress && !Array.isArray(todayProgress) && todayProgress.quiz_completed ? (
                    <Button 
                      className="w-full"
                      variant="outline"
                      onClick={() => window.location.href = `/quiz?day=${currentDay}`}
                    >
                      <CheckCircle2 className="ml-2 w-5 h-5 text-success" />
                      إعادة الاختبار
                    </Button>
                  ) : (
                    <Button 
                      className="w-full gradient-secondary text-secondary-foreground"
                      onClick={() => window.location.href = `/quiz?day=${currentDay}`}
                    >
                      <Target className="ml-2 w-5 h-5" />
                      ابدأ الاختبار
                    </Button>
                  )}
                </CardContent>
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
                  <Button 
                    className="w-full gradient-primary text-primary-foreground shadow-elegant hover:shadow-glow"
                    onClick={() => setShowAIChat(true)}
                  >
                    <MessageSquare className="ml-2 w-5 h-5" />
                    تحدث مع المدرس الذكي
                  </Button>
                </CardContent>
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
                  {achievements.length > 0 ? achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className={`p-3 rounded-lg border transition-smooth ${
                        achievement.unlocked
                          ? "bg-primary/5 border-primary/20"
                          : "bg-muted/30 border-border opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{achievement.icon}</div>
                        <div className="flex-1">
                          <div className="font-medium">{achievement.name}</div>
                        </div>
                        {!achievement.unlocked && (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">لا توجد إنجازات بعد</p>
                      <p className="text-xs">ابدأ التعلم لفتح الإنجازات!</p>
                    </div>
                  )}
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
                  {quizStats && quizStats.strengths.length > 0 && (
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-muted-foreground">نقاط القوة</span>
                        <span className="text-sm font-bold text-success">ممتاز</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        {quizStats.strengths.slice(0, 3).map((strength, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            <span>{strength}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {quizStats && quizStats.weaknesses.length > 0 && (
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-muted-foreground">يحتاج تحسين</span>
                        <span className="text-sm font-bold text-secondary">جيد</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        {quizStats.weaknesses.slice(0, 3).map((weakness, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-secondary" />
                            <span>{weakness}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(!quizStats || (quizStats.strengths.length === 0 && quizStats.weaknesses.length === 0)) && (
                    <div className="text-center py-4 text-muted-foreground">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">لا توجد بيانات أداء بعد</p>
                      <p className="text-xs">أكمل بعض الاختبارات لرؤية أدائك</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* AI Tutor */}
      {showAIChat && <AITutor onClose={() => setShowAIChat(false)} />}
    </div>
  );
};

export default Dashboard;
