import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { customTestSchema } from "@/lib/validation";
import { toast } from "sonner";
import { useTestStructure } from "@/hooks/useTestStructure";

// دالة الكشف التلقائي عن القسم من الموضوع
const detectSectionFromTopic = (topic: string): string | null => {
  const verbalKeywords = [
    'استيعاب', 'مقروء', 'قراءة', 'مفردات', 'تناظر', 'لفظي',
    'جمل', 'سياق', 'ارتباط', 'اختلاف', 'نقدي', 'استنتاج',
    'إكمال', 'خطأ', 'نص', 'فهم', 'تحليل'
  ];
  
  const quantKeywords = [
    'جبر', 'هندسة', 'إحصاء', 'أعداد', 'نسب', 'تناسب',
    'معادلات', 'متتاليات', 'احتمالات', 'قياس', 'حساب', 'رياضيات',
    'كسور', 'نسبة', 'مئوية', 'مساحة', 'محيط', 'زاوية'
  ];
  
  if (verbalKeywords.some(kw => topic.includes(kw))) return 'لفظي';
  if (quantKeywords.some(kw => topic.includes(kw))) return 'كمي';
  
  return null;
};

interface CustomTestDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateTest: (params: TestParams) => void;
  initialTopic?: string;
  isGenerating?: boolean;
}

export interface TestParams {
  topic: string;
  questionCount: number;
  difficulty: "easy" | "medium" | "hard";
  section: string;
}

export const CustomTestDialog = ({ 
  open, 
  onClose, 
  onCreateTest, 
  initialTopic = "",
  isGenerating = false
}: CustomTestDialogProps) => {
  const { sections } = useTestStructure();
  const [topic, setTopic] = useState(initialTopic);
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [section, setSection] = useState(sections[0]?.id || "كمي");

  // Update topic when initialTopic changes
  useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic);
    }
  }, [initialTopic]);

  // الكشف التلقائي عن القسم عند تغيير الموضوع
  useEffect(() => {
    if (topic.trim().length >= 3) {
      const detectedSection = detectSectionFromTopic(topic);
      if (detectedSection && detectedSection !== section) {
        setSection(detectedSection);
        console.log(`🔄 Auto-detected section: ${detectedSection} for topic: ${topic}`);
      }
    }
  }, [topic]);

  const handleCreate = () => {
    // Validate inputs
    const result = customTestSchema.safeParse({
      topic,
      questionCount,
      difficulty,
      section
    });
    
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      toast.error(
        errors.topic?.[0] || 
        errors.questionCount?.[0] || 
        errors.difficulty?.[0] || 
        errors.section?.[0] || 
        "بيانات غير صالحة"
      );
      return;
    }
    
    // result.data is guaranteed to have all properties after successful validation
    onCreateTest({
      topic: result.data.topic,
      questionCount: result.data.questionCount,
      difficulty: result.data.difficulty,
      section: result.data.section
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl">إنشاء اختبار مخصص</DialogTitle>
          <DialogDescription>
            اختر موضوع الاختبار وإعداداته لبدء التدريب المركز
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="topic">الموضوع</Label>
            <Input
              id="topic"
              placeholder="مثال: النسبة المئوية، الاستنتاج، المعاني..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="section">القسم</Label>
            <Select value={section} onValueChange={setSection} disabled={isGenerating}>
              <SelectTrigger id="section">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sections.map((sec) => (
                  <SelectItem key={sec.id} value={sec.id}>
                    {sec.icon} {sec.nameAr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="questionCount">عدد الأسئلة</Label>
            <Select 
              value={questionCount.toString()} 
              onValueChange={(v) => setQuestionCount(parseInt(v))}
              disabled={isGenerating}
            >
              <SelectTrigger id="questionCount">
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

          <div className="space-y-2">
            <Label htmlFor="difficulty">مستوى الصعوبة</Label>
            <Select 
              value={difficulty} 
              onValueChange={(v: any) => setDifficulty(v)}
              disabled={isGenerating}
            >
              <SelectTrigger id="difficulty">
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

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="flex-1"
            disabled={isGenerating}
          >
            إلغاء
          </Button>
          <Button 
            onClick={handleCreate} 
            className="flex-1 gradient-primary text-primary-foreground"
            disabled={!topic.trim() || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الإنشاء...
              </>
            ) : (
              "إنشاء الاختبار"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
