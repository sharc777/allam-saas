import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Loader2, CheckCircle2, BookOpen, Video, FileText, Lock, XCircle, Lightbulb, Zap, PenTool, Award } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { EmbeddedQuiz } from "@/components/EmbeddedQuiz";
import { PracticeZone } from "@/components/PracticeZone";

export default function Lesson() {
  const { dayNumber, topicId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { subscribed, isLoading: subscriptionLoading } = useSubscription();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [activeTab, setActiveTab] = useState("content");

  // Get profile to use preferences
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const testType = profile?.test_type_preference || "قدرات";
  const track = profile?.track_preference || "عام";

  const { data: content, isLoading: contentLoading } = useQuery({
    queryKey: ["daily-content", dayNumber, testType, track],
    queryFn: async () => {
      let query = supabase
        .from("daily_content")
        .select("*")
        .eq("day_number", parseInt(dayNumber || "0"))
        .eq("is_published", true);

      // Filter by user preferences
      if (testType) {
        query = query.eq("test_type", testType);
      }
      if (track && testType === "تحصيلي") {
        query = query.eq("track", track);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!dayNumber,
  });

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["student-progress", dayNumber, user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("student_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("day_number", parseInt(dayNumber || "0"))
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      if (data?.notes) setNotes(data.notes);
      return data;
    },
    enabled: !!user && !!dayNumber,
  });

  // Fetch quiz result for this lesson to check if passed
  const { data: quizResult } = useQuery({
    queryKey: ["lesson-quiz-result", content?.id, user?.id],
    queryFn: async () => {
      if (!user || !content?.id) return null;
      
      const { data, error } = await supabase
        .from("quiz_results")
        .select("*")
        .eq("user_id", user.id)
        .eq("daily_content_id", content.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user && !!content?.id,
  });

  const MIN_PASSING_SCORE = 70;
  const hasPassedQuiz = quizResult && (quizResult.percentage || 0) >= MIN_PASSING_SCORE;
  const canMarkComplete = hasPassedQuiz;

  const handleQuizComplete = (passed: boolean, percentage: number) => {
    if (passed) {
      updateProgressMutation.mutate({ completed: true });
    }
    setQuizStarted(false);
  };

  // Parse new content fields
  const examples = (content?.examples as any) || [];
  const keyPoints = content?.key_points || [];
  const quickTips = content?.quick_tips || [];

  const updateProgressMutation = useMutation({
    mutationFn: async ({ completed, notes: newNotes }: { completed?: boolean; notes?: string }) => {
      if (!user) throw new Error("User not authenticated");

      const updateData: any = {
        user_id: user.id,
        day_number: parseInt(dayNumber || "0"),
      };

      if (completed !== undefined) {
        updateData.content_completed = completed;
        if (completed) {
          updateData.completed_at = new Date().toISOString();
        }
      }

      if (newNotes !== undefined) {
        updateData.notes = newNotes;
      }

      if (progress) {
        const { error } = await supabase
          .from("student_progress")
          .update(updateData)
          .eq("id", progress.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("student_progress")
          .insert([updateData]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-progress"] });
      queryClient.invalidateQueries({ queryKey: ["all-progress"] });
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم تحديث تقدمك في الدرس",
      });
    },
    onError: (error) => {
      console.error("Error updating progress:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ التقدم",
        variant: "destructive",
      });
    },
  });

  const handleMarkComplete = () => {
    updateProgressMutation.mutate({ completed: true });
  };


  if (authLoading || contentLoading || progressLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if trial expired and no active subscription
  if (!subscribed && !profile?.subscription_active && (profile?.trial_days || 0) === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <Card className="border-2 border-destructive/20">
              <div className="p-12 text-center space-y-4">
                <Lock className="w-16 h-16 text-destructive mx-auto mb-4" />
                <h2 className="text-2xl font-bold">انتهت الفترة التجريبية</h2>
                <p className="text-muted-foreground">
                  اشترك الآن للحصول على وصول كامل لجميع الدروس والاختبارات
                </p>
                <Button onClick={() => navigate("/subscription")} size="lg">
                  اشترك الآن
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen" dir="rtl">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">المحتوى غير متوفر</h2>
            <p className="text-muted-foreground mb-4">
              لم يتم العثور على محتوى لهذا اليوم لتفضيلاتك الحالية ({testType} - {track})
            </p>
            <div className="space-y-3">
              <Button onClick={() => navigate("/dashboard")} className="w-full">
                العودة للرئيسية
              </Button>
              <Button variant="outline" onClick={() => navigate("/test-selection")} className="w-full">
                تغيير التفضيلات
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Handle topics structure (can be object with sections or array)
  const topicsData = content.topics as any;
  const sections = topicsData?.sections || [];
  const allSubtopics = sections.flatMap((section: any) => 
    (section.subtopics || []).map((subtopic: string, idx: number) => ({
      id: `${section.name}-${idx}`,
      title: subtopic,
      section: section.name
    }))
  );
  
  // Find current topic or use first one
  const currentTopic = allSubtopics.find((t: any) => t.id === topicId) || allSubtopics[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5" dir="rtl">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{content.title}</h1>
              <p className="text-muted-foreground">اليوم {dayNumber}</p>
            </div>
            {progress?.content_completed && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
                <span className="font-medium">مكتمل</span>
              </div>
            )}
          </div>
          
          {content.description && (
            <p className="text-lg text-muted-foreground">{content.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="content">📚 الشرح</TabsTrigger>
                <TabsTrigger value="examples">💡 أمثلة</TabsTrigger>
                <TabsTrigger value="practice">✍️ تمرن</TabsTrigger>
                <TabsTrigger value="quiz">📝 اختبار</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-6">
                {content.video_url && (
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Video className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-bold">الفيديو التعليمي</h3>
                    </div>
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                      <iframe
                        src={content.video_url}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </Card>
                )}

                {keyPoints.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>النقاط الرئيسية</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {keyPoints.map((point, idx) => (
                        <div key={idx} className="flex gap-3">
                          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <p className="flex-1 pt-1">{point}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {content.content_text && (
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-bold">الشرح التفصيلي</h3>
                    </div>
                    <div className="prose prose-lg max-w-none" dir="rtl">
                      <p className="whitespace-pre-wrap leading-relaxed">{content.content_text}</p>
                    </div>
                  </Card>
                )}

                {quickTips.length > 0 && (
                  <Card className="border-l-4 border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Zap className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
                        <div className="space-y-2">
                          <p className="font-bold">💡 نصائح سريعة</p>
                          <ul className="space-y-1 text-sm">
                            {quickTips.map((tip, idx) => (
                              <li key={idx} className="list-disc list-inside">{tip}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {sections.length > 0 && (
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-bold">المواضيع</h3>
                    </div>
                    <div className="space-y-6">
                      {sections.map((section: any, sectionIdx: number) => (
                        <div key={sectionIdx} className="space-y-3">
                          <h4 className="font-bold text-xl mb-3 text-primary">{section.name}</h4>
                          <div className="space-y-3">
                            {(section.subtopics || []).map((subtopic: string, idx: number) => (
                              <div key={idx} className="border-r-4 border-primary/50 pr-4 bg-muted/30 p-3 rounded-lg">
                                <p className="font-medium">{subtopic}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {content.learning_objectives && content.learning_objectives.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-xl font-bold mb-4">الأهداف التعليمية</h3>
                    <ul className="space-y-2">
                      {content.learning_objectives.map((objective: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <span>{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="examples" className="space-y-6">
                {examples.length > 0 ? (
                  <Accordion type="single" collapsible className="space-y-4">
                    {examples.map((example: any, idx: number) => (
                      <AccordionItem key={idx} value={`example-${idx}`} className="border rounded-lg px-4">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-yellow-500" />
                            <span>{example.title || `مثال ${idx + 1}`}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 p-4">
                            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                              <p className="font-bold mb-2">📋 المطلوب:</p>
                              <p>{example.problem}</p>
                            </div>
                            <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
                              <p className="font-bold mb-2">✅ الحل:</p>
                              <p className="text-lg font-mono">{example.solution}</p>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-lg">
                              <p className="font-bold mb-2">💭 الشرح:</p>
                              <p>{example.explanation}</p>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <Card className="p-8 text-center">
                    <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">لا توجد أمثلة متاحة حالياً</p>
                    <p className="text-sm text-muted-foreground mt-2">راجع قسم الشرح للمزيد من التفاصيل</p>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="practice" className="space-y-6">
                <Card className="p-8 text-center">
                  <PenTool className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">التمارين التدريبية قريباً</p>
                  <p className="text-sm text-muted-foreground">
                    يمكنك البدء بالاختبار النهائي من تبويب "اختبار"
                  </p>
                </Card>
              </TabsContent>

              <TabsContent value="quiz" className="space-y-6">
                <Card className="p-6">
                  {!quizStarted ? (
                    <div className="space-y-4">
                      <div className="mb-6">
                        <h3 className="text-2xl font-bold mb-2">اختبار الدرس</h3>
                        <p className="text-muted-foreground">
                          10 أسئلة - تحتاج {MIN_PASSING_SCORE}% للنجاح
                        </p>
                      </div>
                      {quizResult && (
                        <div className="p-4 bg-muted/50 rounded-lg mb-4">
                          <p className="text-sm font-medium mb-2">آخر نتيجة:</p>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold">{quizResult.percentage?.toFixed(0)}%</span>
                            {hasPassedQuiz ? (
                              <CheckCircle2 className="h-6 w-6 text-success" />
                            ) : (
                              <XCircle className="h-6 w-6 text-destructive" />
                            )}
                          </div>
                          <Progress value={quizResult.percentage || 0} className="mt-2 h-2" />
                        </div>
                      )}
                      <Button onClick={() => setQuizStarted(true)} size="lg" className="w-full">
                        {quizResult ? "إعادة الاختبار" : "ابدأ الاختبار الآن"} 🚀
                      </Button>
                    </div>
                  ) : (
                    <EmbeddedQuiz
                      contentId={content.id}
                      dayNumber={dayNumber || "1"}
                      onComplete={handleQuizComplete}
                    />
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card className="p-4 sticky top-24">
              <h4 className="font-bold mb-3">تقدمك في الدرس</h4>
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    activeTab === "content" || progress?.content_completed 
                      ? "bg-success text-white" 
                      : "bg-muted"
                  }`}>
                    <BookOpen className="w-3 h-3" />
                  </div>
                  <span className="text-sm">قراءة المحتوى</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    activeTab === "examples" ? "bg-success text-white" : "bg-muted"
                  }`}>
                    <Lightbulb className="w-3 h-3" />
                  </div>
                  <span className="text-sm">مراجعة الأمثلة</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    hasPassedQuiz ? "bg-success text-white" : "bg-muted"
                  }`}>
                    <Award className="w-3 h-3" />
                  </div>
                  <span className="text-sm">اجتياز الاختبار</span>
                </div>
              </div>
              <Progress 
                value={hasPassedQuiz ? 100 : activeTab === "quiz" ? 75 : activeTab === "examples" ? 50 : 25} 
                className="mb-2" 
              />
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">ملاحظاتي</h3>
                {isSavingNotes && (
                  <span className="text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    جاري الحفظ...
                  </span>
                )}
              </div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="اكتب ملاحظاتك هنا... (يتم الحفظ تلقائياً بعد 1.5 ثانية)"
                className="min-h-[200px]"
                dir="rtl"
              />
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">حالة الدرس</h3>
              
              {progress?.content_completed ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-success mb-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">تم إكمال الدرس بنجاح! 🎉</span>
                  </div>
                  {quizResult && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">نتيجة الاختبار</span>
                        <span className="font-bold text-success">{quizResult.percentage?.toFixed(0)}%</span>
                      </div>
                      <Progress value={quizResult.percentage || 0} className="h-2" />
                    </div>
                  )}
                </div>
              ) : !hasPassedQuiz ? (
                <div className="space-y-3">
                  <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-lg">
                    <p className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                      <span className="text-lg">📋</span>
                      متطلبات إتمام الدرس
                    </p>
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-2.5 text-sm">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">1</span>
                        <span className="text-foreground/90">أكمل اختبار الدرس من الأسفل</span>
                      </div>
                      <div className="flex items-start gap-2.5 text-sm">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">2</span>
                        <span className="text-foreground/90">احصل على <strong className="text-primary">{MIN_PASSING_SCORE}%</strong> أو أكثر للنجاح</span>
                      </div>
                      <div className="flex items-start gap-2.5 text-sm">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-success/20 text-success flex items-center justify-center font-bold text-xs">✓</span>
                        <span className="text-foreground/90">سيتم الإكمال <strong className="text-success">تلقائياً</strong> عند النجاح</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* المرحلة 3: عرض progress bar للنتيجة */}
                  {quizResult && quizResult.percentage !== undefined && (
                    <div className={`p-4 border-2 rounded-lg ${
                      quizResult.percentage < MIN_PASSING_SCORE 
                        ? 'bg-destructive/5 border-destructive/30' 
                        : 'bg-success/5 border-success/30'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {quizResult.percentage < MIN_PASSING_SCORE ? (
                          <XCircle className="h-5 w-5 text-destructive" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        )}
                        <p className="text-sm font-semibold">
                          نتيجتك الحالية: {quizResult.percentage.toFixed(0)}%
                        </p>
                      </div>
                      <Progress 
                        value={quizResult.percentage} 
                        className={`h-2.5 mb-2 ${
                          quizResult.percentage < MIN_PASSING_SCORE ? '[&>div]:bg-destructive' : '[&>div]:bg-success'
                        }`}
                      />
                      <p className={`text-xs ${
                        quizResult.percentage < MIN_PASSING_SCORE ? 'text-destructive' : 'text-success'
                      }`}>
                        {quizResult.percentage < MIN_PASSING_SCORE 
                          ? `تحتاج ${(MIN_PASSING_SCORE - quizResult.percentage).toFixed(0)}% إضافية - حاول مرة أخرى! 💪`
                          : 'ممتاز! لقد حققت الحد الأدنى ✓'
                        }
                      </p>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleMarkComplete}
                    disabled={true}
                    className="w-full"
                    variant="outline"
                  >
                    <Lock className="h-4 w-4 ml-2" />
                    أكمل الاختبار أولاً ({MIN_PASSING_SCORE}%+)
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-success/5 border-2 border-success/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <p className="text-sm font-semibold text-success">
                        أحسنت! لقد نجحت في الاختبار
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">نتيجتك</span>
                        <span className="font-bold text-success">{quizResult?.percentage?.toFixed(0)}%</span>
                      </div>
                      <Progress value={quizResult?.percentage || 0} className="h-2.5 [&>div]:bg-success" />
                    </div>
                  </div>
                  <Button 
                    onClick={handleMarkComplete}
                    disabled={updateProgressMutation.isPending}
                    className="w-full gradient-primary"
                  >
                    {updateProgressMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 ml-2" />
                    )}
                    تأكيد إتمام الدرس
                  </Button>
                </div>
              )}
            </Card>

            <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">📝</span>
                <h3 className="text-xl font-bold">اختبار الدرس</h3>
              </div>
              <p className="text-muted-foreground mb-4 text-sm">
                اختبر معلوماتك في محتوى هذا الدرس. الحد الأدنى للنجاح: <strong className="text-primary">{MIN_PASSING_SCORE}%</strong>
              </p>
              <Button 
                onClick={() => navigate(`/quiz?day=${dayNumber}&contentId=${content.id}`)}
                className="w-full gradient-primary"
              >
                {quizResult && quizResult.percentage && quizResult.percentage < MIN_PASSING_SCORE 
                  ? '🔄 إعادة الاختبار' 
                  : progress?.content_completed 
                  ? '📊 مراجعة الاختبار'
                  : '▶️ ابدأ اختبار الدرس'
                }
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
