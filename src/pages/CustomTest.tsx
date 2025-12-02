import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Brain, ArrowRight, ArrowLeft } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
import { usePerformanceTracking, generateQuestionHash } from "@/hooks/usePerformanceTracking";

interface Question {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  topic: string;
}

interface LocationState {
  topic: string;
  questionCount: number;
  difficulty: "easy" | "medium" | "hard";
  section: string;
}

const CustomTest = () => {
  return (
    <SubscriptionGuard>
      <CustomTestContent />
    </SubscriptionGuard>
  );
};

const CustomTestContent = () => {
  const location = useLocation();
  const state = location.state as LocationState;
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [startTime] = useState(Date.now());
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<number, number>>({});
  
  const trackPerformance = usePerformanceTracking();

  useEffect(() => {
    if (!state?.topic) {
      toast({
        title: "خطأ",
        description: "يجب تحديد موضوع الاختبار",
        variant: "destructive"
      });
      navigate("/dashboard");
      return;
    }

    generateCustomTest();
  }, []);

  const generateCustomTest = async () => {
    try {
      setLoading(true);
      
      if (!profile?.id) {
        throw new Error("يجب تسجيل الدخول أولاً");
      }

      // Check custom test limit
      const { data: limitCheckRaw, error: limitError } = await supabase.rpc(
        'check_custom_test_limit',
        { p_user_id: profile.id }
      );

      if (limitError) {
        console.error("Error checking limit:", limitError);
        throw new Error("فشل التحقق من الحد اليومي");
      }

      const limitCheck = limitCheckRaw as any;

      if (!limitCheck?.can_create) {
        toast({
          title: "تجاوزت الحد اليومي",
          description: `لقد استخدمت ${limitCheck.current_count} من ${limitCheck.max_tests} اختبار مخصص اليوم. ${limitCheck.message}`,
          variant: "destructive"
        });
        navigate("/dashboard");
        return;
      }
      
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: {
          mode: "practice",
          difficulty: state.difficulty,
          sectionFilter: state.section,
          questionCount: state.questionCount,
          topicFilter: state.topic,
        },
      });

      if (error) {
        if (error.message?.includes("429")) {
          throw new Error("تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة بعد قليل.");
        }
        if (error.message?.includes("402")) {
          throw new Error("يرجى إضافة رصيد إلى حساب Lovable AI.");
        }
        throw error;
      }

      if (data?.warning) {
        toast({
          title: "تحذير",
          description: data.warning,
          variant: "default",
        });
      }

      setQuestions(data.questions);
      setSelectedAnswers(new Array(data.questions.length).fill(""));

      // Increment custom test count
      await supabase.rpc('increment_custom_test_count', { p_user_id: profile.id });
    } catch (error: any) {
      console.error("Error generating custom test:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل توليد الاختبار المخصص",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answer;
    setSelectedAnswers(newAnswers);
    
    // Track performance for this question
    const question = questions[currentQuestion];
    const questionStartTime = questionStartTimes[currentQuestion] || Date.now();
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    
    trackPerformance.mutate({
      questionHash: generateQuestionHash(question.question_text, question.options),
      topic: question.topic || state.topic,
      section: state.section,
      difficulty: state.difficulty as 'easy' | 'medium' | 'hard',
      isCorrect: answer === question.correct_answer,
      timeSpentSeconds: timeSpent,
      metadata: {
        questionText: question.question_text,
        testType: profile?.test_type_preference || "قدرات",
        testTypeCategory: 'custom_test',
        userAnswer: answer,
        correctAnswer: question.correct_answer,
        custom_topic: state.topic,
        question_index: currentQuestion
      }
    });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      const nextQuestion = currentQuestion + 1;
      setCurrentQuestion(nextQuestion);
      // Start timer for next question
      setQuestionStartTimes(prev => ({
        ...prev,
        [nextQuestion]: Date.now()
      }));
    } else {
      submitTest();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const submitTest = async () => {
    try {
      setLoading(true);

      if (!profile?.id || !questions || questions.length === 0) {
        throw new Error("بيانات غير صالحة");
      }

      const timeTaken = Math.floor((Date.now() - startTime) / 60000);
      let correctAnswers = 0;

      questions.forEach((q, index) => {
        if (selectedAnswers[index] === q.correct_answer) {
          correctAnswers++;
        }
      });

      const score = Math.round((correctAnswers / questions.length) * 100);

      const questionsWithAnswers = questions.map((q, index) => ({
        ...q,
        user_answer: selectedAnswers[index],
        is_correct: selectedAnswers[index] === q.correct_answer,
      }));

      // Save to daily_exercises with custom test marker
      const { data: savedExercise, error: saveError } = await supabase
        .from("daily_exercises")
        .insert([{
          user_id: profile.id,
          day_number: null,
          exercise_type: 'custom',
          custom_topic: state.topic,
          section_type: state.section,
          test_type: "قدرات",
          questions: questionsWithAnswers,
          score: score,
          total_questions: questions.length,
          time_taken_minutes: timeTaken,
          completed_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (saveError || !savedExercise) {
        throw new Error(`فشل حفظ الاختبار: ${saveError?.message}`);
      }

      // Log questions to prevent repetition
      const questionLogs = questions.map(q => ({
        user_id: profile.id,
        day_number: null,
        question_hash: JSON.stringify(q.question_text + q.options.join('')),
        question_data: JSON.parse(JSON.stringify(q))
      }));

      await supabase.from("generated_questions_log").insert(questionLogs);

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ["exercise-history", profile.id] });

      // Calculate performance
      await supabase.functions.invoke("calculate-performance", {
        body: {
          exerciseId: savedExercise.id,
        },
      });

      setShowResults(true);
    } catch (error: any) {
      console.error("Error in submitTest:", error);
      toast({
        title: "خطأ في حفظ الاختبار",
        description: error.message || "فشل حفظ النتائج",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && questions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <Card className="border-2">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <div className="text-center">
                    <h3 className="text-xl font-bold mb-2">جاري إنشاء اختبارك المخصص...</h3>
                    <p className="text-muted-foreground">
                      يتم تحضير {state?.questionCount} سؤال في موضوع "{state?.topic}"
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestionData = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  if (showResults) {
    const correctAnswers = questions.filter(
      (q, index) => selectedAnswers[index] === q.correct_answer
    ).length;
    const score = (correctAnswers / questions.length) * 100;
    const passed = score >= 70;

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-4xl space-y-6">
            <Card className={`border-2 ${passed ? 'border-green-500' : 'border-yellow-500'}`}>
              <CardHeader>
                <CardTitle className="text-center text-3xl">
                  {passed ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle2 className="w-8 h-8" />
                      أحسنت! نتيجة ممتازة
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-yellow-600">
                      <Brain className="w-8 h-8" />
                      مجهود جيد، استمر في التدريب
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">اختبار مخصص: {state?.topic}</p>
                  <p className="text-6xl font-bold text-primary">{score.toFixed(0)}%</p>
                  <p className="text-lg text-muted-foreground">
                    {correctAnswers} من {questions.length} إجابات صحيحة
                  </p>
                </div>

                <div className="space-y-4">
                  {questions.map((q, index) => {
                    const isCorrect = selectedAnswers[index] === q.correct_answer;
                    const wasAnswered = selectedAnswers[index] !== "";

                    return (
                      <Card key={index} className={`border-2 ${
                        isCorrect ? 'border-green-500' : wasAnswered ? 'border-red-500' : 'border-yellow-500'
                      }`}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start gap-2">
                            {isCorrect ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600 mt-1" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600 mt-1" />
                            )}
                            <div className="flex-1 text-right" dir="rtl">
                              <p className="font-semibold">{q.question_text}</p>
                              {!isCorrect && wasAnswered && (
                                <div className="mt-2 space-y-1">
                                  <p className="text-sm text-red-600">
                                    إجابتك: {selectedAnswers[index]}
                                  </p>
                                  <p className="text-sm text-green-600">
                                    الإجابة الصحيحة: {q.correct_answer}
                                  </p>
                                </div>
                              )}
                              {!wasAnswered && (
                                <p className="text-sm text-yellow-600 mt-2">
                                  لم يتم الإجابة - الإجابة الصحيحة: {q.correct_answer}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground mt-2">
                                {q.explanation}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={() => navigate("/dashboard")}
                    variant="outline"
                    className="flex-1"
                  >
                    العودة للوحة التحكم
                  </Button>
                  <Button
                    onClick={() => navigate("/weakness-analysis")}
                    className="flex-1 gradient-primary text-primary-foreground"
                  >
                    تحليل نقاط الضعف
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between mb-4" dir="rtl">
                <Badge className="text-base px-3 py-1">
                  السؤال {currentQuestion + 1} من {questions.length}
                </Badge>
                <Badge variant="outline" className="text-base px-3 py-1">
                  اختبار مخصص: {state?.topic}
                </Badge>
              </div>
              <Progress value={progress} className="h-2" />
            </CardHeader>

            <CardContent className="space-y-6">
              {currentQuestionData && (
                <>
                  <div className="space-y-4" dir="rtl">
                    <h3 className="text-xl font-bold leading-relaxed text-right">
                      {currentQuestionData.question_text}
                    </h3>

                    <RadioGroup
                      value={selectedAnswers[currentQuestion]}
                      onValueChange={handleAnswerSelect}
                      className="space-y-3"
                      dir="rtl"
                    >
                      {currentQuestionData.options?.map((option, index) => (
                        <div
                          key={index}
                          className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                            selectedAnswers[currentQuestion] === option
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                          dir="rtl"
                        >
                          <RadioGroupItem value={option} id={`option-${index}`} />
                          <Label
                            htmlFor={`option-${index}`}
                            className="flex-1 cursor-pointer text-base text-right"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="flex gap-3 pt-4" dir="rtl">
                    <Button
                      onClick={handleNext}
                      disabled={!selectedAnswers[currentQuestion]}
                      className="flex-1 gradient-primary text-primary-foreground"
                    >
                      <ArrowLeft className="w-4 h-4 ml-2" />
                      {currentQuestion === questions.length - 1 ? "إنهاء الاختبار" : "التالي"}
                    </Button>
                    <Button
                      onClick={handlePrevious}
                      disabled={currentQuestion === 0}
                      variant="outline"
                      className="flex-1"
                    >
                      السابق
                      <ArrowRight className="w-4 h-4 mr-2" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomTest;
