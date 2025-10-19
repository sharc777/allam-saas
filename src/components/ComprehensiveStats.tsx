import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Target, 
  Brain, 
  TrendingUp, 
  Clock,
  Trophy,
  Calendar,
  Flame
} from "lucide-react";

interface ComprehensiveStatsProps {
  stats: any;
}

export const ComprehensiveStats = ({ stats }: ComprehensiveStatsProps) => {
  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        لا توجد إحصائيات متاحة
      </div>
    );
  }

  const statCards = [
    {
      title: "التمارين اليومية",
      value: stats.daily_exercises_completed || 0,
      icon: BookOpen,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "الاختبارات المخصصة",
      value: stats.custom_tests_completed || 0,
      icon: Target,
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "تدريبات نقاط الضعف",
      value: stats.weakness_practices_completed || 0,
      icon: Brain,
      color: "text-orange-600",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "الإنجازات",
      value: stats.achievements_unlocked || 0,
      icon: Trophy,
      color: "text-yellow-600",
      bgColor: "bg-yellow-500/10",
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-3xl font-bold">{card.value}</p>
                </div>
                <div className={`p-3 rounded-full ${card.bgColor}`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              الأداء العام
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>المتوسط العام</span>
                <span className="font-bold">{stats.average_score?.toFixed(1) || 0}%</span>
              </div>
              <Progress value={stats.average_score || 0} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>معدل التحسن</span>
                <span className="font-bold text-green-600">
                  +{stats.improvement_rate?.toFixed(1) || 0}%
                </span>
              </div>
              <Progress value={Math.min(stats.improvement_rate || 0, 100)} className="h-2" />
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">{stats.current_level || "مبتدئ"}</Badge>
                <span className="text-muted-foreground">المستوى الحالي</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              ملخص النشاط
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-600" />
                <span className="text-sm">سلسلة الأيام</span>
              </div>
              <span className="font-bold text-lg">{stats.streak_days || 0} يوم</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="text-sm">اليوم الحالي</span>
              </div>
              <span className="font-bold text-lg">يوم {stats.current_day || 1}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <span className="text-sm">إجمالي الوقت</span>
              </div>
              <span className="font-bold text-lg">
                {Math.floor((stats.total_time_spent || 0) / 60)} ساعة
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                <span className="text-sm">النقاط الكلية</span>
              </div>
              <span className="font-bold text-lg">{stats.total_points || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">نقاط القوة 💪</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.strengths && stats.strengths.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {stats.strengths.map((strength: any, index: number) => (
                  <Badge key={index} variant="secondary" className="bg-green-500/10 text-green-700">
                    {typeof strength === 'string' ? strength : strength.topic}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                لا توجد نقاط قوة محددة بعد
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">نقاط الضعف 🎯</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.weaknesses && stats.weaknesses.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {stats.weaknesses.map((weakness: any, index: number) => (
                  <Badge key={index} variant="secondary" className="bg-orange-500/10 text-orange-700">
                    {typeof weakness === 'string' ? weakness : weakness.topic}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                لا توجد نقاط ضعف محددة بعد
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
