import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Brain, Target, Zap } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type TestType = Database["public"]["Enums"]["test_type"];
type AcademicTrack = Database["public"]["Enums"]["academic_track"];

const PracticeQuiz = () => {
  const navigate = useNavigate();
  const [testType, setTestType] = useState<TestType>("قدرات");
  const [track, setTrack] = useState<AcademicTrack>("عام");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [questionCount] = useState(10);

  const handleStartQuiz = () => {
    // Navigate to quiz page with practice mode parameters
    const params = new URLSearchParams({
      mode: "practice",
      testType,
      track,
      difficulty,
      count: questionCount.toString(),
    });
    navigate(`/quiz?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5" dir="rtl">
      <Navbar />
      
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold">اختبار تدريبي حر</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            اختر معايير الاختبار الخاص بك وابدأ التدريب
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-6 w-6" />
              إعدادات الاختبار
            </CardTitle>
            <CardDescription>
              قم بتخصيص اختبارك التدريبي حسب احتياجاتك
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Test Type Selection */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                نوع الاختبار
              </Label>
              <RadioGroup value={testType} onValueChange={(value) => setTestType(value as TestType)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card 
                    className={`cursor-pointer transition-all ${testType === "قدرات" ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setTestType("قدرات")}
                  >
                    <CardContent className="flex items-center gap-3 p-4">
                      <RadioGroupItem value="قدرات" id="qudurat" />
                      <div>
                        <Label htmlFor="qudurat" className="cursor-pointer font-semibold">
                          اختبار القدرات العامة
                        </Label>
                        <p className="text-sm text-muted-foreground">لفظي وكمي</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    className={`cursor-pointer transition-all ${testType === "تحصيلي" ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setTestType("تحصيلي")}
                  >
                    <CardContent className="flex items-center gap-3 p-4">
                      <RadioGroupItem value="تحصيلي" id="tahseeli" />
                      <div>
                        <Label htmlFor="tahseeli" className="cursor-pointer font-semibold">
                          الاختبار التحصيلي
                        </Label>
                        <p className="text-sm text-muted-foreground">علمي أو نظري</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </RadioGroup>
            </div>

            {/* Track Selection (only for تحصيلي) */}
            {testType === "تحصيلي" && (
              <div className="space-y-3">
                <Label className="text-lg font-semibold">المسار الأكاديمي</Label>
                <RadioGroup value={track} onValueChange={(value) => setTrack(value as AcademicTrack)}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card 
                      className={`cursor-pointer transition-all ${track === "علمي" ? "ring-2 ring-primary" : ""}`}
                      onClick={() => setTrack("علمي")}
                    >
                      <CardContent className="flex items-center gap-3 p-4">
                        <RadioGroupItem value="علمي" id="science" />
                        <Label htmlFor="science" className="cursor-pointer font-semibold">
                          المسار العلمي
                        </Label>
                      </CardContent>
                    </Card>
                    
                    <Card 
                      className={`cursor-pointer transition-all ${track === "نظري" ? "ring-2 ring-primary" : ""}`}
                      onClick={() => setTrack("نظري")}
                    >
                      <CardContent className="flex items-center gap-3 p-4">
                        <RadioGroupItem value="نظري" id="theory" />
                        <Label htmlFor="theory" className="cursor-pointer font-semibold">
                          المسار النظري
                        </Label>
                      </CardContent>
                    </Card>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Difficulty Selection */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5" />
                مستوى الصعوبة
              </Label>
              <Select value={difficulty} onValueChange={(value: any) => setDifficulty(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر المستوى" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">سهل</SelectItem>
                  <SelectItem value="medium">متوسط</SelectItem>
                  <SelectItem value="hard">صعب</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Info Box */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-primary mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-semibold">معلومات عن الاختبار:</p>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• عدد الأسئلة: {questionCount} سؤال</li>
                      <li>• لا يوجد حد زمني</li>
                      <li>• يمكنك الرجوع للأسئلة السابقة</li>
                      <li>• سيتم حفظ نتائجك تلقائياً</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Start Button */}
            <Button 
              onClick={handleStartQuiz}
              size="lg"
              className="w-full text-lg py-6"
            >
              <Brain className="ml-2 h-5 w-5" />
              ابدأ الاختبار التدريبي
            </Button>

            <Button 
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="w-full"
            >
              العودة للوحة التحكم
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PracticeQuiz;
