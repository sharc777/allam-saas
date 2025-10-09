import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Brain, Clock } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import Navbar from "@/components/Navbar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Question {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  topic: string;
}

const DailyExercise = () => {
  const [searchParams] = useSearchParams();
  const sectionType = searchParams.get("section") || "كمي";
  const testType = searchParams.get("testType") || "قدرات";
  const dayNumber = parseInt(searchParams.get("day") || "1");
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: profile } = useProfile();

  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [exerciseStarted, setExerciseStarted] = useState(false);
  const [startTime] = useState(Date.now());
  const [showEarlyEndDialog, setShowEarlyEndDialog] = useState(false);

  const generateExercise = async () => {
    try {
      setLoading(true);
      
    const { data, error } = await supabase.functions.invoke("generate-quiz", {
      body: {
        mode: "practice",
        testType,
        track: profile?.track_preference || "عام",
        difficulty: "medium",
        sectionFilter: sectionType,
        questionCount: 10,
      },
    });

      if (error) throw error;

      setQuestions(data.questions);
      setSelectedAnswers(new Array(data.questions.length).fill(""));
      setExerciseStarted(true);
    } catch (error: any) {
      console.error("Error generating exercise:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل توليد التمرين",
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
      submitExercise();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleEarlyEnd = () => {
    setShowEarlyEndDialog(true);
  };

  const confirmEarlyEnd = () => {
    submitExercise();
    setShowEarlyEndDialog(false);
  };

  const submitExercise = async () => {
    try {
      setLoading(true);

      const timeTaken = Math.floor((Date.now() - startTime) / 60000);
      let correctAnswers = 0;

      questions.forEach((q, index) => {
        if (selectedAnswers[index] === q.correct_answer) {
          correctAnswers++;
        }
      });

      const score = (correctAnswers / questions.length) * 100;

      const questionsWithAnswers = questions.map((q, index) => ({
        ...q,
        user_answer: selectedAnswers[index],
        is_correct: selectedAnswers[index] === q.correct_answer,
      }));

      // Save exercise to daily_exercises table
      await supabase.from("daily_exercises").insert([{
        user_id: profile?.id,
        day_number: dayNumber,
        section_type: sectionType,
        test_type: testType as "قدرات" | "تحصيلي",
        track: profile?.track_preference || "عام",
        questions: questionsWithAnswers,
        score: score,
        total_questions: questions.length,
        time_taken_minutes: timeTaken,
        completed_at: new Date().toISOString(),
      }]);

      // Calculate performance
      await supabase.functions.invoke("calculate-performance", {
        body: {
          testType,
          track: profile?.track_preference || "عام",
        },
      });

      setShowResults(true);
    } catch (error: any) {
      console.error("Error submitting exercise:", error);
      toast({
        title: "خطأ",
        description: "فشل حفظ النتائج",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentQuestionData = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  if (!exerciseStarted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-3xl text-center">
                  تمرين {sectionType} - اليوم {dayNumber}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-4">
                  <p className="text-lg text-muted-foreground">
                    استعد لحل 10 أسئلة في قسم {sectionType}
                  </p>
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>مدة متوقعة: 15-20 دقيقة</span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={generateExercise}
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
                    "ابدأ التمرين"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

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
                            <div className="flex-1">
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
                    onClick={() => window.location.reload()}
                    className="flex-1 gradient-primary text-primary-foreground"
                  >
                    تمرين جديد
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
              <div>
                <h3 className="text-2xl font-bold mb-6">
                  {currentQuestionData?.question_text}
                </h3>

                <RadioGroup
                  value={selectedAnswers[currentQuestion]}
                  onValueChange={handleAnswerSelect}
                  className="space-y-3"
                >
                  {currentQuestionData?.options.map((option, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 space-x-reverse p-4 rounded-lg border-2 hover:border-primary transition-colors cursor-pointer"
                    >
                      <RadioGroupItem value={option} id={`option-${index}`} />
                      <Label
                        htmlFor={`option-${index}`}
                        className="flex-1 cursor-pointer text-lg"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                  variant="outline"
                  className="flex-1"
                >
                  السابق
                </Button>
                <Button
                  onClick={handleEarlyEnd}
                  variant="destructive"
                  className="flex-1"
                >
                  إنهاء مبكراً
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!selectedAnswers[currentQuestion] || loading}
                  className="flex-1 gradient-primary text-primary-foreground"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : currentQuestion === questions.length - 1 ? (
                    "إنهاء"
                  ) : (
                    "التالي"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showEarlyEndDialog} onOpenChange={setShowEarlyEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم احتساب الأسئلة التي لم تجب عليها كإجابات خاطئة. هل تريد المتابعة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEarlyEnd}>
              نعم، إنهاء التمرين
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DailyExercise;