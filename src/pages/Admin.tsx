import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  BookOpen, 
  Database, 
  TrendingUp,
  Plus,
  Upload,
  Loader2,
  Edit,
  Trash2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ContentManagement } from "@/components/admin/ContentManagement";
import { AIContentManager } from "@/components/admin/AIContentManager";
import { ContentParser } from "@/components/admin/ContentParser";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const Admin = () => {
  const { loading } = useAuth(true);

  // Fetch real statistics
  const { data: studentsCount } = useQuery({
    queryKey: ['students-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const { data: lessonsCount } = useQuery({
    queryKey: ['lessons-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('daily_content')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const { data: questionsCount } = useQuery({
    queryKey: ['questions-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('questions_bank')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const { data: completionRate } = useQuery({
    queryKey: ['completion-rate'],
    queryFn: async () => {
      const { count: completed } = await supabase
        .from('student_progress')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_completed', true);
      
      const { count: total } = await supabase
        .from('student_progress')
        .select('*', { count: 'exact', head: true });
      
      if (!total || total === 0) return 0;
      return Math.round(((completed || 0) / total) * 100);
    }
  });

  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['questions-bank'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions_bank')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    }
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">
              لوحة تحكم <span className="text-primary">الأدمن</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              إدارة المنصة والمحتوى التعليمي
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card className="border-2">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">إجمالي الطلاب</p>
                    <p className="text-3xl font-bold text-primary">
                      {studentsCount !== undefined ? studentsCount : <Loader2 className="w-6 h-6 animate-spin" />}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">الدروس</p>
                    <p className="text-3xl font-bold text-secondary">
                      {lessonsCount !== undefined ? lessonsCount : <Loader2 className="w-6 h-6 animate-spin" />}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full gradient-secondary flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-secondary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">الأسئلة</p>
                    <p className="text-3xl font-bold text-success">
                      {questionsCount !== undefined ? questionsCount : <Loader2 className="w-6 h-6 animate-spin" />}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                    <Database className="w-6 h-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">معدل الإكمال</p>
                    <p className="text-3xl font-bold text-primary">
                      {completionRate !== undefined ? `${completionRate}%` : <Loader2 className="w-6 h-6 animate-spin" />}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="content" className="space-y-6" dir="rtl">
            <TabsList className="grid w-full grid-cols-5 lg:w-auto">
              <TabsTrigger value="content">المحتوى</TabsTrigger>
              <TabsTrigger value="parser">رفع محتوى</TabsTrigger>
              <TabsTrigger value="ai">إدارة AI</TabsTrigger>
              <TabsTrigger value="questions">بنك الأسئلة</TabsTrigger>
              <TabsTrigger value="users">المستخدمين</TabsTrigger>
            </TabsList>

            {/* Content Management */}
            <TabsContent value="content" className="space-y-6">
              <ContentManagement />
            </TabsContent>

            {/* Content Parser */}
            <TabsContent value="parser" className="space-y-6">
              <ContentParser />
            </TabsContent>

            {/* AI Settings */}
            <TabsContent value="ai" className="space-y-6">
              <AIContentManager />
            </TabsContent>

            {/* Questions Database */}
            <TabsContent value="questions" className="space-y-6">
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-6 h-6 text-secondary" />
                      بنك الأسئلة ({questionsCount || 0})
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline">
                        <Upload className="ml-2 w-4 h-4" />
                        رفع ملف Excel
                      </Button>
                      <Button className="gradient-secondary text-secondary-foreground">
                        <Plus className="ml-2 w-4 h-4" />
                        إضافة سؤال
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {questionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                  ) : questions && questions.length > 0 ? (
                    <div className="space-y-3">
                      {questions.map((q) => (
                        <div key={q.id} className="p-4 border-2 rounded-lg hover:border-secondary/50 transition-smooth">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary">{q.subject}</Badge>
                                <Badge variant={
                                  q.difficulty === 'easy' ? 'default' :
                                  q.difficulty === 'medium' ? 'secondary' : 'destructive'
                                }>{q.difficulty === 'easy' ? 'سهل' : q.difficulty === 'medium' ? 'متوسط' : 'صعب'}</Badge>
                                {q.topic && <Badge variant="outline">{q.topic}</Badge>}
                              </div>
                              <p className="font-medium mb-2">{q.question_text}</p>
                              <p className="text-sm text-muted-foreground">الإجابة الصحيحة: {q.correct_answer}</p>
                              {q.usage_count > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  استخدمت {q.usage_count} مرة
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>لا توجد أسئلة في البنك حالياً</p>
                      <Button className="mt-4" variant="outline">
                        <Plus className="ml-2 w-4 h-4" />
                        إضافة أول سؤال
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users Management */}
            <TabsContent value="users" className="space-y-6">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-6 h-6 text-success" />
                    إدارة المستخدمين ({studentsCount || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                  ) : users && users.length > 0 ? (
                    <div className="space-y-3">
                      {users.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-4 border-2 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                              {user.full_name?.charAt(0) || 'ط'}
                            </div>
                            <div>
                              <h4 className="font-bold">{user.full_name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={user.subscription_active ? 'default' : 'secondary'}>
                                  {user.subscription_active ? 'مشترك' : `تجريبي (${user.trial_days} أيام)`}
                                </Badge>
                                <Badge variant="outline">{user.role}</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-left">
                              <p className="text-sm font-medium">اليوم {user.current_day} من 30</p>
                              <p className="text-xs text-muted-foreground">
                                {user.total_points} نقطة - {user.streak_days} يوم متتالي
                              </p>
                            </div>
                            <Button variant="outline" size="sm">عرض التفاصيل</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>لا يوجد مستخدمين مسجلين حالياً</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Admin;
