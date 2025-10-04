import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";

interface Question {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  topic: string;
  section?: string;
}

const Quiz = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const dayNumber = parseInt(searchParams.get("day") || "1");
  const contentId = searchParams.get("contentId"); // Get daily_content_id from URL
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  // Redirect to test selection if no preferences set
  if (profile && !profile.test_type_preference) {
    navigate("/test-selection");
    return null;
  }

  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [startTime] = useState(Date.now());
  const [testType, setTestType] = useState<"قدرات" | "تحصيلي">(
    profile?.test_type_preference || "قدرات"
  );
  const [track, setTrack] = useState<"عام" | "علمي" | "نظري">(
    profile?.track_preference || "عام"
  );

  const generateQuiz = async () => {
    try {
      setLoading(true);
      
      // Get parameters from URL
      const params = new URLSearchParams(location.search);
      const dayParam = params.get("day");
      const contentIdParam = params.get("contentId");
      const modeParam = params.get("mode") || "daily";
      const difficultyParam = params.get("difficulty") || "medium";
      const testTypeParam = params.get("testType");
      const trackParam = params.get("track");
      
      console.log("Quiz params:", { dayParam, contentIdParam, modeParam, difficultyParam });

      const requestBody: any = {
        difficulty: difficultyParam,
        testType: testTypeParam || testType,
        track: trackParam || track,
        mode: modeParam, // Pass mode to edge function
      };

      // Add either contentId or dayNumber based on mode (not needed for practice mode)
      if (contentIdParam) {
        requestBody.contentId = contentIdParam;
      } else if (dayParam) {
        requestBody.dayNumber = parseInt(dayParam);
      } else if (modeParam !== "practice" && profile?.current_day) {
        requestBody.dayNumber = profile.current_day;
      }

      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: requestBody,
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
    
    const MIN_PASSING_SCORE = 70;
    const hasPassed = percentage >= MIN_PASSING_SCORE;

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
      // المرحلة 3: إضافة logging مفصل للتحقق من ربط daily_content_id
      console.log("📝 حفظ نتيجة الاختبار:");
      console.log("  - contentId:", contentId || "غير موجود");
      console.log("  - dayNumber:", dayNumber);
      console.log("  - النتيجة:", percentage.toFixed(0) + "%");
      console.log("  - النجاح:", hasPassed ? "نعم ✓" : "لا ✗");
      
      // Save quiz result with daily_content_id link
      const { error: resultError } = await supabase.from("quiz_results").insert({
        user_id: profile?.id,
        day_number: dayNumber,
        daily_content_id: contentId || null, // Link to daily content if available
        quiz_mode: contentId ? 'daily' : 'practice', // Set mode based on content link
        quiz_type: "daily",
        test_type: testType,
        track: testType === "تحصيلي" ? track : "عام",
        questions: questions.map((q, idx) => ({
          question: q.question_text,
          selected: selectedAnswers[idx],
          correct: q.correct_answer,
          explanation: q.explanation,
          topic: q.topic,
          section: q.section,
        })),
        total_questions: questions.length,
        score,
        time_taken_minutes: timeTaken,
        strengths,
        weaknesses,
      });

      if (resultError) throw resultError;

      // Update student progress - only mark quiz_completed if passed
      // If lesson quiz passed, also mark content_completed
      const progressUpdate: any = {
        user_id: profile?.id,
        day_number: dayNumber,
        quiz_completed: hasPassed, // Only mark completed if passed
      };
      
      // If this is a lesson quiz (has contentId) and user passed, mark content as completed
      if (contentId && hasPassed) {
        progressUpdate.content_completed = true;
        progressUpdate.completed_at = new Date().toISOString();
        console.log("✅ تم إكمال الدرس تلقائياً - نجح الطالب بنسبة", percentage.toFixed(0) + "%");
      } else if (contentId && !hasPassed) {
        console.log("⚠️ لم يتم إكمال الدرس - النسبة", percentage.toFixed(0) + "% أقل من الحد الأدنى 70%");
      }

      const { error: progressError } = await supabase
        .from("student_progress")
        .upsert(progressUpdate, {
          onConflict: "user_id,day_number"
        });

      if (progressError) throw progressError;

      // المرحلة 2: تحديث تلقائي للـ Dashboard بعد إكمال الاختبار
      queryClient.invalidateQueries({ queryKey: ["today-quiz-result"] });
      queryClient.invalidateQueries({ queryKey: ["lesson-quiz-result"] });
      queryClient.invalidateQueries({ queryKey: ["student-progress"] });
      queryClient.invalidateQueries({ queryKey: ["all-progress"] });
      queryClient.invalidateQueries({ queryKey: ["quiz-stats"] });

      setShowResults(true);
      
      if (hasPassed) {
        toast({
          title: "🎉 رائع! تم إكمال الاختبار بنجاح",
          description: `حصلت على ${score} من ${questions.length} (${percentage.toFixed(0)}%)` + 
            (contentId ? " - تم إكمال الدرس تلقائياً" : ""),
        });
      } else {
        toast({
          title: "تم إكمال الاختبار",
          description: `حصلت على ${score} من ${questions.length} (${percentage.toFixed(0)}%) - يمكنك إعادة المحاولة`,
          variant: "destructive",
        });
      }
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
          <Card className="p-8">
            <h1 className="text-3xl font-bold mb-6 text-center">اختر نوع الاختبار</h1>
            
            <div className="space-y-6 mb-8">
              <div className="space-y-3">
                <Label className="text-lg font-semibold">نوع الاختبار</Label>
                <Select value={testType} onValueChange={(value) => {
                  setTestType(value as "قدرات" | "تحصيلي");
                  if (value === "قدرات") setTrack("عام");
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="قدرات">اختبار القدرات العامة (GAT)</SelectItem>
                    <SelectItem value="تحصيلي">الاختبار التحصيلي (SAAT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {testType === "تحصيلي" && (
                <div className="space-y-3">
                  <Label className="text-lg font-semibold">المسار الدراسي</Label>
                  <Select value={track} onValueChange={(value) => setTrack(value as "علمي" | "نظري")}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="علمي">المسار العلمي</SelectItem>
                      <SelectItem value="نظري">المسار النظري (الأدبي)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
                {testType === "قدرات" ? (
                  <div>
                    <p className="font-semibold mb-2">📝 اختبار القدرات يتكون من:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>5 أسئلة في القسم اللفظي</li>
                      <li>5 أسئلة في القسم الكمي</li>
                    </ul>
                  </div>
                ) : track === "علمي" ? (
                  <div>
                    <p className="font-semibold mb-2">🔬 التحصيلي العلمي يتكون من:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>رياضيات، فيزياء، كيمياء، أحياء</li>
                    </ul>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold mb-2">📖 التحصيلي النظري يتكون من:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>علوم شرعية، لغة عربية، علوم اجتماعية</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <Button onClick={generateQuiz} disabled={loading} size="lg" className="w-full">
              {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              ابدأ الاختبار
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (showResults) {
    const MIN_PASSING_SCORE = 70;
    const hasPassed = percentage >= MIN_PASSING_SCORE;
    
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold">نتيجة الاختبار</h1>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">
                  {testType === "قدرات" ? "اختبار القدرات" : `التحصيلي ${track}`}
                </div>
              </div>
            </div>
            
            <div className="text-center mb-8">
              <div className={`text-6xl font-bold mb-2 ${hasPassed ? 'text-success' : 'text-destructive'}`}>
                {percentage.toFixed(0)}%
              </div>
              <p className="text-muted-foreground mb-2">
                {score} من {questions.length} إجابة صحيحة
              </p>
              {hasPassed ? (
                <div className="flex items-center justify-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">ممتاز! لقد نجحت في الاختبار</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">لم تتجاوز الحد الأدنى ({MIN_PASSING_SCORE}%) - يمكنك إعادة المحاولة</span>
                </div>
              )}
            </div>

            {/* Performance by Section/Subject */}
            <div className="mb-8">
              {testType === "قدرات" ? (
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4 text-center bg-primary/5">
                    <div className="text-sm text-muted-foreground mb-1">القسم اللفظي</div>
                    <div className="text-2xl font-bold text-primary">
                      {questions.filter((q, idx) => q.section === "لفظي" && selectedAnswers[idx] === q.correct_answer).length} / {questions.filter(q => q.section === "لفظي").length}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {((questions.filter((q, idx) => q.section === "لفظي" && selectedAnswers[idx] === q.correct_answer).length / questions.filter(q => q.section === "لفظي").length) * 100).toFixed(0)}%
                    </div>
                  </Card>
                  <Card className="p-4 text-center bg-secondary/5">
                    <div className="text-sm text-muted-foreground mb-1">القسم الكمي</div>
                    <div className="text-2xl font-bold text-secondary">
                      {questions.filter((q, idx) => q.section === "كمي" && selectedAnswers[idx] === q.correct_answer).length} / {questions.filter(q => q.section === "كمي").length}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {((questions.filter((q, idx) => q.section === "كمي" && selectedAnswers[idx] === q.correct_answer).length / questions.filter(q => q.section === "كمي").length) * 100).toFixed(0)}%
                    </div>
                  </Card>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Array.from(new Set(questions.map(q => q.topic))).map((subject) => {
                    const subjectQuestions = questions.filter(q => q.topic === subject);
                    const correctCount = questions.filter((q, idx) => q.topic === subject && selectedAnswers[idx] === q.correct_answer).length;
                    return (
                      <Card key={subject} className="p-3 text-center bg-accent/5">
                        <div className="text-xs text-muted-foreground mb-1">{subject}</div>
                        <div className="text-lg font-bold text-accent">
                          {correctCount} / {subjectQuestions.length}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {((correctCount / subjectQuestions.length) * 100).toFixed(0)}%
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-6">
              {questions.map((q, idx) => {
                const isCorrect = selectedAnswers[idx] === q.correct_answer;
                return (
                  <Card key={idx} className={`p-6 border-r-4 ${isCorrect ? 'border-r-success' : 'border-r-destructive'}`}>
                    <div className="flex items-start gap-3 mb-4">
                      {isCorrect ? (
                        <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0 mt-1" />
                      ) : (
                        <XCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline" className={`${
                            testType === "قدرات"
                              ? q.section === "لفظي" 
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-secondary/10 text-secondary border-secondary/20"
                              : "bg-accent/10 text-accent border-accent/20"
                          }`}>
                            {q.section || q.topic}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {q.topic}
                          </Badge>
                        </div>
                        <p className="font-semibold mb-3 text-base">
                          {idx + 1}. {q.question_text}
                        </p>
                        <div className="space-y-2 mb-3">
                          <p className="text-sm">
                            <span className="text-muted-foreground">إجابتك:</span>{" "}
                            <span className={isCorrect ? "text-success font-medium" : "text-destructive font-medium"}>
                              {selectedAnswers[idx] || "لم تجب"}
                            </span>
                          </p>
                          {!isCorrect && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">الإجابة الصحيحة:</span>{" "}
                              <span className="text-success font-medium">{q.correct_answer}</span>
                            </p>
                          )}
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">💡 التفسير:</span> {q.explanation}
                          </p>
                        </div>
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
              <div className="flex items-center gap-2">
                {currentQ?.section && (
                  <Badge variant="outline" className={`${
                    testType === "قدرات"
                      ? currentQ.section === "لفظي" 
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-secondary/10 text-secondary border-secondary/20"
                      : "bg-accent/10 text-accent border-accent/20"
                  }`}>
                    {currentQ.section}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  {currentQ?.topic}
                </Badge>
              </div>
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
              <div key={idx} className="flex items-center gap-3" dir="rtl">
                <RadioGroupItem value={option} id={`option-${idx}`} className="w-5 h-5" />
                <Label
                  htmlFor={`option-${idx}`}
                  className="flex-1 text-right cursor-pointer p-4 rounded-lg border-2 hover:bg-accent/50 hover:border-primary transition-all"
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