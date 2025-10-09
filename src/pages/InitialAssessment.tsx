import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Brain } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  subject: string;
  difficulty: string;
  explanation?: string;
}

const InitialAssessment = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [testType, setTestType] = useState<string>("");
  const [track, setTrack] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchUserPreferencesAndQuestions();
  }, []);

  const fetchUserPreferencesAndQuestions = async (retryCount = 0) => {
    try {
      setIsLoading(true);
      setError(false);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "خطأ",
          description: "يجب تسجيل الدخول أولاً",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // جلب تفضيلات المستخدم
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("test_type_preference, track_preference, initial_assessment_completed")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw new Error("فشل في تحميل معلومات المستخدم");
      }

      if (profile?.initial_assessment_completed) {
        toast({
          title: "تم الإكمال",
          description: "لقد أكملت التقييم الأولي مسبقاً",
        });
        navigate("/dashboard");
        return;
      }

      setTestType(profile?.test_type_preference || "قدرات");
      setTrack(profile?.track_preference || "عام");

      console.log("Fetching initial assessment questions with mode: initial_assessment");

      // توليد أسئلة التقييم الأولي
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: {
          testType: profile?.test_type_preference || "قدرات",
          track: profile?.track_preference || "عام",
          mode: "initial_assessment",
          difficulty: "medium"
        },
      });

      if (error) {
        console.error("Function error:", error);
        
        // Retry logic for transient errors
        if (retryCount < 2 && error.message?.includes("429")) {
          toast({
            title: "جاري إعادة المحاولة...",
            description: "الرجاء الانتظار",
          });
          await new Promise(resolve => setTimeout(resolve, 2000));
          return fetchUserPreferencesAndQuestions(retryCount + 1);
        }
        
        const errorMsg = error.message || "فشل في توليد الأسئلة";
        throw new Error(errorMsg);
      }

      if (!data?.questions || data.questions.length === 0) {
        throw new Error("لم يتم توليد الأسئلة بشكل صحيح");
      }

      // Show warning if partial quiz returned
      if (data.warning) {
        toast({
          title: "تنبيه",
          description: data.warning,
          variant: "default",
        });
      }

      if (data.questions.length < 20) {
        console.warn(`Warning: Expected 25 questions, got ${data.questions.length}`);
      }

      console.log(`Successfully loaded ${data.questions.length} questions`);
      setQuestions(data.questions);
    } catch (error: any) {
      console.error("Error fetching questions:", error);
      const errorMessage = error.message || "حدث خطأ في تحميل الأسئلة";
      
      if (errorMessage.includes("429")) {
        toast({
          title: "خطأ",
          description: "تم تجاوز الحد المسموح. يرجى المحاولة بعد دقيقة.",
          variant: "destructive",
        });
      } else if (errorMessage.includes("402")) {
        toast({
          title: "خطأ",
          description: "خطأ في النظام. يرجى الاتصال بالدعم.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "خطأ",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: answer,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    const unansweredCount = questions.length - Object.keys(selectedAnswers).length;
    
    if (unansweredCount > 0) {
      toast({
        title: "تنبيه",
        description: `لديك ${unansweredCount} سؤال/أسئلة لم تتم الإجابة عليها`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // حساب النتيجة
      let correctCount = 0;
      const detailedResults = questions.map((q, idx) => {
        const userAnswer = selectedAnswers[idx];
        const isCorrect = userAnswer === q.correct_answer;
        if (isCorrect) correctCount++;
        
        return {
          question: q.question_text,
          user_answer: userAnswer,
          correct_answer: q.correct_answer,
          is_correct: isCorrect,
          subject: q.subject,
          difficulty: q.difficulty,
          explanation: q.explanation,
        };
      });

      const percentage = (correctCount / questions.length) * 100;

      // إرسال للتحليل بواسطة AI
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "analyze-initial-assessment",
        {
          body: {
            userId: user.id,
            testType,
            track,
            results: detailedResults,
            totalScore: correctCount,
            totalQuestions: questions.length,
            percentage,
          },
        }
      );

      if (analysisError) throw analysisError;

      // حفظ النتائج
      const { error: insertError } = await supabase
        .from("initial_assessments")
        .insert([{
          user_id: user.id,
          test_type: testType as any,
          track: track as any,
          total_score: correctCount,
          percentage,
          strengths: analysisData.strengths || [],
          weaknesses: analysisData.weaknesses || [],
          recommended_topics: analysisData.recommended_topics || [],
          level: analysisData.level || "مبتدئ",
          questions: detailedResults as any,
        }]);

      if (insertError) throw insertError;

      // تحديث الملف الشخصي
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          initial_assessment_completed: true,
          user_level: analysisData.level || "مبتدئ",
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast({
        title: "تم بنجاح! 🎉",
        description: "تم حفظ نتائج التقييم الأولي",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Error submitting assessment:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ النتائج",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-accent/20">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-lg font-medium">جاري تحضير اختبار التقييم الأولي...</p>
            <p className="text-sm text-muted-foreground text-center">
              سيتم توليد 25 سؤالاً لتقييم مستواك بدقة
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-accent/20 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="text-destructive text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold">حدث خطأ</h2>
            <p className="text-muted-foreground">
              لم نتمكن من تحميل أسئلة التقييم الأولي. يرجى المحاولة مرة أخرى.
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  setError(false);
                  fetchUserPreferencesAndQuestions();
                }} 
                className="flex-1"
              >
                إعادة المحاولة
              </Button>
              <Button 
                onClick={() => navigate("/dashboard")} 
                variant="outline"
                className="flex-1"
              >
                العودة للوحة التحكم
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-accent/20">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <XCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="text-lg">لم نتمكن من تحميل الأسئلة</p>
            <Button onClick={() => navigate("/dashboard")}>العودة للوحة التحكم</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5 py-8 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Brain className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl">الاختبار التشخيصي الأولي</CardTitle>
            <CardDescription className="text-primary-foreground/80">
              سيساعدنا هذا الاختبار في تحديد مستواك وتخصيص المحتوى المناسب لك
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Progress */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                السؤال {currentQuestionIndex + 1} من {questions.length}
              </span>
              <span className="text-muted-foreground">
                تمت الإجابة على {answeredCount} من {questions.length}
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </CardContent>
        </Card>

        {/* Question */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                {currentQuestionIndex + 1}
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl leading-relaxed">
                  {currentQuestion.question_text}
                </CardTitle>
                <div className="flex gap-2 mt-3">
                  <span className="text-xs px-2 py-1 bg-accent rounded-full">
                    {currentQuestion.subject}
                  </span>
                  <span className="text-xs px-2 py-1 bg-accent rounded-full">
                    {currentQuestion.difficulty}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selectedAnswers[currentQuestionIndex] || ""}
              onValueChange={handleAnswerSelect}
              className="space-y-3"
            >
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedAnswers[currentQuestionIndex] === option;
                return (
                  <div
                    key={idx}
                    onClick={() => handleAnswerSelect(option)}
                    className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                      isSelected
                        ? "bg-primary/10 border-primary shadow-md"
                        : "hover:bg-accent/50 hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center h-6 mt-1">
                      <RadioGroupItem 
                        value={option} 
                        id={`q${currentQuestionIndex}-option-${idx}`} 
                        className="w-5 h-5" 
                      />
                    </div>
                    <Label
                      htmlFor={`q${currentQuestionIndex}-option-${idx}`}
                      className="flex-1 text-right cursor-pointer leading-relaxed"
                    >
                      {option}
                    </Label>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="w-32"
              >
                السابق
              </Button>

              {currentQuestionIndex === questions.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || answeredCount < questions.length}
                  className="w-48"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جاري التحليل...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                      إنهاء وتحليل النتائج
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="w-32"
                >
                  التالي
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InitialAssessment;
