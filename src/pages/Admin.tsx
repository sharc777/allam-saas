import { useState } from "react";
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
import { UnifiedFileManager } from "@/components/admin/UnifiedFileManager";
import { PackageManager } from "@/components/admin/PackageManager";
import { UserManagementDialog } from "@/components/admin/UserManagementDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const Admin = () => {
  const { loading } = useAuth(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);

  // Fetch statistics with caching
  const { data: studentsCount } = useQuery({
    queryKey: ['students-count'],
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const { data: lessonsCount } = useQuery({
    queryKey: ['lessons-count'],
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { count } = await supabase
        .from('daily_content')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const { data: questionsCount } = useQuery({
    queryKey: ['questions-count'],
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { count } = await supabase
        .from('questions_bank')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const { data: completionRate } = useQuery({
    queryKey: ['completion-rate'],
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
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
              <TabsTrigger value="content">📚 المحتوى</TabsTrigger>
              <TabsTrigger value="files">📁 الملفات</TabsTrigger>
              <TabsTrigger value="ai">🤖 AI</TabsTrigger>
              <TabsTrigger value="packages">💳 الباقات</TabsTrigger>
              <TabsTrigger value="users">👥 المستخدمين</TabsTrigger>
            </TabsList>

            {/* Content Management */}
            <TabsContent value="content" className="space-y-6">
              <ContentManagement />
            </TabsContent>

            {/* Unified File Manager */}
            <TabsContent value="files" className="space-y-6">
              <UnifiedFileManager />
            </TabsContent>

            {/* AI Settings */}
            <TabsContent value="ai" className="space-y-6">
              <AIContentManager />
            </TabsContent>

            {/* Packages Management */}
            <TabsContent value="packages" className="space-y-6">
              <PackageManager />
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
                        <div key={user.id} className="flex items-center justify-between p-4 border-2 rounded-lg hover:border-primary/30 transition-smooth">
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
                                <Badge variant="outline">{user.role === "admin" ? "أدمن" : "طالب"}</Badge>
                                <Badge variant="outline">{user.test_type_preference}</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-left">
                              <p className="text-sm font-medium">اليوم {user.current_day} من 30</p>
                              <p className="text-xs text-muted-foreground">
                                {user.total_points} نقطة • {user.streak_days} يوم متتالي
                              </p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsUserDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4 ml-2" />
                              إدارة
                            </Button>
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

      <UserManagementDialog
        user={selectedUser}
        isOpen={isUserDialogOpen}
        onClose={() => {
          setIsUserDialogOpen(false);
          setSelectedUser(null);
        }}
      />
    </div>
  );
};

export default Admin;
