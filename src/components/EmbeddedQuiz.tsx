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

interface EmbeddedQuizProps {
  contentId: string;
  dayNumber: string;
  onComplete: (passed: boolean, percentage: number) => void;
}

export function EmbeddedQuiz({ contentId, dayNumber, onComplete }: EmbeddedQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const queryClient = useQueryClient();

  const { data: questions, isLoading } = useQuery({
    queryKey: ["embedded-quiz", contentId],
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

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswers({ ...selectedAnswers, [currentQuestionIndex]: answer });
  };

  const handleNext = () => {
    if (currentQuestionIndex < (questions?.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
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

    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          {percentage >= 70 ? (
            <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
          ) : (
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
          )}
          <h3 className="text-2xl font-bold">
            {percentage >= 70 ? "مبروك! نجحت في الاختبار 🎉" : "حاول مرة أخرى 💪"}
          </h3>
          <div className="space-y-2">
            <p className="text-3xl font-bold">{percentage.toFixed(0)}%</p>
            <p className="text-muted-foreground">
              أجبت بشكل صحيح على {score} من {questions.length} سؤال
            </p>
          </div>
          <Progress value={percentage} className="h-3" />
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
          <Button
            onClick={handleNext}
            disabled={!hasAnswered}
            size="lg"
            className="w-full"
          >
            السؤال التالي
            <ChevronRight className="mr-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
