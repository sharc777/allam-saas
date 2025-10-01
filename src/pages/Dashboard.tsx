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
  Loader2
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import AITutor from "@/components/AITutor";

const Dashboard = () => {
  // All hooks MUST be called before any conditional returns
  const { loading } = useAuth(true);
  const [currentDay] = useState(5);
  const [showAIChat, setShowAIChat] = useState(false);
  
  const totalDays = 30;
  const progress = (currentDay / totalDays) * 100;

  // Conditional return AFTER all hooks
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const todayTopics = [
    { id: 1, title: "الجبر المتقدم", duration: "45 دقيقة", completed: true },
    { id: 2, title: "حل المسائل اللفظية", duration: "30 دقيقة", completed: false },
    { id: 3, title: "اختبار قصير", duration: "20 دقيقة", completed: false },
  ];

  const achievements = [
    { id: 1, name: "بداية قوية", icon: "🔥", unlocked: true },
    { id: 2, name: "5 أيام متتالية", icon: "⭐", unlocked: true },
    { id: 3, name: "مبدع الأسبوع", icon: "🏆", unlocked: false },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">
              مرحباً بك في <span className="text-primary">لوحة التحكم</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              استمر في التقدم وحقق أهدافك اليومية
            </p>
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
                      <div className="text-2xl font-bold text-primary">12</div>
                      <div className="text-sm text-muted-foreground">دروس مكتملة</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/10">
                      <div className="text-2xl font-bold text-secondary">89%</div>
                      <div className="text-sm text-muted-foreground">نسبة النجاح</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-success/10">
                      <div className="text-2xl font-bold text-success">5</div>
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
                    محتوى اليوم - اليوم الخامس
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {todayTopics.map((topic) => (
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
                  ))}
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
                    <div className="text-4xl font-bold">5</div>
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
                  {achievements.map((achievement) => (
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
                  ))}
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
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-muted-foreground">نقاط القوة</span>
                      <span className="text-sm font-bold text-success">ممتاز</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span>الجبر</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span>الهندسة</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-muted-foreground">يحتاج تحسين</span>
                      <span className="text-sm font-bold text-secondary">جيد</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-secondary" />
                        <span>المسائل اللفظية</span>
                      </div>
                    </div>
                  </div>
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
