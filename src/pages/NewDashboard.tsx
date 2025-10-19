import Navbar from "@/components/Navbar";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, History, BookOpen, Trophy, Award, Target } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AITutor from "@/components/AITutor";
import { useProfile } from "@/hooks/useProfile";
import { SectionCard } from "@/components/SectionCard";
import { DayGrid } from "@/components/DayGrid";
import { PerformanceStats } from "@/components/PerformanceStats";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import { TrialCountdown } from "@/components/TrialCountdown";
import { ManageSubscription } from "@/components/ManageSubscription";
import { useAchievements } from "@/hooks/useAchievements";
import { DashboardAnalytics } from "@/components/DashboardAnalytics";

const NewDashboard = () => {
  const { loading: authLoading } = useAuth(true);
  const [showAIChat, setShowAIChat] = useState(false);
  const navigate = useNavigate();

  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: achievements, isLoading: achievementsLoading } = useAchievements();

  const testType = profile?.test_type_preference || "قدرات";
  const track = profile?.track_preference || "عام";

  // Fetch daily exercises
  const { data: exercises, isLoading: exercisesLoading } = useQuery({
    queryKey: ["daily-exercises", profile?.id, testType],
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("daily_exercises")
        .select("*")
        .eq("user_id", profile.id)
        .eq("test_type", testType)
        .order("day_number", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Fetch performance data
  const { data: performance, isLoading: performanceLoading } = useQuery({
    queryKey: ["student-performance", profile?.id, testType],
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data, error } = await supabase
        .from("student_performance")
        .select("*")
        .eq("user_id", profile.id)
        .eq("test_type", testType)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const isLoading = authLoading || profileLoading || exercisesLoading || performanceLoading;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Determine sections based on test type
  const sections = testType === "قدرات" 
    ? [
        { type: "كمي", nameAr: "الكمي", icon: "🔢" },
        { type: "لفظي", nameAr: "اللفظي", icon: "📝" }
      ]
    : [
        { type: "رياضيات", nameAr: "الرياضيات", icon: "➗" },
        { type: "فيزياء", nameAr: "الفيزياء", icon: "⚡" },
        { type: "كيمياء", nameAr: "الكيمياء", icon: "🧪" },
        { type: "أحياء", nameAr: "الأحياء", icon: "🧬" }
      ];

  // Calculate stats for each section
  const sectionStats = sections.map(section => {
    const sectionExercises = exercises?.filter(ex => ex.section_type === section.type) || [];
    const completedDays = sectionExercises.length;
    const averageScore = completedDays > 0
      ? sectionExercises.reduce((sum, ex) => sum + (ex.score || 0), 0) / completedDays
      : 0;

    return {
      ...section,
      completedDays,
      averageScore,
    };
  });

  // Generate 30-day grid for first section (simplified view)
  const firstSection = sections[0];
  const sectionExercises = exercises?.filter(ex => ex.section_type === firstSection.type) || [];
  
  const dayStatuses = Array.from({ length: 30 }, (_, i) => {
    const dayNum = i + 1;
    const exercise = sectionExercises.find(ex => ex.day_number === dayNum);
    return {
      day: dayNum,
      completed: !!exercise,
      score: exercise?.score,
      locked: dayNum > 1 && !sectionExercises.find(ex => ex.day_number === dayNum - 1),
    };
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">
              مرحباً بك، <span className="text-primary">{profile?.full_name}</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              استمر في التدريب اليومي وطور مهاراتك
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Section Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sectionStats.map((section) => (
                  <SectionCard
                    key={section.type}
                    sectionType={section.type}
                    sectionNameAr={section.nameAr}
                    testType={testType}
                    completedDays={section.completedDays}
                    averageScore={section.averageScore}
                    icon={section.icon}
                  />
                ))}
              </div>

              {/* 30-Day Grid */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">
                    جدول 30 يوم - {firstSection.nameAr}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <DayGrid
                    days={dayStatuses}
                    sectionType={firstSection.type}
                    testType={testType}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Trial Countdown */}
              <TrialCountdown />

              {/* Manage Subscription */}
              <ManageSubscription />

              {/* Dashboard Analytics */}
              <DashboardAnalytics />

              {/* Latest Achievements */}
              {achievements && achievements.length > 0 && (
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Trophy className="w-6 h-6 text-yellow-500" />
                      إنجازاتك الأخيرة
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {achievements.slice(0, 3).map((studentAchievement: any) => {
                      const achievement = studentAchievement.achievement;
                      if (!achievement) return null;
                      
                      return (
                        <div
                          key={studentAchievement.id}
                          className="p-3 rounded-lg border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 hover:border-primary/40 transition-smooth"
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-3xl flex-shrink-0">
                              {achievement.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm mb-1">
                                {achievement.name_ar}
                              </h4>
                              {achievement.description_ar && (
                                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                  {achievement.description_ar}
                                </p>
                              )}
                              <div className="flex items-center gap-2">
                                <Award className="w-3 h-3 text-success" />
                                <span className="text-xs font-semibold text-success">
                                  {achievement.points} نقاط
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Performance Stats */}
              {performance && (
                <PerformanceStats
                  currentLevel={performance.current_level}
                  averageScore={performance.average_score}
                  improvementRate={performance.improvement_rate}
                  strengths={performance.strengths as string[]}
                  weaknesses={performance.weaknesses as string[]}
                  badges={performance.badges as string[]}
                />
              )}
            </div>
          </div>


          {/* Weakness Analysis Button */}
          <Button
            onClick={() => navigate("/weakness-analysis")}
            size="lg"
            variant="outline"
            className="fixed bottom-40 right-8 shadow-elegant z-40 h-14 px-6 border-2"
          >
            <Target className="w-6 h-6 ml-2" />
            <span className="text-lg font-semibold">نقاط القوة والضعف</span>
          </Button>

          {/* Exercise History Button */}
          <Button
            onClick={() => navigate("/exercise-history")}
            size="lg"
            variant="outline"
            className="fixed bottom-24 right-8 shadow-elegant z-40 h-14 px-6 border-2"
          >
            <History className="w-6 h-6 ml-2" />
            <span className="text-lg font-semibold">سجل التمارين</span>
          </Button>

          {/* Daily Content Button */}
          <Button
            onClick={() => navigate("/daily-content")}
            size="lg"
            variant="outline"
            className="fixed bottom-8 right-8 shadow-elegant z-40 h-14 px-6 border-2"
          >
            <BookOpen className="w-6 h-6 ml-2" />
            <span className="text-lg font-semibold">المحتوى اليومي</span>
          </Button>

          {/* AI Tutor Button */}
          <Button
            onClick={() => setShowAIChat(true)}
            size="lg"
            className="fixed bottom-8 left-8 gradient-primary text-primary-foreground shadow-elegant z-40 h-14 px-6"
          >
            <Brain className="w-6 h-6 ml-2" />
            <span className="text-lg font-semibold">المدرس الذكي</span>
          </Button>
        </div>
      </div>

      {showAIChat && <AITutor onClose={() => setShowAIChat(false)} />}
    </div>
  );
};

export default NewDashboard;