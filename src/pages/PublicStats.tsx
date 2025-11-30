import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, Target, BookOpen, Users, Trophy, Brain } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e'];

const PublicStats = () => {
  // Fetch overall success rate
  const { data: successRate } = useQuery({
    queryKey: ['public-success-rate'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_results')
        .select('score, total_questions');
      
      if (error) throw error;
      
      if (!data || data.length === 0) return 0;
      
      const totalScore = data.reduce((sum, q) => sum + q.score, 0);
      const totalQuestions = data.reduce((sum, q) => sum + q.total_questions, 0);
      
      return totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
    },
  });

  // Fetch most difficult topics
  const { data: difficultTopics } = useQuery({
    queryKey: ['difficult-topics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_weakness_profile')
        .select('topic, section, weakness_score, total_attempts')
        .order('weakness_score', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      // Aggregate by topic
      const topicMap = new Map<string, { topic: string; section: string; avgScore: number; attempts: number }>();
      
      data?.forEach(item => {
        const key = `${item.topic}-${item.section}`;
        if (topicMap.has(key)) {
          const existing = topicMap.get(key)!;
          existing.avgScore += item.weakness_score;
          existing.attempts += item.total_attempts;
        } else {
          topicMap.set(key, {
            topic: item.topic,
            section: item.section,
            avgScore: item.weakness_score,
            attempts: item.total_attempts,
          });
        }
      });
      
      return Array.from(topicMap.values())
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 8);
    },
  });

  // Fetch user level distribution
  const { data: levelDistribution } = useQuery({
    queryKey: ['level-distribution'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_level');
      
      if (error) throw error;
      
      const levels = data?.reduce((acc: Record<string, number>, profile) => {
        const level = profile.user_level || 'مبتدئ';
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {});
      
      return Object.entries(levels || {}).map(([name, value]) => ({
        name,
        value: value as number,
      }));
    },
  });

  // Fetch section popularity
  const { data: sectionPopularity } = useQuery({
    queryKey: ['section-popularity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_exercises')
        .select('section_type');
      
      if (error) throw error;
      
      const sections = data?.reduce((acc: Record<string, number>, exercise) => {
        acc[exercise.section_type] = (acc[exercise.section_type] || 0) + 1;
        return acc;
      }, {});
      
      return Object.entries(sections || {}).map(([name, value]) => ({
        name,
        عدد_التمارين: value as number,
      }));
    },
  });

  // Fetch daily completion trend (last 7 days)
  const { data: completionTrend } = useQuery({
    queryKey: ['completion-trend'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_exercises')
        .select('completed_at, score, total_questions')
        .not('completed_at', 'is', null)
        .gte('completed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('completed_at', { ascending: true });
      
      if (error) throw error;
      
      // Group by day
      const dailyData = data?.reduce((acc: Record<string, { count: number; avgScore: number; totalScore: number; totalQuestions: number }>, exercise) => {
        const date = new Date(exercise.completed_at!).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
        
        if (!acc[date]) {
          acc[date] = { count: 0, avgScore: 0, totalScore: 0, totalQuestions: 0 };
        }
        
        acc[date].count += 1;
        acc[date].totalScore += exercise.score;
        acc[date].totalQuestions += exercise.total_questions;
        
        return acc;
      }, {});
      
      return Object.entries(dailyData || {}).map(([date, stats]) => ({
        date,
        عدد_التمارين: stats.count,
        معدل_النجاح: stats.totalQuestions > 0 ? Math.round((stats.totalScore / stats.totalQuestions) * 100) : 0,
      }));
    },
  });

  // Fetch total stats
  const { data: totalStats } = useQuery({
    queryKey: ['total-stats'],
    queryFn: async () => {
      const [usersCount, exercisesCount, questionsCount] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('daily_exercises').select('*', { count: 'exact', head: true }),
        supabase.from('quiz_results').select('*', { count: 'exact', head: true }),
      ]);
      
      return {
        users: usersCount.count || 0,
        exercises: exercisesCount.count || 0,
        quizzes: questionsCount.count || 0,
      };
    },
  });

  const isLoading = !successRate && !difficultTopics && !levelDistribution && !sectionPopularity && !completionTrend && !totalStats;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              📊 إحصائيات <span className="text-primary">المنصة</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              تحليل شامل لأداء الطلاب والمواضيع الدراسية
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card className="border-2 hover:shadow-elegant transition-smooth">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">إجمالي الطلاب</p>
                    <p className="text-3xl font-bold text-primary">{totalStats?.users || 0}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-elegant transition-smooth">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">إجمالي التمارين</p>
                    <p className="text-3xl font-bold text-secondary">{totalStats?.exercises || 0}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full gradient-secondary flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-secondary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-elegant transition-smooth">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">إجمالي الاختبارات</p>
                    <p className="text-3xl font-bold text-success">{totalStats?.quizzes || 0}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                    <Target className="w-6 h-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-elegant transition-smooth">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">معدل النجاح العام</p>
                    <p className="text-3xl font-bold text-primary">{successRate || 0}%</p>
                  </div>
                  <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Difficult Topics Chart */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-6 h-6 text-destructive" />
                  المواضيع الأكثر صعوبة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {difficultTopics && difficultTopics.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={difficultTopics} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                      <YAxis dataKey="topic" type="category" width={100} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem'
                        }}
                      />
                      <Bar dataKey="avgScore" fill="#ef4444" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد بيانات كافية حالياً
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Level Distribution Chart */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-primary" />
                  توزيع مستويات الطلاب
                </CardTitle>
              </CardHeader>
              <CardContent>
                {levelDistribution && levelDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={levelDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {levelDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد بيانات كافية حالياً
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Additional Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Section Popularity */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-6 h-6 text-secondary" />
                  الأقسام الأكثر تفاعلاً
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sectionPopularity && sectionPopularity.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sectionPopularity}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem'
                        }}
                      />
                      <Bar dataKey="عدد_التمارين" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد بيانات كافية حالياً
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Completion Trend */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-success" />
                  الأداء خلال 7 أيام
                </CardTitle>
              </CardHeader>
              <CardContent>
                {completionTrend && completionTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={completionTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem'
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="عدد_التمارين" stroke="#6366f1" strokeWidth={2} />
                      <Line type="monotone" dataKey="معدل_النجاح" stroke="#22c55e" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد بيانات كافية حالياً
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Info Section */}
          <Card className="mt-8 border-2 bg-gradient-to-br from-primary/5 to-secondary/5">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">
                💡 كيف نحسب هذه الإحصائيات؟
              </h3>
              <div className="grid md:grid-cols-3 gap-6 text-right">
                <div>
                  <h4 className="font-bold text-primary mb-2">📈 معدل النجاح</h4>
                  <p className="text-sm text-muted-foreground">
                    يُحسب بناءً على إجمالي الإجابات الصحيحة من جميع الاختبارات والتمارين
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-primary mb-2">🎯 المواضيع الصعبة</h4>
                  <p className="text-sm text-muted-foreground">
                    نحددها من خلال تحليل أنماط الأخطاء المتكررة ونسب النجاح المنخفضة
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-primary mb-2">📊 التوزيع</h4>
                  <p className="text-sm text-muted-foreground">
                    يعتمد على تصنيف الطلاب حسب أدائهم ومستوى تقدمهم في البرنامج
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PublicStats;
