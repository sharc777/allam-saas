import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  BookOpen, 
  Database, 
  Settings, 
  TrendingUp,
  Plus,
  Upload,
  Brain,
  BarChart3,
  Loader2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ContentManagement } from "@/components/admin/ContentManagement";
import { SimplifiedAISettings } from "@/components/admin/SimplifiedAISettings";
import { ContentParser } from "@/components/admin/ContentParser";

const Admin = () => {
  const { loading } = useAuth(true);

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
                    <p className="text-3xl font-bold text-primary">1,234</p>
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
                    <p className="text-3xl font-bold text-secondary">30</p>
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
                    <p className="text-3xl font-bold text-success">5,678</p>
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
                    <p className="text-3xl font-bold text-primary">87%</p>
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
              <SimplifiedAISettings />
            </TabsContent>

            {/* Questions Database */}
            <TabsContent value="questions" className="space-y-6">
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-6 h-6 text-secondary" />
                      قاعدة بيانات الأسئلة
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
                  <div className="space-y-4">
                    {/* Filters */}
                    <div className="grid md:grid-cols-4 gap-4">
                      <select className="px-4 py-2 rounded-lg border-2 border-border">
                        <option>كل المواد</option>
                        <option>الرياضيات</option>
                        <option>اللغة العربية</option>
                      </select>
                      <select className="px-4 py-2 rounded-lg border-2 border-border">
                        <option>كل المستويات</option>
                        <option>سهل</option>
                        <option>متوسط</option>
                        <option>صعب</option>
                      </select>
                      <select className="px-4 py-2 rounded-lg border-2 border-border">
                        <option>كل الأنواع</option>
                        <option>اختيار من متعدد</option>
                        <option>صح/خطأ</option>
                      </select>
                      <input
                        type="text"
                        placeholder="بحث..."
                        className="px-4 py-2 rounded-lg border-2 border-border"
                      />
                    </div>

                    {/* Questions List */}
                    <div className="space-y-3">
                      {[1, 2, 3].map((q) => (
                        <div key={q} className="p-4 border-2 rounded-lg hover:border-secondary/50 transition-smooth">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">رياضيات</span>
                                <span className="px-2 py-1 text-xs rounded-full bg-secondary/10 text-secondary">متوسط</span>
                                <span className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">الجبر</span>
                              </div>
                              <p className="font-medium mb-2">ما هي قيمة x في المعادلة: 2x + 5 = 13؟</p>
                              <p className="text-sm text-muted-foreground">الإجابة الصحيحة: x = 4</p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">تعديل</Button>
                              <Button variant="outline" size="sm">حذف</Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Questions Database */}
            <TabsContent value="questions" className="space-y-6">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-6 h-6 text-success" />
                    إدارة المستخدمين
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <input
                        type="text"
                        placeholder="بحث عن مستخدم..."
                        className="flex-1 px-4 py-2 rounded-lg border-2 border-border"
                      />
                      <select className="px-4 py-2 rounded-lg border-2 border-border">
                        <option>كل المستخدمين</option>
                        <option>نشط</option>
                        <option>غير نشط</option>
                        <option>مشترك</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((user) => (
                        <div key={user} className="flex items-center justify-between p-4 border-2 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                              ط{user}
                            </div>
                            <div>
                              <h4 className="font-bold">طالب {user}</h4>
                              <p className="text-sm text-muted-foreground">student{user}@example.com</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-left">
                              <p className="text-sm font-medium">اليوم 12 من 30</p>
                              <p className="text-xs text-muted-foreground">نشط</p>
                            </div>
                            <Button variant="outline" size="sm">عرض التفاصيل</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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
