import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import Navbar from "@/components/Navbar";
import { EmbeddedQuiz } from "@/components/EmbeddedQuiz";
import { PracticeZone } from "@/components/PracticeZone";
import { StickyProgressTracker } from "@/components/StickyProgressTracker";
import { LessonContent } from "@/components/LessonContent";
import { SectionContent } from "@/components/SectionContent";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, Lock, BookOpen, Video, Lightbulb } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export default function Lesson() {
  const { dayNumber } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { subscribed, isLoading: subscriptionLoading } = useSubscription();
  const queryClient = useQueryClient();
  
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [activeSectionTab, setActiveSectionTab] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [focusSection, setFocusSection] = useState<string>();

  // Get profile
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const testType = profile?.test_type_preference || "قدرات";
  const track = profile?.track_preference || "عام";

  // Fetch content
  const { data: content, isLoading: contentLoading, refetch: refetchContent } = useQuery({
    queryKey: ["daily-content", dayNumber, testType, track],
    queryFn: async () => {
      let query = supabase
        .from("daily_content")
        .select("*")
        .eq("day_number", parseInt(dayNumber || "0"))
        .eq("is_published", true);

      if (testType) query = query.eq("test_type", testType);
      if (track && testType === "تحصيلي") query = query.eq("track", track);

      const { data } = await query.maybeSingle();
      return data;
    },
    enabled: !!dayNumber,
  });

  // Auto-parse content if sections is empty
  useEffect(() => {
    const parseContent = async () => {
      if (content && content.content_text && (!content.sections || (content.sections as any)?.length === 0)) {
        setIsParsing(true);
        try {
          const { data, error } = await supabase.functions.invoke('parse-lesson-content', {
            body: {
              contentText: content.content_text,
              title: content.title
            }
          });

          if (error) throw error;

          // Update the content with parsed sections
          const { error: updateError } = await supabase
            .from('daily_content')
            .update({ sections: data.sections })
            .eq('id', content.id);

          if (updateError) throw updateError;

          // Refetch content
          await refetchContent();
          
          toast({
            title: "تم تحليل المحتوى بنجاح",
            description: `تم تقسيم الدرس إلى ${data.sections.length} أقسام`
          });
        } catch (error) {
          console.error('Error parsing content:', error);
        } finally {
          setIsParsing(false);
        }
      }
    };

    parseContent();
  }, [content]);

  // Fetch progress
  const { data: progress } = useQuery({
    queryKey: ["student-progress", dayNumber, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("student_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("day_number", parseInt(dayNumber || "0"))
        .maybeSingle();
      
      if (data?.notes) setNotes(data.notes);
      return data;
    },
    enabled: !!user && !!dayNumber,
  });

  // Fetch quiz result
  const { data: quizResult } = useQuery({
    queryKey: ["lesson-quiz-result", content?.id, user?.id],
    queryFn: async () => {
      if (!user || !content?.id) return null;
      const { data } = await supabase
        .from("quiz_results")
        .select("*")
        .eq("user_id", user.id)
        .eq("daily_content_id", content.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!content?.id,
  });

  const hasPassedQuiz = quizResult && (quizResult.percentage || 0) >= 70;

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (updates: any) => {
      if (!user) throw new Error("User not authenticated");
      
      const updateData = {
        user_id: user.id,
        day_number: parseInt(dayNumber || "0"),
        ...updates
      };

      if (progress) {
        await supabase.from("student_progress").update(updateData).eq("id", progress.id);
      } else {
        await supabase.from("student_progress").insert([updateData]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-progress"] });
      toast({ title: "تم الحفظ بنجاح" });
    },
  });

  // Auto-save notes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (notes !== (progress?.notes || "")) {
        updateProgressMutation.mutate({ notes });
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [notes]);

  // Listen for practice weaknesses event
  useEffect(() => {
    const handlePracticeWeaknesses = () => {
      setActiveTab("practice");
    };
    
    window.addEventListener('practiceWeaknesses', handlePracticeWeaknesses);
    return () => window.removeEventListener('practiceWeaknesses', handlePracticeWeaknesses);
  }, []);

  const handleQuizComplete = (passed: boolean) => {
    if (passed) {
      updateProgressMutation.mutate({ quiz_completed: true, can_proceed_to_next: true });
    }
  };

  const handleMarkSectionComplete = (section: string) => {
    const sectionProgress = (progress?.section_progress as any) || {};
    sectionProgress[section] = true;
    
    updateProgressMutation.mutate({
      section_progress: sectionProgress,
      last_section_completed: section
    });
  };

  if (authLoading || contentLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!subscribed && (profile?.trial_days || 0) === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12 px-4">
          <Card className="max-w-md mx-auto p-12 text-center">
            <Lock className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">انتهت الفترة التجريبية</h2>
            <p className="text-muted-foreground mb-6">
              اشترك الآن للوصول لجميع الدروس
            </p>
            <Button onClick={() => navigate("/subscription")} size="lg">
              اشترك الآن
            </Button>
          </Card>
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
            <Button onClick={() => navigate("/dashboard")}>
              العودة للرئيسية
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const sections = (content.sections as any) || [];
  const keyPoints = content.key_points || [];
  const quickTips = content.quick_tips || [];

  // Set first section as active if not set
  if (sections.length > 0 && !activeSectionTab) {
    setActiveSectionTab(sections[0].id);
  }

  const sectionProgress = (progress?.section_progress as any) || {};
  const completedSections = Object.keys(sectionProgress).filter(k => sectionProgress[k]).length;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">{content.title}</h1>
              <p className="text-muted-foreground">اليوم {dayNumber} • {content.duration_minutes || 30} دقيقة</p>
            </div>
            {hasPassedQuiz && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-8 w-8" />
                <span className="font-bold text-lg">مكتمل</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Sticky Progress */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              <StickyProgressTracker
                contentCompleted={!!sectionProgress.content}
                examplesCompleted={sections.length > 0 ? completedSections === sections.length : !!sectionProgress.examples}
                practiceCompleted={!!sectionProgress.practice}
                quizCompleted={!!hasPassedQuiz}
                onMarkComplete={handleMarkSectionComplete}
              />
              
              {/* Notes */}
              <Card className="p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  📝 ملاحظاتي
                </h3>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="اكتب ملاحظاتك هنا..."
                  className="min-h-[150px] text-right"
                  dir="rtl"
                />
                {updateProgressMutation.isPending && (
                  <p className="text-xs text-muted-foreground mt-2">جاري الحفظ...</p>
                )}
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {isParsing ? (
              <Card className="p-8 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-lg font-medium">جاري تحليل المحتوى وتقسيمه...</p>
                <p className="text-sm text-muted-foreground mt-2">
                  نستخدم الذكاء الاصطناعي لتقسيم الدرس إلى أقسام سهلة الفهم
                </p>
              </Card>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="overview">📖 نظرة عامة</TabsTrigger>
                  <TabsTrigger value="sections">📚 الأقسام</TabsTrigger>
                  <TabsTrigger value="practice">✍️ تمرن</TabsTrigger>
                  <TabsTrigger value="quiz">🎯 اختبار نهائي</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6 animate-fade-in">
                  <LessonContent
                    title={content.title}
                    description={content.description}
                    videoUrl={content.video_url}
                    keyPoints={keyPoints}
                    contentText={content.content_text}
                    quickTips={quickTips}
                  />
                </TabsContent>

                {/* Sections Tab with nested tabs */}
                <TabsContent value="sections" className="animate-fade-in">
                  {sections.length > 0 ? (
                    <Tabs value={activeSectionTab} onValueChange={setActiveSectionTab}>
                      <TabsList className="grid w-full mb-6" style={{ gridTemplateColumns: `repeat(${sections.length}, 1fr)` }}>
                        {sections.map((section: any) => (
                          <TabsTrigger key={section.id} value={section.id} className="text-sm">
                            {sectionProgress[section.id] && <CheckCircle2 className="w-4 h-4 ml-1 text-green-600" />}
                            {section.title}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {sections.map((section: any) => (
                        <TabsContent key={section.id} value={section.id}>
                          <SectionContent
                            title={section.title}
                            content={section.content}
                            examples={section.examples}
                            key_points={section.key_points}
                            quick_tips={section.quick_tips}
                            onPractice={() => {
                              setFocusSection(section.title);
                              setActiveTab("practice");
                            }}
                          />
                          
                          {!sectionProgress[section.id] && (
                            <Card className="p-4 mt-6 bg-primary/5">
                              <Button
                                onClick={() => handleMarkSectionComplete(section.id)}
                                className="w-full"
                                size="lg"
                              >
                                ✓ أكملت هذا القسم
                              </Button>
                            </Card>
                          )}
                        </TabsContent>
                      ))}
                    </Tabs>
                  ) : (
                    <Card className="p-8 text-center">
                      <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        لا توجد أقسام متاحة. راجع نظرة عامة للمحتوى الكامل.
                      </p>
                    </Card>
                  )}
                </TabsContent>

                {/* Practice Tab */}
                <TabsContent value="practice" className="animate-fade-in">
                  <PracticeZone
                    contentId={content.id}
                    dayNumber={dayNumber || "1"}
                    testType={testType}
                    track={track}
                    focusSection={focusSection}
                  />
                </TabsContent>

                {/* Final Quiz Tab */}
                <TabsContent value="quiz" className="animate-fade-in">
                  <Card className="p-6">
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold mb-2">الاختبار النهائي</h3>
                      <p className="text-muted-foreground">
                        10 أسئلة شاملة - تحتاج 70% للنجاح
                      </p>
                    </div>

                    {quizResult && (
                      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium mb-2">آخر نتيجة:</p>
                        <div className="flex items-center justify-between">
                          <span className="text-3xl font-bold">
                            {quizResult.percentage?.toFixed(0)}%
                          </span>
                          {hasPassedQuiz ? (
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                          ) : (
                            <span className="text-sm text-destructive">يحتاج إعادة</span>
                          )}
                        </div>
                      </div>
                    )}

                    <EmbeddedQuiz
                      contentId={content.id}
                      dayNumber={dayNumber || "1"}
                      onComplete={handleQuizComplete}
                    />
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
