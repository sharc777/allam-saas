import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import { Brain, Loader2, CheckCircle2, TrendingUp, Target } from "lucide-react";

interface Question {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  topic: string;
  subject: string;
  difficulty: string;
}

const InitialAssessment = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<'welcome' | 'quiz' | 'results'>('welcome');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [results, setResults] = useState<any>(null);

  const startAssessment = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: {
          mode: "assessment",
          questionCount: 15,
        },
      });

      if (error) throw error;

      setQuestions(data.questions);
      setSelectedAnswers(new Array(data.questions.length).fill(""));
      setStep('quiz');
    } catch (error: any) {
      console.error("Error generating assessment:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل تحضير التقييم",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answer;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      submitAssessment();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const submitAssessment = async () => {
    try {
      setLoading(true);

      let correctAnswers = 0;
      const questionsWithAnswers = questions.map((q, index) => {
        const isCorrect = selectedAnswers[index] === q.correct_answer;
        if (isCorrect) correctAnswers++;
        return {
          ...q,
          user_answer: selectedAnswers[index],
          is_correct: isCorrect,
        };
      });

      const totalScore = correctAnswers;
      const percentage = (correctAnswers / questions.length) * 100;

      // Save initial assessment
      const { error: saveError } = await supabase
        .from("initial_assessments")
        .insert({
          user_id: profile!.id,
          test_type: profile!.test_type_preference,
          questions: questionsWithAnswers,
          total_score: totalScore,
          percentage: percentage,
          level: percentage >= 80 ? "متقدم" : percentage >= 60 ? "متوسط" : "مبتدئ",
        });

      if (saveError) throw saveError;

      // Update profile
      await supabase
        .from("profiles")
        .update({ 
          initial_assessment_completed: true,
          user_level: percentage >= 80 ? "متقدم" : percentage >= 60 ? "متوسط" : "مبتدئ"
        })
        .eq("id", profile!.id);

      queryClient.invalidateQueries({ queryKey: ["profile"] });

      setResults({
        score: totalScore,
        total: questions.length,
        percentage: percentage,
        level: percentage >= 80 ? "متقدم" : percentage >= 60 ? "متوسط" : "مبتدئ",
        questions: questionsWithAnswers,
      });

      setStep('results');
    } catch (error: any) {
      console.error("Error submitting assessment:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل حفظ نتائج التقييم",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  // Welcome Screen
  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-3xl">
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center">
                    <Brain className="w-8 h-8 text-primary-foreground" />
                  </div>
                </div>
                <CardTitle className="text-3xl text-center">
                  التقييم الأولي
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-4">
                  <p className="text-lg text-muted-foreground">
                    مرحباً بك في تحدي الـ30 يوم!
                  </p>
                  <p className="text-muted-foreground">
                    سنبدأ بتقييم سريع لتحديد مستواك الحالي وتخصيص المحتوى المناسب لك.
                  </p>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>15 سؤال متنوع</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>يستغرق حوالي 15-20 دقيقة</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>تحليل فوري لنتائجك</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>خطة دراسية مخصصة</span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={startAssessment}
                  disabled={loading}
                  size="lg"
                  className="w-full gradient-primary text-primary-foreground"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                      جاري التحضير...
                    </>
                  ) : (
                    <>
                      <Target className="w-5 h-5 ml-2" />
                      ابدأ التقييم
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Quiz Screen
  if (step === 'quiz') {
    const currentQuestionData = questions[currentQuestion];

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="secondary">
                    السؤال {currentQuestion + 1} / {questions.length}
                  </Badge>
                  <Badge>{currentQuestionData?.topic}</Badge>
                </div>
                <Progress value={progress} className="h-2" />
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="text-right" dir="rtl">
                  <p className="text-lg font-semibold mb-6">
                    {currentQuestionData?.question_text}
                  </p>

                  <RadioGroup
                    value={selectedAnswers[currentQuestion]}
                    onValueChange={handleAnswerSelect}
                  >
                    <div className="space-y-3">
                      {currentQuestionData?.options?.map((option, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2 space-x-reverse p-4 rounded-lg border-2 hover:border-primary/50 transition-colors cursor-pointer"
                        >
                          <RadioGroupItem value={option} id={`option-${index}`} />
                          <Label
                            htmlFor={`option-${index}`}
                            className="flex-1 cursor-pointer text-base"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={handlePrevious}
                    disabled={currentQuestion === 0}
                    variant="outline"
                    className="flex-1"
                  >
                    السابق
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!selectedAnswers[currentQuestion] || loading}
                    className="flex-1 gradient-primary text-primary-foreground"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : currentQuestion === questions.length - 1 ? (
                      "إنهاء التقييم"
                    ) : (
                      "التالي"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Results Screen
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl space-y-6">
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>
              <CardTitle className="text-3xl text-center">
                نتائج التقييم الأولي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <div className="text-6xl font-bold text-primary">
                  {results?.percentage.toFixed(0)}%
                </div>
                <p className="text-xl text-muted-foreground">
                  {results?.score} من {results?.total} إجابة صحيحة
                </p>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  المستوى: {results?.level}
                </Badge>
              </div>

              <div className="bg-muted/50 p-6 rounded-lg space-y-3">
                <h3 className="font-semibold text-lg mb-3">الخطوات التالية:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                    <p>تم تخصيص المحتوى التعليمي بناءً على مستواك</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                    <p>ستحصل على تمارين مناسبة لتطوير مهاراتك</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                    <p>يمكنك تتبع تقدمك من لوحة التحكم</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => navigate("/dashboard")}
                size="lg"
                className="w-full gradient-primary text-primary-foreground"
              >
                الذهاب إلى لوحة التحكم
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InitialAssessment;
