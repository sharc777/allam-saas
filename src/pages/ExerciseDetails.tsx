import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, CheckCircle2, XCircle, Brain, Calendar, Clock, ListOrdered } from "lucide-react";
import { useExerciseDetails } from "@/hooks/useExerciseHistory";
import Navbar from "@/components/Navbar";
import { useState } from "react";
import AITutor from "@/components/AITutor";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Question {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  section?: string;
  subject?: string;
  user_answer?: string;
}

const ExerciseDetails = () => {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const { data: exercise, isLoading } = useExerciseDetails(exerciseId);
  const [showAITutor, setShowAITutor] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center">جاري التحميل...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center">
              <p className="text-lg mb-4">التمرين غير موجود</p>
              <Button onClick={() => navigate("/exercise-history")}>
                العودة للسجل
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const questions: Question[] = Array.isArray(exercise.questions) 
    ? (exercise.questions as unknown as Question[]) 
    : [];
  const correctCount = questions.filter(q => q.user_answer === q.correct_answer).length;
  const incorrectCount = questions.length - correctCount;

  const handleAskAI = (question: Question) => {
    setSelectedQuestion(question);
    setShowAITutor(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/exercise-history")}
              className="mb-4"
            >
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة للسجل
            </Button>
            
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-2xl">تفاصيل التمرين</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">القسم</p>
                    <p className="font-bold">{exercise.section_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">النتيجة</p>
                    <p className="font-bold text-2xl">{exercise.score}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">التاريخ</p>
                    <p className="font-semibold">
                      {format(new Date(exercise.created_at), "dd MMM yyyy", { locale: ar })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">الوقت</p>
                    <p className="font-semibold">{exercise.time_taken_minutes || 0} دقيقة</p>
                  </div>
                </div>

                <div className="mt-4 flex gap-4">
                  <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4 ml-1" />
                    {correctCount} صحيحة
                  </Badge>
                  <Badge className="bg-red-500/10 text-red-600 dark:text-red-400">
                    <XCircle className="w-4 h-4 ml-1" />
                    {incorrectCount} خاطئة
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Questions List */}
          <div className="space-y-6">
            {questions.map((question, index) => {
              const isCorrect = question.user_answer === question.correct_answer;
              
              return (
                <Card key={index} className={isCorrect ? "border-green-500/50" : "border-red-500/50"}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">السؤال {index + 1}</CardTitle>
                      {isCorrect ? (
                        <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-4 h-4 ml-1" />
                          صحيح
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-600 dark:text-red-400">
                          <XCircle className="w-4 h-4 ml-1" />
                          خاطئ
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-lg font-medium">{question.question_text}</p>
                    
                    <div className="space-y-2">
                      {question.options?.map((option, optIndex) => {
                        const isUserAnswer = option === question.user_answer;
                        const isCorrectAnswer = option === question.correct_answer;
                        
                        let className = "p-3 rounded-lg border ";
                        if (isCorrectAnswer) {
                          className += "bg-green-500/10 border-green-500 text-green-700 dark:text-green-300";
                        } else if (isUserAnswer && !isCorrect) {
                          className += "bg-red-500/10 border-red-500 text-red-700 dark:text-red-300";
                        } else {
                          className += "bg-muted/50 border-border";
                        }
                        
                        return (
                          <div key={optIndex} className={className}>
                            <div className="flex items-center gap-2">
                              {isCorrectAnswer && <CheckCircle2 className="w-5 h-5" />}
                              {isUserAnswer && !isCorrect && <XCircle className="w-5 h-5" />}
                              <span>{option}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {!isCorrect && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">
                          الإجابة الصحيحة:
                        </p>
                        <p className="text-blue-600 dark:text-blue-400">{question.correct_answer}</p>
                      </div>
                    )}

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
                            const formattedSteps = formatExplanation(question.explanation);
                            
                            if (formattedSteps.length === 0 || formattedSteps[0]?.type === 'paragraph') {
                              return (
                                <p className="text-sm leading-relaxed text-foreground/90">
                                  {question.explanation}
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

                    <Button
                      variant="outline"
                      onClick={() => handleAskAI(question)}
                      className="w-full"
                    >
                      <Brain className="w-4 h-4 ml-2" />
                      اسأل المدرس الذكي عن هذا السؤال
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {showAITutor && (
        <AITutor
          onClose={() => {
            setShowAITutor(false);
            setSelectedQuestion(null);
          }}
          mode="instant_help"
          initialQuestion={selectedQuestion || undefined}
        />
      )}
    </div>
  );
};

export default ExerciseDetails;
