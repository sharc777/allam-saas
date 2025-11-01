import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface PerformanceData {
  id: string;
  topic: string;
  section: string;
  test_type: string;
  difficulty: string;
  is_correct: boolean;
  time_spent_seconds: number;
  attempted_at: string;
  question_text: string;
  confidence_level?: number;
}

interface DateRange {
  from: Date;
  to: Date;
}

interface TopicPerformance {
  topic: string;
  totalAttempts: number;
  correctAttempts: number;
  successRate: number;
  avgTime: number;
}

interface DifficultyPerformance {
  difficulty: string;
  totalAttempts: number;
  correctAttempts: number;
  successRate: number;
  avgTime: number;
}

interface PerformanceTrend {
  date: string;
  successRate: number;
  avgTime: number;
  totalQuestions: number;
}

export const usePerformanceAnalytics = (
  userId?: string,
  dateRange?: DateRange
) => {
  const defaultDateRange = {
    from: subDays(new Date(), 30),
    to: new Date(),
  };

  const range = dateRange || defaultDateRange;

  // Fetch performance data
  const { data: performanceData, isLoading, error, refetch } = useQuery({
    queryKey: ["performance-analytics", userId, range],
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!userId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    queryFn: async () => {
      try {
        console.log('📊 [Performance Analytics] Fetching data...', { userId, range });
        
        const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
        if (!targetUserId) {
          console.error('❌ [Performance Analytics] User not authenticated');
          throw new Error("المستخدم غير مصادق عليه. يرجى تسجيل الدخول مرة أخرى.");
        }

        const { data, error } = await supabase
          .from("user_performance_history" as any)
          .select("*")
          .eq("user_id", targetUserId)
          .gte("attempted_at", startOfDay(range.from).toISOString())
          .lte("attempted_at", endOfDay(range.to).toISOString())
          .order("attempted_at", { ascending: true });

        if (error) {
          console.error('❌ [Performance Analytics] Database error:', error);
          throw new Error(`فشل في تحميل بيانات الأداء: ${error.message}`);
        }

        console.log(`✅ [Performance Analytics] Loaded ${data?.length || 0} records`);
        return (data as any) as PerformanceData[];
      } catch (err) {
        console.error('❌ [Performance Analytics] Fetch error:', err);
        throw err;
      }
    },
  });

  // Calculate success rate by topic
  const calculateSuccessRateByTopic = (): TopicPerformance[] => {
    if (!performanceData) return [];

    const topicMap = new Map<string, PerformanceData[]>();

    performanceData.forEach((record) => {
      const topic = record.topic;
      if (!topic) return; // Skip records without topic
      if (!topicMap.has(topic)) {
        topicMap.set(topic, []);
      }
      topicMap.get(topic)!.push(record);
    });

    return Array.from(topicMap.entries()).map(([topic, records]) => ({
      topic,
      totalAttempts: records.length,
      correctAttempts: records.filter((r) => r.is_correct).length,
      successRate: (records.filter((r) => r.is_correct).length / records.length) * 100,
      avgTime: records.reduce((sum, r) => sum + r.time_spent_seconds, 0) / records.length,
    }));
  };

  // Calculate average time by difficulty
  const calculateAverageTimeByDifficulty = (): DifficultyPerformance[] => {
    if (!performanceData) return [];

    const difficultyMap = new Map<string, PerformanceData[]>();

    performanceData.forEach((record) => {
      const difficulty = record.difficulty;
      if (!difficultyMap.has(difficulty)) {
        difficultyMap.set(difficulty, []);
      }
      difficultyMap.get(difficulty)!.push(record);
    });

    return Array.from(difficultyMap.entries()).map(([difficulty, records]) => ({
      difficulty,
      totalAttempts: records.length,
      correctAttempts: records.filter((r) => r.is_correct).length,
      successRate: (records.filter((r) => r.is_correct).length / records.length) * 100,
      avgTime: records.reduce((sum, r) => sum + r.time_spent_seconds, 0) / records.length,
    }));
  };

  // Get performance trends over time
  const getPerformanceTrends = (groupBy: 'day' | 'week' = 'day'): PerformanceTrend[] => {
    if (!performanceData) return [];

    const trendMap = new Map<string, PerformanceData[]>();

    performanceData.forEach((record) => {
      const date = format(new Date(record.attempted_at), groupBy === 'day' ? 'yyyy-MM-dd' : 'yyyy-ww');
      if (!trendMap.has(date)) {
        trendMap.set(date, []);
      }
      trendMap.get(date)!.push(record);
    });

    return Array.from(trendMap.entries()).map(([date, records]) => ({
      date,
      successRate: (records.filter((r) => r.is_correct).length / records.length) * 100,
      avgTime: records.reduce((sum, r) => sum + r.time_spent_seconds, 0) / records.length,
      totalQuestions: records.length,
    }));
  };

  // Get overall statistics
  const getOverallStats = () => {
    if (!performanceData || performanceData.length === 0) {
      return {
        totalQuestions: 0,
        correctAnswers: 0,
        successRate: 0,
        avgTime: 0,
        totalTimeSpent: 0,
      };
    }

    const correctAnswers = performanceData.filter((r) => r.is_correct).length;
    const totalTime = performanceData.reduce((sum, r) => sum + r.time_spent_seconds, 0);

    return {
      totalQuestions: performanceData.length,
      correctAnswers,
      successRate: (correctAnswers / performanceData.length) * 100,
      avgTime: totalTime / performanceData.length,
      totalTimeSpent: totalTime,
    };
  };

  // Export performance data as CSV
  const exportPerformanceData = () => {
    if (!performanceData) return null;

    const headers = [
      "التاريخ",
      "الموضوع",
      "القسم",
      "نوع الاختبار",
      "الصعوبة",
      "الإجابة صحيحة",
      "الوقت (ثانية)",
      "مستوى الثقة",
    ];

    const rows = performanceData.map((record) => [
      format(new Date(record.attempted_at), "yyyy-MM-dd HH:mm"),
      record.topic,
      record.section,
      record.test_type,
      record.difficulty,
      record.is_correct ? "نعم" : "لا",
      record.time_spent_seconds.toString(),
      record.confidence_level?.toString() || "-",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `performance_analytics_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  };

  // Get weakest topics (lowest success rate)
  const getWeakestTopics = (limit: number = 5): TopicPerformance[] => {
    const topicPerformance = calculateSuccessRateByTopic();
    return topicPerformance
      .sort((a, b) => a.successRate - b.successRate)
      .slice(0, limit);
  };

  // Get strongest topics (highest success rate)
  const getStrongestTopics = (limit: number = 5): TopicPerformance[] => {
    const topicPerformance = calculateSuccessRateByTopic();
    return topicPerformance
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, limit);
  };

  return {
    performanceData,
    isLoading,
    error,
    refetch,
    calculateSuccessRateByTopic,
    calculateAverageTimeByDifficulty,
    getPerformanceTrends,
    getOverallStats,
    exportPerformanceData,
    getWeakestTopics,
    getStrongestTopics,
  };
};
