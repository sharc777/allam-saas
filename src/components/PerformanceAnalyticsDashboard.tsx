import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, TrendingUp, Clock, Target, Award } from "lucide-react";
import { useState } from "react";
import { usePerformanceAnalytics } from "@/hooks/usePerformanceAnalytics";
import { TopicsBarChart } from "./charts/TopicsBarChart";
import { DifficultyChart } from "./charts/DifficultyChart";
import { WeaknessHeatmap } from "./charts/WeaknessHeatmap";
import { TimeAnalysisChart } from "./charts/TimeAnalysisChart";
import { PerformanceLineChart } from "./charts/PerformanceLineChart";
import { Skeleton } from "./ui/skeleton";

interface PerformanceAnalyticsDashboardProps {
  userId?: string;
}

export const PerformanceAnalyticsDashboard = ({ userId }: PerformanceAnalyticsDashboardProps) => {
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '3months'>('30days');
  
  const getDates = () => {
    const end = new Date();
    const start = new Date();
    switch (dateRange) {
      case '7days':
        start.setDate(end.getDate() - 7);
        break;
      case '30days':
        start.setDate(end.getDate() - 30);
        break;
      case '3months':
        start.setMonth(end.getMonth() - 3);
        break;
    }
    return { from: start, to: end };
  };

  const {
    performanceData,
    isLoading,
    calculateSuccessRateByTopic,
    calculateAverageTimeByDifficulty,
    getPerformanceTrends,
    getOverallStats,
    exportPerformanceData,
  } = usePerformanceAnalytics(userId, getDates());

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const overallStats = getOverallStats();
  const topicsData = calculateSuccessRateByTopic();
  const difficultyData = calculateAverageTimeByDifficulty();
  const trendsData = getPerformanceTrends('day');
  
  // Transform data for charts
  const topicsBarData = topicsData.map(t => ({
    topic: t.topic,
    successRate: t.successRate,
    attempts: topicsData.find(td => td.topic === t.topic)?.totalAttempts || 0,
    avgTime: t.avgTime
  }));

  const difficultyChartData = difficultyData.map(d => ({
    difficulty: d.difficulty,
    successRate: d.successRate,
    avgTime: d.avgTime,
    totalQuestions: difficultyData.find(dd => dd.difficulty === d.difficulty)?.totalAttempts || 0
  }));
  
  const weaknessHeatmapData = topicsData.map(t => ({
    topic: t.topic,
    successRate: t.successRate,
    section: t.topic.includes('كمي') || t.topic.includes('رياضيات') ? 'كمي' : 'لفظي'
  }));

  const timeAnalysisData = topicsData.map(t => ({
    topic: t.topic,
    avgTime: t.avgTime,
    totalQuestions: t.totalAttempts
  }));

  // Transform trends for line chart - simplified
  const lineChartData = trendsData.length > 0 ? trendsData.slice(0, 30).map(t => ({
    date: t.date,
    score: t.successRate,
    total_questions: t.totalQuestions,
    created_at: t.date,
    time_taken_minutes: t.avgTime,
    topic: '',
    section: '',
    difficulty: '',
    is_correct: t.successRate >= 50
  })) : [];

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold">تحليل الأداء التفصيلي</h2>
          <p className="text-muted-foreground mt-1">تتبع تقدمك وحدد نقاط التحسين</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">آخر 7 أيام</SelectItem>
              <SelectItem value="30days">آخر 30 يوم</SelectItem>
              <SelectItem value="3months">آخر 3 أشهر</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportPerformanceData} variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير CSV
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4" />
              إجمالي الأسئلة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overallStats.totalQuestions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              معدل النجاح
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">
              {overallStats.successRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              متوسط الوقت
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {overallStats.avgTime.toFixed(1)}
              <span className="text-lg text-muted-foreground mr-1">دقيقة</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="w-4 h-4" />
              إجمالي الوقت
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(overallStats.totalTimeSpent / 60).toFixed(1)}
              <span className="text-lg text-muted-foreground mr-1">ساعة</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Over Time */}
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">تطور الأداء عبر الزمن</h3>
        <PerformanceLineChart data={lineChartData} />
      </Card>

      {/* Topics & Difficulty Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopicsBarChart data={topicsBarData} />
        <DifficultyChart data={difficultyChartData} />
      </div>

      {/* Time Analysis & Weakness Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TimeAnalysisChart data={timeAnalysisData} />
        <WeaknessHeatmap data={weaknessHeatmapData} />
      </div>
    </div>
  );
};
