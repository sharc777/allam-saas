import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, BookOpen, Video, FileText, Lock, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

export default function Lesson() {
  const { dayNumber, topicId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { subscribed, isLoading: subscriptionLoading } = useSubscription();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");

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

  const handleSaveNotes = () => {
    updateProgressMutation.mutate({ notes });
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
          <div className="lg:col-span-2 space-y-6">
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
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">ملاحظاتي</h3>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="اكتب ملاحظاتك هنا..."
                className="min-h-[200px] mb-4"
                dir="rtl"
              />
              <Button 
                onClick={handleSaveNotes} 
                className="w-full"
                disabled={updateProgressMutation.isPending}
              >
                {updateProgressMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : null}
                حفظ الملاحظات
              </Button>
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
