import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface PerformanceData {
  id: string;
  topic_name: string;
  section: string;
  test_type: string;
  difficulty: string;
  is_correct: boolean;
  time_spent_seconds: number;
  created_at: string;
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
    queryFn: async () => {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!targetUserId) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("user_performance_history" as any)
        .select("*")
        .eq("user_id", targetUserId)
        .gte("created_at", startOfDay(range.from).toISOString())
        .lte("created_at", endOfDay(range.to).toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data as any) as PerformanceData[];
    },
  });

  // Calculate success rate by topic
  const calculateSuccessRateByTopic = (): TopicPerformance[] => {
    if (!performanceData) return [];

    const topicMap = new Map<string, PerformanceData[]>();

    performanceData.forEach((record) => {
      const topic = record.topic_name;
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
      const date = format(new Date(record.created_at), groupBy === 'day' ? 'yyyy-MM-dd' : 'yyyy-ww');
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
      format(new Date(record.created_at), "yyyy-MM-dd HH:mm"),
      record.topic_name,
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
