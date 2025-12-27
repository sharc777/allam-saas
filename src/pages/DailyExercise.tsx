import { useState, useCallback } from "react";
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
import { useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
import { usePerformanceTracking, generateQuestionHash } from "@/hooks/usePerformanceTracking";
import { QuestionTimer, getTimeIndicator, formatTimeDisplay } from "@/components/QuestionTimer";
import { QuestionNote, QuestionNoteDisplay } from "@/components/QuestionNote";
import { useQuestionNotes } from "@/hooks/useQuestionNotes";
import { isAnswerCorrect } from "@/lib/answerUtils";
import { useTestStructure } from "@/hooks/useTestStructure";

interface Question {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  topic: string;
}

const DailyExercise = () => {
  return (
    <SubscriptionGuard>
      <DailyExerciseContent />
    </SubscriptionGuard>
  );
};

const DailyExerciseContent = () => {
  const [searchParams] = useSearchParams();
  const initialSection = searchParams.get("section") || "كمي";
  const testType = searchParams.get("testType") || "قدرات";
  const dayNumber = parseInt(searchParams.get("day") || "1");
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { sections, getAllSubTopicsForSection } = useTestStructure();

  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [exerciseStarted, setExerciseStarted] = useState(false);
  const [startTime] = useState(Date.now());
  const [showEarlyEndDialog, setShowEarlyEndDialog] = useState(false);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState(10);
  const [selectedDifficulty, setSelectedDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [selectedSection, setSelectedSection] = useState(initialSection);
  const [selectedTopic, setSelectedTopic] = useState("عام");
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<number, number>>({});
  const [questionTimes, setQuestionTimes] = useState<Record<number, number>>({});
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(null);
  
  const trackPerformance = usePerformanceTracking();
  const { notes, saveNote, deleteNote, getNoteForQuestion } = useQuestionNotes(currentExerciseId || undefined);
  
  // Get available topics based on selected section
  const availableTopics = getAllSubTopicsForSection(selectedSection);
  
  // Reset topic when section changes
  const handleSectionChange = (newSection: string) => {
    setSelectedSection(newSection);
    setSelectedTopic("عام");
  };

  // Callback for timer updates
  const handleTimeUpdate = useCallback((seconds: number) => {
    setQuestionTimes(prev => ({
      ...prev,
      [currentQuestion]: seconds
    }));
  }, [currentQuestion]);

  const generateExercise = async () => {
    // Check daily limits first
    try {
      const { data: limitsData, error: limitsError } = await supabase.functions.invoke('check-daily-limits');
      
      if (limitsError) throw limitsError;
      
      if (!limitsData.can_exercise) {
        toast({
          title: "تم الوصول للحد الأقصى",
          description: limitsData.message,
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "معلومات الحدود",
        description: limitsData.message,
      });
    } catch (limitErr) {
      console.error('Limits check error:', limitErr);
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: {
          mode: "practice",
          difficulty: selectedDifficulty,
          sectionFilter: selectedSection,
          questionCount: selectedQuestionCount,
          topic: selectedTopic !== "عام" ? selectedTopic : undefined,
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
      setQuestionTimes({});
      setQuestionStartTimes({ 0: Date.now() });
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
    
    // Save the time spent on this question
    const timeSpent = questionTimes[currentQuestion] || 0;
    
    // Track performance for this question
    const question = questions[currentQuestion];
    
    trackPerformance.mutate({
      questionHash: generateQuestionHash(question.question_text, question.options),
      topic: question.topic || 'عام',
      section: selectedSection,
      difficulty: selectedDifficulty as 'easy' | 'medium' | 'hard',
      isCorrect: isAnswerCorrect(answer, question.correct_answer),
      timeSpentSeconds: timeSpent,
      metadata: {
        questionText: question.question_text,
        testType: testType as any,
        testTypeCategory: 'daily_exercise',
        userAnswer: answer,
        correctAnswer: question.correct_answer,
        day_number: dayNumber,
        question_index: currentQuestion
      }
    });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      const nextQuestion = currentQuestion + 1;
      setCurrentQuestion(nextQuestion);
      // Initialize timer for next question if not set
      if (!questionTimes[nextQuestion]) {
        setQuestionTimes(prev => ({ ...prev, [nextQuestion]: 0 }));
      }
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

      // Validate required data before saving
      if (!profile?.id) {
        throw new Error("معرف المستخدم غير موجود");
      }

      if (!questions || questions.length === 0) {
        throw new Error("لا توجد أسئلة للحفظ");
      }

      if (!selectedSection || !testType) {
        throw new Error("نوع القسم أو الاختبار غير محدد");
      }

      const timeTaken = Math.floor((Date.now() - startTime) / 60000);
      let correctAnswers = 0;

      questions.forEach((q, index) => {
        if (isAnswerCorrect(selectedAnswers[index], q.correct_answer)) {
          correctAnswers++;
        }
      });

      const score = Math.round((correctAnswers / questions.length) * 100);

      const questionsWithAnswers = questions.map((q, index) => ({
        ...q,
        user_answer: selectedAnswers[index],
        is_correct: isAnswerCorrect(selectedAnswers[index], q.correct_answer),
        time_spent_seconds: questionTimes[index] || 0,
      }));

      // Save exercise to daily_exercises table with error checking
      const { data: savedExercise, error: saveError } = await supabase
        .from("daily_exercises")
        .insert([{
          user_id: profile.id,
          day_number: dayNumber,
          section_type: selectedSection,
          test_type: "قدرات" as "قدرات" | "تحصيلي",
          questions: questionsWithAnswers,
          score: score,
          total_questions: questions.length,
          time_taken_minutes: timeTaken,
          completed_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (saveError) {
        console.error("❌ Error saving exercise:", {
          error: saveError.message,
          userId: profile.id,
          sectionType: selectedSection,
          dayNumber,
          questionsCount: questions.length
        });
        throw new Error(`فشل حفظ التمرين: ${saveError.message}`);
      }

      console.log("✅ Exercise saved successfully:", savedExercise.id);
      setCurrentExerciseId(savedExercise.id);

      // Increment daily count only after successful save
      try {
        const { error: countError } = await supabase.rpc('increment_daily_count', {
          p_user_id: profile.id,
          p_section: selectedSection
        });
        
        if (countError) {
          console.error("Error updating daily count:", countError);
        }
      } catch (countErr) {
        console.error('Failed to increment daily count:', countErr);
      }

      // Invalidate exercise history to refresh the list
      queryClient.invalidateQueries({ queryKey: ["exercise-history", profile.id] });
      console.log("✅ Exercise history cache updated");

      // Calculate performance
      await supabase.functions.invoke("calculate-performance", {
        body: {
          exerciseId: savedExercise.id,
        },
      });

      // Award achievements
      try {
        await supabase.functions.invoke("award-achievements", {
          body: {
            user_id: profile.id,
            event_type: "exercise_completed",
            event_data: { score, total_questions: questions.length }
          }
        });
      } catch (achievementErr) {
        console.error('Failed to award achievements:', achievementErr);
      }

      setShowResults(true);
    } catch (error: any) {
      console.error("❌ Error in submitExercise:", {
        error: error.message,
        userId: profile?.id,
        sectionType: selectedSection,
        dayNumber,
        questionsCount: questions.length
      });
      
      toast({
        title: "خطأ في حفظ التمرين",
        description: error.message || "فشل حفظ النتائج. يرجى المحاولة مرة أخرى.",
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
                  تمرين {selectedSection} - اليوم {dayNumber}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-4">
                  <p className="text-lg text-muted-foreground">
                    استعد لحل أسئلة في قسم {selectedSection}
                  </p>
                  
                  <div className="space-y-4">
                    {/* اختيار القسم */}
                    <div>
                      <Label htmlFor="section" className="text-base">القسم</Label>
                      <Select value={selectedSection} onValueChange={handleSectionChange}>
                        <SelectTrigger id="section" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sections.map((section) => (
                            <SelectItem key={section.id} value={section.id}>
                              {section.icon} {section.nameAr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* اختيار الموضوع */}
                    <div>
                      <Label htmlFor="topic" className="text-base">الموضوع</Label>
                      <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                        <SelectTrigger id="topic" className="mt-2">
                          <SelectValue placeholder="اختر الموضوع" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="عام">📋 اختبار عام (جميع المواضيع)</SelectItem>
                          {availableTopics.map((subTopic) => (
                            <SelectItem key={subTopic.id} value={subTopic.id}>
                              {subTopic.nameAr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* عدد الأسئلة */}
                    <div>
                      <Label htmlFor="question-count" className="text-base">عدد الأسئلة</Label>
                      <Select value={selectedQuestionCount.toString()} onValueChange={(v) => setSelectedQuestionCount(parseInt(v))}>
                        <SelectTrigger id="question-count" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 أسئلة</SelectItem>
                          <SelectItem value="10">10 أسئلة</SelectItem>
                          <SelectItem value="15">15 سؤالاً</SelectItem>
                          <SelectItem value="20">20 سؤالاً</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* مستوى الصعوبة */}
                    <div>
                      <Label htmlFor="difficulty" className="text-base">مستوى الصعوبة</Label>
                      <Select value={selectedDifficulty} onValueChange={(v: any) => setSelectedDifficulty(v)}>
                        <SelectTrigger id="difficulty" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">سهل</SelectItem>
                          <SelectItem value="medium">متوسط</SelectItem>
                          <SelectItem value="hard">صعب</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-4 text-sm pt-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>مدة متوقعة: {Math.ceil(selectedQuestionCount * 1.5)}-{selectedQuestionCount * 2} دقيقة</span>
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
      (q, index) => isAnswerCorrect(selectedAnswers[index], q.correct_answer)
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
                    const isCorrect = isAnswerCorrect(selectedAnswers[index], q.correct_answer);
                    const wasAnswered = selectedAnswers[index] !== "";

                    const timeSpent = questionTimes[index] || 0;
                    const timeIndicator = getTimeIndicator(timeSpent);
                    const questionHash = generateQuestionHash(q.question_text, q.options);
                    const questionNote = getNoteForQuestion(questionHash);

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
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-semibold">{q.question_text}</p>
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="w-4 h-4" />
                                  <span className={timeIndicator.color}>{formatTimeDisplay(timeSpent)}</span>
                                  <span>{timeIndicator.icon}</span>
                                </div>
                              </div>
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
                              
                              {/* Question Note */}
                              <div className="mt-3 flex items-center gap-2">
                                <QuestionNote
                                  questionHash={questionHash}
                                  exerciseId={currentExerciseId || undefined}
                                  existingNote={questionNote}
                                  onSave={(note) => saveNote({ questionHash, note, exerciseId: currentExerciseId || undefined })}
                                  onDelete={() => deleteNote(questionHash)}
                                  compact
                                />
                              </div>
                              {questionNote && <QuestionNoteDisplay note={questionNote} />}
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
                <div className="flex items-center gap-3">
                  <QuestionTimer 
                    isActive={!showResults && exerciseStarted}
                    onTimeUpdate={handleTimeUpdate}
                    initialTime={questionTimes[currentQuestion] || 0}
                  />
                  <Badge>{currentQuestionData?.topic}</Badge>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
            </CardHeader>

            <CardContent className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold mb-6 text-right" dir="rtl">
                  {currentQuestionData?.question_text}
                </h3>

                <RadioGroup
                  value={selectedAnswers[currentQuestion]}
                  onValueChange={handleAnswerSelect}
                  className="space-y-3"
                >
                  {(Array.isArray(currentQuestionData?.options) 
                    ? currentQuestionData.options 
                    : Object.values(currentQuestionData?.options || {}) as string[]
                  ).map((option: string, index: number) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 space-x-reverse p-4 rounded-lg border-2 hover:border-primary transition-colors cursor-pointer"
                    >
                      <Label
                        htmlFor={`option-${index}`}
                        className="flex-1 cursor-pointer text-lg text-right"
                        dir="rtl"
                      >
                        {option}
                      </Label>
                      <RadioGroupItem value={option} id={`option-${index}`} />
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Note Area During Quiz */}
              <div className="pt-4 border-t border-border">
                <QuestionNote
                  questionHash={generateQuestionHash(currentQuestionData.question_text, currentQuestionData.options)}
                  existingNote={getNoteForQuestion(generateQuestionHash(currentQuestionData.question_text, currentQuestionData.options))}
                  onSave={(note) => saveNote({ questionHash: generateQuestionHash(currentQuestionData.question_text, currentQuestionData.options), note })}
                  onDelete={() => deleteNote(generateQuestionHash(currentQuestionData.question_text, currentQuestionData.options))}
                  compact
                />
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