import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Award, Clock, Target, BarChart3, Flame } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";

export const DashboardAnalytics = () => {
  const { data: profile } = useProfile();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-analytics", profile?.id],
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!profile?.id,
    queryFn: async () => {
      if (!profile?.id) return null;

      // Fetch exercises (القدرات فقط)
      const { data: exercises } = await supabase
        .from("daily_exercises")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      // Calculate stats
      const totalExercises = exercises?.length || 0;
      const completedExercises = exercises?.filter(ex => ex.completed_at)?.length || 0;
      const averageScore = totalExercises > 0
        ? Math.round(
            exercises!.reduce((sum, ex) => sum + (ex.score || 0), 0) / totalExercises
          )
        : 0;

      // Calculate average time
      const totalTime = exercises
        ?.filter(ex => ex.time_taken_minutes)
        ?.reduce((sum, ex) => sum + (ex.time_taken_minutes || 0), 0) || 0;
      const avgTime = completedExercises > 0
        ? Math.round(totalTime / completedExercises)
        : 0;

      // Calculate this week's progress
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weekExercises = exercises?.filter(
        ex => new Date(ex.created_at) >= oneWeekAgo
      ) || [];

      return {
        totalExercises,
        completedExercises,
        averageScore,
        avgTime,
        weeklyProgress: weekExercises.length,
        streak: profile.streak_days || 0,
        totalPoints: profile.total_points || 0,
      };
    },
  });

  if (isLoading) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            إحصائياتك
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const analyticsItems = [
    {
      icon: TrendingUp,
      label: "إجمالي التمارين",
      value: stats.totalExercises,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Target,
      label: "متوسط الدرجات",
      value: `${stats.averageScore}%`,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      icon: Clock,
      label: "متوسط الوقت",
      value: `${stats.avgTime} دقيقة`,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      icon: Flame,
      label: "أيام متتالية",
      value: stats.streak,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      icon: Award,
      label: "إجمالي النقاط",
      value: stats.totalPoints,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      icon: BarChart3,
      label: "تمارين هذا الأسبوع",
      value: stats.weeklyProgress,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          إحصائياتك
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {analyticsItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg border-2 border-muted hover:border-primary/30 transition-smooth"
            >
              <div className={`w-12 h-12 rounded-lg ${item.bgColor} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`text-2xl font-bold ${item.color}`}>
                  {item.value}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
