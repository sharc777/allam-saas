import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar, Clock, TrendingUp, Award } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useExerciseHistory } from "@/hooks/useExerciseHistory";
import Navbar from "@/components/Navbar";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const ExerciseHistory = () => {
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth(true);
  const { data: profile } = useProfile();
  const { data: exercises, isLoading } = useExerciseHistory(profile?.id);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center">جاري التحميل...</div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalExercises = exercises?.length || 0;
  const averageScore = totalExercises > 0
    ? Math.round(exercises.reduce((sum, ex) => sum + (ex.score || 0), 0) / totalExercises)
    : 0;
  
  const sectionCounts: Record<string, number> = {};
  exercises?.forEach(ex => {
    sectionCounts[ex.section_type] = (sectionCounts[ex.section_type] || 0) + 1;
  });
  
  const mostPracticedSection = Object.entries(sectionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "لا يوجد";

  const getSectionIcon = (section: string) => {
    switch (section) {
      case "كمي": return "🔢";
      case "لفظي": return "📝";
      case "رياضيات": return "➗";
      case "فيزياء": return "⚡";
      case "كيمياء": return "🧪";
      case "أحياء": return "🧬";
      default: return "📚";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500/10 text-green-600 dark:text-green-400";
    if (score >= 60) return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
    return "bg-red-500/10 text-red-600 dark:text-red-400";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="mb-4"
            >
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة للوحة التحكم
            </Button>
            
            <h1 className="text-4xl font-bold mb-2">سجل التمارين</h1>
            <p className="text-muted-foreground text-lg">
              راجع جميع تمارينك السابقة وتابع تطورك
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">إجمالي التمارين</p>
                    <p className="text-3xl font-bold">{totalExercises}</p>
                  </div>
                  <Award className="w-10 h-10 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">متوسط النتيجة</p>
                    <p className="text-3xl font-bold">{averageScore}%</p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">الأكثر تدريباً</p>
                    <p className="text-xl font-bold">{mostPracticedSection}</p>
                  </div>
                  <div className="text-4xl">{getSectionIcon(mostPracticedSection)}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Exercise List */}
          <Card>
            <CardHeader>
              <CardTitle>جميع التمارين</CardTitle>
            </CardHeader>
            <CardContent>
              {!exercises || exercises.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg mb-4">لم تقم بأي تمارين بعد</p>
                  <Button onClick={() => navigate("/dashboard")}>
                    ابدأ أول تمرين
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {exercises.map((exercise) => (
                    <Card
                      key={exercise.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/exercise-details/${exercise.id}`)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="text-3xl">{getSectionIcon(exercise.section_type)}</div>
                            <div>
                              <h3 className="font-bold text-lg">{exercise.section_type}</h3>
                              <p className="text-sm text-muted-foreground">
                                {exercise.test_type} - {exercise.track || "عام"}
                              </p>
                            </div>
                          </div>
                          
                          <Badge className={getScoreColor(exercise.score)}>
                            {exercise.score}%
                          </Badge>
                        </div>

                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {format(new Date(exercise.created_at), "dd MMMM yyyy", { locale: ar })}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{exercise.time_taken_minutes || 0} دقيقة</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span>
                              {Array.isArray(exercise.questions) ? exercise.questions.length : (exercise.total_questions || 0)} سؤال
                            </span>
                          </div>
                        </div>

                        <div className="mt-4">
                          <Button variant="outline" className="w-full">
                            مراجعة التفاصيل
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ExerciseHistory;
