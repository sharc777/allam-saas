import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Progress } from "./ui/progress";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Loader2, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePerformanceTracking, generateQuestionHash } from "@/hooks/usePerformanceTracking";

interface EmbeddedQuizProps {
  contentId: string;
  dayNumber: string;
  onComplete: (passed: boolean, percentage: number) => void;
}

export function EmbeddedQuiz({ contentId, dayNumber, onComplete }: EmbeddedQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [showEarlyFinish, setShowEarlyFinish] = useState(false);
  const [wrongQuestions, setWrongQuestions] = useState<any[]>([]);
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<number, number>>({});
  const queryClient = useQueryClient();
  
  const trackPerformance = usePerformanceTracking();

  const { data: questions, isLoading } = useQuery({
    queryKey: ["embedded-quiz", contentId],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (garbage collection time)
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: {
          contentId,
          dayNumber: parseInt(dayNumber),
        },
      });

      if (error) throw error;
      return data?.questions || [];
    },
  });

  const saveResultMutation = useMutation({
    mutationFn: async ({ score, percentage }: { score: number; percentage: number }) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("test_type_preference, track_preference")
        .single();

      const { error } = await supabase.from("quiz_results").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        day_number: parseInt(dayNumber),
        daily_content_id: contentId,
        score,
        total_questions: questions?.length || 0,
        percentage,
        questions: questions || [],
        test_type: profile?.test_type_preference || "قدرات",
        track: profile?.track_preference || "عام",
        quiz_mode: "daily",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-quiz-result"] });
      queryClient.invalidateQueries({ queryKey: ["student-progress"] });
    },
  });

  const handleAnswerSelect = async (answer: string) => {
    setSelectedAnswers({ ...selectedAnswers, [currentQuestionIndex]: answer });
    
    // Track performance for this question
    const question = questions?.[currentQuestionIndex];
    if (question) {
      const questionStartTime = questionStartTimes[currentQuestionIndex] || Date.now();
      const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
      
      // Get profile for test type
      const { data: profile } = await supabase
        .from("profiles")
        .select("test_type_preference")
        .single();
      
      trackPerformance.mutate({
        questionHash: generateQuestionHash(question.question_text, question.options),
        questionText: question.question_text,
        topicName: question.topic || 'عام',
        section: question.section || 'كمي',
        testType: profile?.test_type_preference || "قدرات",
        difficulty: question.difficulty || 'medium',
        testTypeCategory: 'quiz',
        userAnswer: answer,
        correctAnswer: question.correct_answer,
        isCorrect: answer === question.correct_answer,
        timeSpentSeconds: timeSpent,
        metadata: {
          day_number: parseInt(dayNumber),
          content_id: contentId,
          question_index: currentQuestionIndex
        }
      });
    }
    
    // Show early finish option after answering 50% of questions
    const answeredCount = Object.keys(selectedAnswers).length + 1;
    if (answeredCount >= Math.ceil((questions?.length || 0) / 2)) {
      setShowEarlyFinish(true);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < (questions?.length || 0) - 1) {
      const nextQuestion = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextQuestion);
      // Start timer for next question
      setQuestionStartTimes(prev => ({
        ...prev,
        [nextQuestion]: Date.now()
      }));
    }
  };

  const handleSubmit = async () => {
    if (!questions) return;

    const score = questions.reduce((acc, question, idx) => {
      return acc + (selectedAnswers[idx] === question.correct_answer ? 1 : 0);
    }, 0);

    const percentage = (score / questions.length) * 100;

    await saveResultMutation.mutateAsync({ score, percentage });
    setShowResults(true);
    onComplete(percentage >= 70, percentage);

    toast({
      title: percentage >= 70 ? "🎉 نجحت في الاختبار!" : "حاول مرة أخرى",
      description: `حصلت على ${percentage.toFixed(0)}% (${score}/${questions.length})`,
      variant: percentage >= 70 ? "default" : "destructive",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive">فشل تحميل الاختبار. حاول مرة أخرى.</p>
      </Card>
    );
  }

  if (showResults) {
    const score = questions.reduce((acc, question, idx) => {
      return acc + (selectedAnswers[idx] === question.correct_answer ? 1 : 0);
    }, 0);
    const percentage = (score / questions.length) * 100;
    const passed = percentage >= 70;

    return (
      <Card className="p-8 text-center space-y-6">
        <div
          className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
            passed ? "bg-green-100" : "bg-red-100"
          }`}
        >
          {passed ? (
            <CheckCircle2 className="w-16 h-16 text-green-600" />
          ) : (
            <XCircle className="w-16 h-16 text-red-600" />
          )}
        </div>

        <div>
          <h3 className="text-2xl font-bold mb-2">
            {passed ? "مبروك! لقد اجتزت الاختبار" : "للأسف، لم تجتز الاختبار"}
          </h3>
          <p className="text-muted-foreground">
            حصلت على {score} من {questions.length} ({percentage.toFixed(0)}%)
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">الإجابات الصحيحة</p>
            <p className="text-2xl font-bold text-green-600">{score}</p>
          </div>
          <div>
            <p className="text-muted-foreground">الإجابات الخاطئة</p>
            <p className="text-2xl font-bold text-red-600">{questions.length - score}</p>
          </div>
          <div>
            <p className="text-muted-foreground">النسبة المئوية</p>
            <p className="text-2xl font-bold">{percentage.toFixed(0)}%</p>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button 
            onClick={() => window.location.reload()} 
            className="flex-1"
          >
            إعادة الاختبار بأسئلة جديدة
          </Button>
          {!passed && (
            <Button 
              onClick={() => {
                const event = new CustomEvent('practiceWeaknesses');
                window.dispatchEvent(event);
              }} 
              variant="secondary"
              className="flex-1"
            >
              تمرن على نقاط الضعف
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const hasAnswered = selectedAnswers[currentQuestionIndex] !== undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            السؤال {currentQuestionIndex + 1} من {questions.length}
          </span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="p-6">
        <CardContent className="p-0 space-y-6">
          <div>
            <p className="text-lg font-medium mb-2">{currentQuestion.question_text}</p>
            {currentQuestion.section && (
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs rounded-full">
                {currentQuestion.section}
              </span>
            )}
          </div>

          <RadioGroup
            value={selectedAnswers[currentQuestionIndex]}
            onValueChange={handleAnswerSelect}
            className="space-y-3"
          >
            {currentQuestion.options.map((option: string, idx: number) => {
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
                      id={`q${currentQuestionIndex}-opt-${idx}`}
                      className="w-5 h-5"
                    />
                  </div>
                  <Label
                    htmlFor={`q${currentQuestionIndex}-opt-${idx}`}
                    className="flex-1 text-right cursor-pointer leading-relaxed"
                  >
                    {option}
                  </Label>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
                </div>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        {isLastQuestion ? (
          <Button
            onClick={handleSubmit}
            disabled={!hasAnswered || saveResultMutation.isPending}
            size="lg"
            className="w-full"
          >
            {saveResultMutation.isPending ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              "إنهاء الاختبار"
            )}
          </Button>
        ) : (
          <>
            <Button
              onClick={handleNext}
              disabled={!hasAnswered}
              size="lg"
              className="flex-1"
            >
              السؤال التالي
              <ChevronRight className="mr-2 h-4 w-4" />
            </Button>
            {showEarlyFinish && (
              <Button
                onClick={handleSubmit}
                disabled={saveResultMutation.isPending}
                variant="secondary"
                size="lg"
                className="flex-1"
              >
                {saveResultMutation.isPending ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  "إنهاء الاختبار"
                )}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
