import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, ArrowRight, ListOrdered } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type TestType = Database["public"]["Enums"]["test_type"];
type AcademicTrack = Database["public"]["Enums"]["academic_track"];

interface PracticeZoneProps {
  contentId?: string;
  dayNumber?: string;
  testType: TestType;
  track: AcademicTrack;
  focusSection?: string;
  focusTopics?: string[];
}

interface Question {
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
  section?: string;
  subject?: string;
  difficulty?: string;
}

export const PracticeZone = ({ 
  contentId, 
  dayNumber, 
  testType, 
  track,
  focusSection,
  focusTopics = []
}: PracticeZoneProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<string>("easy");
  const [sectionFilter, setSectionFilter] = useState<string>(focusSection || "all");
  const [started, setStarted] = useState(false);

  // Function to format explanation into steps
  const formatExplanation = (text: string) => {
    if (!text) return [];
    
    // Split by numbers followed by period or dash or numbered list patterns
    const patterns = [
      /(\d+[\.\):])/g,  // 1. or 1) or 1:
      /([أ-ي][\.\)])/g, // أ. or أ)
      /(الخطوة \d+)/gi,
      /(أولاً|ثانياً|ثالثاً|رابعاً|خامساً)/gi,
    ];
    
    let steps: string[] = [];
    let remaining = text;
    
    // Try to split by common patterns
    for (const pattern of patterns) {
      const matches = remaining.match(pattern);
      if (matches && matches.length > 1) {
        steps = remaining.split(pattern).filter(s => s.trim());
        break;
      }
    }
    
    // If no pattern found, try splitting by periods for long text
    if (steps.length === 0) {
      const sentences = remaining.split(/[\.!؟]\s+/);
      if (sentences.length > 3) {
        steps = sentences.filter(s => s.trim());
      } else {
        // Return as single paragraph
        return [{ type: 'paragraph', content: text }];
      }
    }
    
    // Format steps with proper numbering
    return steps
      .map((step, idx) => {
        const content = step.replace(/^[\d\.\)\:أ-ي\s]+/, '').trim();
        return content ? { type: 'step', number: idx + 1, content } : null;
      })
      .filter(Boolean);
  };
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const { data: questions, isLoading, error } = useQuery({
    queryKey: ["practice-quiz", contentId, dayNumber, questionCount, difficulty, sectionFilter],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const body: any = {
        mode: "practice",
        testType,
        track,
        questionCount,
        difficulty,
      };

      if (contentId) body.contentId = contentId;
      if (dayNumber) body.dayNumber = parseInt(dayNumber);
      if (sectionFilter && sectionFilter !== "all") body.sectionFilter = sectionFilter;

      const { data, error } = await supabase.functions.invoke("generate-quiz", { body });

      if (error) {
        if (error.message?.includes("429")) {
          throw new Error("تم تجاوز الحد المسموح. يرجى المحاولة لاحقاً.");
        }
        if (error.message?.includes("402")) {
          throw new Error("يرجى إضافة رصيد إلى حساب Lovable AI الخاص بك.");
        }
        throw error;
      }

      return data.questions as Question[];
    },
    enabled: started,
  });

  const savePracticeMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !questions) throw new Error("Missing data");

      const correctCount = Object.entries(answers).filter(
        ([idx, ans]) => ans === questions[parseInt(idx)].correct_answer
      ).length;

      const percentage = (correctCount / questions.length) * 100;

      const { error } = await supabase.from("quiz_results").insert([{
        user_id: user.id,
        score: correctCount,
        total_questions: questions.length,
        percentage,
        questions: questions as any,
        quiz_mode: "practice",
        daily_content_id: contentId || null,
        day_number: dayNumber ? parseInt(dayNumber) : null,
        test_type: testType,
        track: track,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-results"] });
      toast({ title: "تم حفظ نتائج التدريب بنجاح" });
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const handleStart = () => {
    setStarted(true);
    setCurrentIndex(0);
    setAnswers({});
    setSelectedAnswer("");
    setShowExplanation(false);
  };

  const handleSelectAnswer = (value: string) => {
    setSelectedAnswer(value);
    setShowExplanation(true);
    setAnswers(prev => ({ ...prev, [currentIndex]: value }));
  };

  const handleNext = () => {
    if (currentIndex < (questions?.length || 0) - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(answers[currentIndex + 1] || "");
      setShowExplanation(!!answers[currentIndex + 1]);
    } else {
      savePracticeMutation.mutate();
      setStarted(false);
    }
  };

  const correctCount = Object.entries(answers).filter(
    ([idx, ans]) => questions && ans === questions[parseInt(idx)].correct_answer
  ).length;

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive text-center">{(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!started) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>منطقة التدريب</CardTitle>
          <CardDescription>خصص تدريبك حسب احتياجاتك</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>عدد الأسئلة</Label>
            <Select value={questionCount.toString()} onValueChange={(v) => setQuestionCount(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 أسئلة</SelectItem>
                <SelectItem value="5">5 أسئلة</SelectItem>
                <SelectItem value="10">10 أسئلة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>المستوى</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">سهل</SelectItem>
                <SelectItem value="medium">متوسط</SelectItem>
                <SelectItem value="hard">صعب</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {testType === "قدرات" && (
            <div className="space-y-2">
              <Label>القسم</Label>
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="لفظي">لفظي</SelectItem>
                  <SelectItem value="كمي">كمي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button onClick={handleStart} className="w-full">
            ابدأ التدريب
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>جاري تحضير الأسئلة...</p>
        </CardContent>
      </Card>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center">لم يتم العثور على أسئلة</p>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isCorrect = selectedAnswer === currentQuestion.correct_answer;
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>السؤال {currentIndex + 1} من {questions.length}</CardTitle>
            <div className="text-sm">
              النتيجة: {correctCount} / {Object.keys(answers).length}
            </div>
          </div>
          <Progress value={progressPercent} className="mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg font-medium leading-relaxed">{currentQuestion.question}</p>

          <RadioGroup value={selectedAnswer} onValueChange={handleSelectAnswer} disabled={showExplanation}>
            {currentQuestion.options.map((option, idx) => {
              const isThisCorrect = option === currentQuestion.correct_answer;
              const isSelected = selectedAnswer === option;
              
              return (
                <div
                  key={idx}
                  className={`flex items-center space-x-2 space-x-reverse p-3 rounded-lg border ${
                    showExplanation
                      ? isThisCorrect
                        ? "border-green-500 bg-green-50 dark:bg-green-950"
                        : isSelected
                        ? "border-red-500 bg-red-50 dark:bg-red-950"
                        : ""
                      : ""
                  }`}
                >
                  <RadioGroupItem value={option} id={`option-${idx}`} />
                  <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                  {showExplanation && isThisCorrect && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                  {showExplanation && isSelected && !isThisCorrect && <XCircle className="h-5 w-5 text-red-600" />}
                </div>
              );
            })}
          </RadioGroup>

          {showExplanation && currentQuestion.explanation && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="explanation" className="border-none">
                <AccordionTrigger className="bg-primary/5 hover:bg-primary/10 rounded-lg px-4 py-3 hover:no-underline transition-colors">
                  <div className="flex items-center gap-2 text-right w-full">
                    <ListOrdered className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-primary">الشرح التفصيلي</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="bg-muted/30 rounded-b-lg px-4 pt-4 pb-2">
                  {(() => {
                    const formattedSteps = formatExplanation(currentQuestion.explanation || '');
                    
                    if (formattedSteps.length === 0 || formattedSteps[0]?.type === 'paragraph') {
                      return (
                        <p className="text-sm leading-relaxed text-foreground/90">
                          {currentQuestion.explanation}
                        </p>
                      );
                    }
                    
                    return (
                      <ol className="space-y-3">
                        {formattedSteps.map((step: any, idx: number) => (
                          <li key={idx} className="flex gap-3 text-sm">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                              {step.number}
                            </span>
                            <span className="flex-1 leading-relaxed pt-0.5 text-foreground/90">
                              {step.content}
                            </span>
                          </li>
                        ))}
                      </ol>
                    );
                  })()}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {showExplanation && (
            <Button onClick={handleNext} className="w-full">
              {currentIndex < questions.length - 1 ? (
                <>
                  السؤال التالي <ArrowRight className="mr-2 h-4 w-4" />
                </>
              ) : (
                "إنهاء التدريب"
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
