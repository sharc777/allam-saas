import Navbar from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  Settings,
  ChevronDown,
  Zap
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
    
  // Process topics with sections structure (works for both قدرات and تحصيلي)
  const topicSections = dailyContent?.topics ? (() => {
    const topics = dailyContent.topics as any;
    
    if (topics.sections && Array.isArray(topics.sections)) {
      return topics.sections.map((section: any) => ({
        name: section.name,
        subtopics: (section.subtopics || []).map((subtopic: string, index: number) => ({
          id: `${section.name}-${index}`,
          title: subtopic,
          duration: `${dailyContent.duration_minutes || 30} دقيقة`,
          completed: isProgressCompleted,
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
                  {topicSections.length > 0 ? (
                    <Accordion type="multiple" className="space-y-2" defaultValue={topicSections.map((_, i) => `section-${i}`)}>
                      {topicSections.map((section, sectionIndex) => (
                        <AccordionItem 
                          key={`section-${sectionIndex}`} 
                          value={`section-${sectionIndex}`}
                          className="border-2 rounded-lg overflow-hidden"
                        >
                          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-primary/5">
                            <div className="flex items-center gap-3 text-right w-full">
                              <div className={`w-2 h-2 rounded-full ${
                                testType === "قدرات" 
                                  ? section.name === "لفظي" || section.name === "القسم اللفظي" 
                                    ? "bg-primary" 
                                    : "bg-secondary"
                                  : "bg-accent"
                              }`} />
                              <span className="font-bold text-lg">{section.name}</span>
                              <Badge variant="secondary" className="mr-auto">
                                {section.subtopics.length} مواضيع
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-2 pb-2">
                            <div className="space-y-2">
                              {section.subtopics.map((topic) => (
                                <div
                                  key={topic.id}
                                  className={`p-3 mx-2 rounded-lg border transition-smooth ${
                                    topic.completed
                                      ? "bg-success/5 border-success/20"
                                      : "bg-card border-border hover:border-primary/30"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      {topic.completed ? (
                                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                                      ) : (
                                        <BookOpen className="w-5 h-5 text-primary flex-shrink-0" />
                                      )}
                                      <div>
                                        <h4 className="font-medium text-sm">{topic.title}</h4>
                                        <p className="text-xs text-muted-foreground">{topic.duration}</p>
                                      </div>
                                    </div>
                                     {!topic.completed && (
                                      <Button
                                        size="sm"
                                        className="gradient-primary text-primary-foreground"
                                        onClick={() => {
                                          navigate(`/lesson/${dailyContent?.day_number}/${topic.id || '1'}`);
                                        }}
                                      >
                                        ابدأ
                                      </Button>
                                    )}
                                    {topic.completed && (
                                      <Badge variant="outline" className="border-success text-success text-xs">
                                        ✓
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>لا يوجد محتوى متاح لهذا اليوم</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quizzes Section */}
              <Card className="border-2 border-secondary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-6 h-6" />
                    الاختبارات
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">تدرب واختبر مستواك</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Daily Quiz */}
                  {dailyContent && (
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold">اختبار اليوم</h4>
                          </div>
                          {todayProgress && !Array.isArray(todayProgress) && todayProgress.quiz_completed && (
                            <span className="text-sm font-medium text-success">✓ مكتمل</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {todayProgress && !Array.isArray(todayProgress) && todayProgress.quiz_completed
                            ? `نتيجتك: ${quizStats?.recentResults?.[0]?.percentage?.toFixed(0) || 0}%`
                            : "اختبر معلوماتك في محتوى اليوم"}
                        </p>
                        <Button 
                          className="w-full"
                          size="sm"
                          onClick={() => {
                            if (dailyContent) {
                              window.location.href = `/quiz?day=${currentDay}&contentId=${dailyContent.id}`;
                            }
                          }}
                          variant={todayProgress && !Array.isArray(todayProgress) && todayProgress.quiz_completed ? "outline" : "default"}
                        >
                          {todayProgress && !Array.isArray(todayProgress) && todayProgress.quiz_completed ? "أعد الاختبار" : "ابدأ الاختبار"}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Practice Quiz */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">اختبار تدريبي حر</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        اختر المواضيع والصعوبة
                      </p>
                      <Button 
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => navigate("/practice-quiz")}
                      >
                        ابدأ التدريب
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Quiz History */}
                  {quizStats && quizStats.totalQuizzes > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="h-5 w-5 text-primary" />
                          <h4 className="font-semibold">سجل الاختبارات</h4>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">عدد الاختبارات:</span>
                            <span className="font-medium">{quizStats.totalQuizzes}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">المتوسط:</span>
                            <span className="font-medium">{quizStats.averageScore.toFixed(0)}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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

              {/* Comprehensive Content Card */}
              <Card className="border-2 border-accent/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-accent" />
                    المحتوى الشامل
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    استعرض جميع أقسام ومواضيع الاختبار
                  </p>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="space-y-3">
                    {/* قسم القدرات - يظهر دائماً */}
                    <AccordionItem value="qudurat" className="border-2 rounded-lg overflow-hidden">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-primary/5">
                        <div className="flex flex-row-reverse items-center gap-3 w-full" dir="rtl">
                          <Badge className="ml-auto bg-warning text-warning-foreground">
                            9 مواضيع
                          </Badge>
                          <span className="font-bold text-lg text-right">القدرات العامة</span>
                          <Brain className="w-5 h-5 text-primary" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-2 pb-2">
                        <Accordion type="multiple" className="space-y-2">
                          {/* القسم اللفظي */}
                          <AccordionItem value="verbal" className="border rounded-lg mx-2">
                            <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-primary/5">
                              <div className="flex flex-row-reverse items-center gap-2 w-full" dir="rtl">
                                <Badge variant="secondary" className="ml-auto">5 مواضيع</Badge>
                                <span className="font-semibold text-right">القسم اللفظي</span>
                                <div className="w-2 h-2 rounded-full bg-primary" />
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-3 pb-2">
                              <div className="space-y-2">
                                {["التناظر اللفظي", "الخطأ السياقي", "إكمال الجمل", "الاستيعاب المقروء", "المفردة الشاذة"].map((topic, i) => (
                                  <div key={i} className="p-2 rounded-lg border bg-card hover:border-primary/30 transition-smooth">
                                    <div className="flex flex-row-reverse items-center gap-2 justify-end" dir="rtl">
                                      <span className="text-sm text-right">{topic}</span>
                                      <BookOpen className="w-4 h-4 text-primary" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>

                          {/* القسم الكمي */}
                          <AccordionItem value="quantitative" className="border rounded-lg mx-2">
                            <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-secondary/5">
                              <div className="flex flex-row-reverse items-center gap-2 w-full" dir="rtl">
                                <Badge variant="secondary" className="ml-auto">4 مواضيع</Badge>
                                <span className="font-semibold text-right">القسم الكمي</span>
                                <div className="w-2 h-2 rounded-full bg-secondary" />
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-3 pb-2">
                              <div className="space-y-2">
                                {["العمليات الحسابية", "الهندسة", "الجبر", "التحليل والاستنتاج"].map((topic, i) => (
                                  <div key={i} className="p-2 rounded-lg border bg-card hover:border-secondary/30 transition-smooth">
                                    <div className="flex flex-row-reverse items-center gap-2 justify-end" dir="rtl">
                                      <span className="text-sm text-right">{topic}</span>
                                      <Target className="w-4 h-4 text-secondary" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </AccordionContent>
                    </AccordionItem>

                    {/* قسم التحصيلي - يظهر فقط إذا كان test_type هو تحصيلي */}
                    {testType === "تحصيلي" && (
                      <AccordionItem value="tahseli" className="border-2 rounded-lg overflow-hidden border-accent/30">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                          <div className="flex flex-row-reverse items-center gap-3 w-full" dir="rtl">
                            <Badge className="ml-auto bg-warning text-warning-foreground">
                              {track === "علمي" ? "16 موضوع" : "12 موضوع"}
                            </Badge>
                            <span className="font-bold text-lg text-right">التحصيلي - {track === "علمي" ? "المسار العلمي" : "المسار النظري"}</span>
                            <Sparkles className="w-5 h-5 text-accent" />
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-2 pb-2">
                          <Accordion type="multiple" className="space-y-2">
                            {track === "علمي" ? (
                              <>
                                {/* الرياضيات */}
                                <AccordionItem value="math" className="border rounded-lg mx-2 border-blue-500/30">
                                  <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-blue-500/5">
                                    <div className="flex flex-row-reverse items-center gap-2 w-full" dir="rtl">
                                      <Badge variant="secondary" className="ml-auto">4 مواضيع</Badge>
                                      <span className="font-semibold text-right">الرياضيات</span>
                                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-3 pb-2">
                                    <div className="space-y-2">
                                      {["الجبر", "الهندسة", "التفاضل والتكامل", "الإحصاء"].map((topic, i) => (
                                        <div key={i} className="p-2 rounded-lg border bg-card hover:border-blue-500/30 transition-smooth">
                                          <div className="flex flex-row-reverse items-center gap-2 justify-end" dir="rtl">
                                            <span className="text-sm text-right">{topic}</span>
                                            <BookOpen className="w-4 h-4 text-blue-500" />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>

                                {/* الفيزياء */}
                                <AccordionItem value="physics" className="border rounded-lg mx-2 border-purple-500/30">
                                  <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-purple-500/5">
                                    <div className="flex flex-row-reverse items-center gap-2 w-full" dir="rtl">
                                      <Badge variant="secondary" className="ml-auto">4 مواضيع</Badge>
                                      <span className="font-semibold text-right">الفيزياء</span>
                                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-3 pb-2">
                                    <div className="space-y-2">
                                      {["الميكانيكا", "الحرارة", "الكهرباء والمغناطيسية", "الموجات والبصريات"].map((topic, i) => (
                                        <div key={i} className="p-2 rounded-lg border bg-card hover:border-purple-500/30 transition-smooth">
                                          <div className="flex flex-row-reverse items-center gap-2 justify-end" dir="rtl">
                                            <span className="text-sm text-right">{topic}</span>
                                            <BookOpen className="w-4 h-4 text-purple-500" />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>

                                {/* الكيمياء */}
                                <AccordionItem value="chemistry" className="border rounded-lg mx-2 border-green-500/30">
                                  <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-green-500/5">
                                    <div className="flex flex-row-reverse items-center gap-2 w-full" dir="rtl">
                                      <Badge variant="secondary" className="ml-auto">4 مواضيع</Badge>
                                      <span className="font-semibold text-right">الكيمياء</span>
                                      <div className="w-2 h-2 rounded-full bg-green-500" />
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-3 pb-2">
                                    <div className="space-y-2">
                                      {["الكيمياء العامة", "الكيمياء العضوية", "الكيمياء الحيوية", "الكيمياء الفيزيائية"].map((topic, i) => (
                                        <div key={i} className="p-2 rounded-lg border bg-card hover:border-green-500/30 transition-smooth">
                                          <div className="flex flex-row-reverse items-center gap-2 justify-end" dir="rtl">
                                            <span className="text-sm text-right">{topic}</span>
                                            <BookOpen className="w-4 h-4 text-green-500" />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>

                                {/* الأحياء */}
                                <AccordionItem value="biology" className="border rounded-lg mx-2 border-teal-500/30">
                                  <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-teal-500/5">
                                    <div className="flex flex-row-reverse items-center gap-2 w-full" dir="rtl">
                                      <Badge variant="secondary" className="ml-auto">4 مواضيع</Badge>
                                      <span className="font-semibold text-right">الأحياء</span>
                                      <div className="w-2 h-2 rounded-full bg-teal-500" />
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-3 pb-2">
                                    <div className="space-y-2">
                                      {["الخلية", "الوراثة", "التشريح", "علم البيئة"].map((topic, i) => (
                                        <div key={i} className="p-2 rounded-lg border bg-card hover:border-teal-500/30 transition-smooth">
                                          <div className="flex flex-row-reverse items-center gap-2 justify-end" dir="rtl">
                                            <span className="text-sm text-right">{topic}</span>
                                            <BookOpen className="w-4 h-4 text-teal-500" />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              </>
                            ) : (
                              <>
                                {/* العلوم الشرعية */}
                                <AccordionItem value="sharia" className="border rounded-lg mx-2 border-amber-500/30">
                                  <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-amber-500/5">
                                    <div className="flex flex-row-reverse items-center gap-2 w-full" dir="rtl">
                                      <Badge variant="secondary" className="ml-auto">4 مواضيع</Badge>
                                      <span className="font-semibold text-right">العلوم الشرعية</span>
                                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-3 pb-2">
                                    <div className="space-y-2">
                                      {["التفسير", "الحديث", "الفقه", "التوحيد"].map((topic, i) => (
                                        <div key={i} className="p-2 rounded-lg border bg-card hover:border-amber-500/30 transition-smooth">
                                          <div className="flex flex-row-reverse items-center gap-2 justify-end" dir="rtl">
                                            <span className="text-sm text-right">{topic}</span>
                                            <BookOpen className="w-4 h-4 text-amber-500" />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>

                                {/* اللغة العربية */}
                                <AccordionItem value="arabic" className="border rounded-lg mx-2 border-rose-500/30">
                                  <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-rose-500/5">
                                    <div className="flex flex-row-reverse items-center gap-2 w-full" dir="rtl">
                                      <Badge variant="secondary" className="ml-auto">4 مواضيع</Badge>
                                      <span className="font-semibold text-right">اللغة العربية</span>
                                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-3 pb-2">
                                    <div className="space-y-2">
                                      {["النحو", "الصرف", "البلاغة", "الأدب"].map((topic, i) => (
                                        <div key={i} className="p-2 rounded-lg border bg-card hover:border-rose-500/30 transition-smooth">
                                          <div className="flex flex-row-reverse items-center gap-2 justify-end" dir="rtl">
                                            <span className="text-sm text-right">{topic}</span>
                                            <BookOpen className="w-4 h-4 text-rose-500" />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>

                                {/* العلوم الاجتماعية */}
                                <AccordionItem value="social" className="border rounded-lg mx-2 border-indigo-500/30">
                                  <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-indigo-500/5">
                                    <div className="flex flex-row-reverse items-center gap-2 w-full" dir="rtl">
                                      <Badge variant="secondary" className="ml-auto">4 مواضيع</Badge>
                                      <span className="font-semibold text-right">العلوم الاجتماعية</span>
                                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-3 pb-2">
                                    <div className="space-y-2">
                                      {["التاريخ", "الجغرافيا", "الاقتصاد", "علم الاجتماع"].map((topic, i) => (
                                        <div key={i} className="p-2 rounded-lg border bg-card hover:border-indigo-500/30 transition-smooth">
                                          <div className="flex flex-row-reverse items-center gap-2 justify-end" dir="rtl">
                                            <span className="text-sm text-right">{topic}</span>
                                            <BookOpen className="w-4 h-4 text-indigo-500" />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              </>
                            )}
                          </Accordion>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
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
