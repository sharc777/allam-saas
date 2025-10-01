import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

interface Question {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  topic: string;
}

const Quiz = () => {
  const [searchParams] = useSearchParams();
  const dayNumber = parseInt(searchParams.get("day") || "1");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: profile } = useProfile();

  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [startTime] = useState(Date.now());

  const generateQuiz = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { dayNumber, difficulty: "medium" }
      });

      if (error) throw error;

      setQuestions(data.questions);
      setSelectedAnswers(new Array(data.questions.length).fill(""));
      setQuizStarted(true);
    } catch (error: any) {
      console.error("Error generating quiz:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل توليد الاختبار",
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
      submitQuiz();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const submitQuiz = async () => {
    const score = selectedAnswers.filter(
      (answer, idx) => answer === questions[idx].correct_answer
    ).length;
    
    const percentage = (score / questions.length) * 100;
    const timeTaken = Math.round((Date.now() - startTime) / 60000);

    // Calculate strengths and weaknesses
    const topicScores: { [key: string]: { correct: number; total: number } } = {};
    questions.forEach((q, idx) => {
      if (!topicScores[q.topic]) {
        topicScores[q.topic] = { correct: 0, total: 0 };
      }
      topicScores[q.topic].total++;
      if (selectedAnswers[idx] === q.correct_answer) {
        topicScores[q.topic].correct++;
      }
    });

    const strengths = Object.keys(topicScores).filter(
      topic => topicScores[topic].correct / topicScores[topic].total >= 0.7
    );
    const weaknesses = Object.keys(topicScores).filter(
      topic => topicScores[topic].correct / topicScores[topic].total < 0.5
    );

    try {
      // Save quiz result
      const { error: resultError } = await supabase.from("quiz_results").insert({
        user_id: profile?.id,
        day_number: dayNumber,
        quiz_type: "daily",
        questions: questions.map((q, idx) => ({
          question: q.question_text,
          selected: selectedAnswers[idx],
          correct: q.correct_answer,
          explanation: q.explanation,
          topic: q.topic,
        })),
        total_questions: questions.length,
        score,
        percentage,
        time_taken_minutes: timeTaken,
        strengths,
        weaknesses,
      });

      if (resultError) throw resultError;

      // Update student progress
      const { error: progressError } = await supabase
        .from("student_progress")
        .upsert({
          user_id: profile?.id,
          day_number: dayNumber,
          quiz_completed: true,
        }, {
          onConflict: "user_id,day_number"
        });

      if (progressError) throw progressError;

      setShowResults(true);
      
      toast({
        title: "تم إكمال الاختبار!",
        description: `حصلت على ${score} من ${questions.length} (${percentage.toFixed(0)}%)`,
      });
    } catch (error: any) {
      console.error("Error saving quiz:", error);
      toast({
        title: "خطأ",
        description: "فشل حفظ نتيجة الاختبار",
        variant: "destructive",
      });
    }
  };

  const score = selectedAnswers.filter(
    (answer, idx) => answer === questions[idx]?.correct_answer
  ).length;
  const percentage = questions.length > 0 ? (score / questions.length) * 100 : 0;

  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <h1 className="text-3xl font-bold mb-4">اختبار اليوم {dayNumber}</h1>
            <p className="text-muted-foreground mb-8">
              سيتم توليد 10 أسئلة بناءً على محتوى اليوم
            </p>
            <Button onClick={generateQuiz} disabled={loading} size="lg">
              {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              ابدأ الاختبار
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            <h1 className="text-3xl font-bold mb-6 text-center">نتيجة الاختبار</h1>
            
            <div className="text-center mb-8">
              <div className="text-6xl font-bold mb-2">
                {percentage.toFixed(0)}%
              </div>
              <p className="text-muted-foreground">
                {score} من {questions.length} إجابة صحيحة
              </p>
            </div>

            <div className="space-y-6">
              {questions.map((q, idx) => {
                const isCorrect = selectedAnswers[idx] === q.correct_answer;
                return (
                  <Card key={idx} className="p-6">
                    <div className="flex items-start gap-3 mb-4">
                      {isCorrect ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold mb-2">
                          {idx + 1}. {q.question_text}
                        </p>
                        <p className="text-sm text-muted-foreground mb-2">
                          إجابتك: {selectedAnswers[idx] || "لم تجب"}
                        </p>
                        {!isCorrect && (
                          <p className="text-sm text-green-600 mb-2">
                            الإجابة الصحيحة: {q.correct_answer}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {q.explanation}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="mt-8 flex gap-4 justify-center">
              <Button onClick={() => navigate("/dashboard")}>
                العودة للوحة التحكم
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="p-8">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">
                السؤال {currentQuestion + 1} من {questions.length}
              </span>
              <span className="text-sm text-muted-foreground">
                الموضوع: {currentQ?.topic}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <h2 className="text-2xl font-bold mb-6">{currentQ?.question_text}</h2>

          <RadioGroup
            value={selectedAnswers[currentQuestion]}
            onValueChange={handleAnswerSelect}
            className="space-y-4"
          >
            {currentQ?.options.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value={option} id={`option-${idx}`} />
                <Label
                  htmlFor={`option-${idx}`}
                  className="flex-1 cursor-pointer p-4 rounded-lg border hover:bg-accent"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="mt-8 flex gap-4">
            <Button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              variant="outline"
            >
              السابق
            </Button>
            <Button
              onClick={handleNext}
              disabled={!selectedAnswers[currentQuestion]}
              className="flex-1"
            >
              {currentQuestion === questions.length - 1 ? "إنهاء الاختبار" : "التالي"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Quiz;