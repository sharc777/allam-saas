import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface StickyProgressTrackerProps {
  contentCompleted: boolean;
  examplesCompleted: boolean;
  practiceCompleted: boolean;
  quizPassed: boolean;
  onMarkComplete: (section: string) => void;
}

export const StickyProgressTracker = ({
  contentCompleted,
  examplesCompleted,
  practiceCompleted,
  quizPassed,
  onMarkComplete,
}: StickyProgressTrackerProps) => {
  const items = [
    { key: "content", label: "قراءة المحتوى", completed: contentCompleted },
    { key: "examples", label: "مراجعة الأمثلة", completed: examplesCompleted },
    { key: "practice", label: "إكمال التدريب", completed: practiceCompleted },
    { key: "quiz", label: "اجتياز الاختبار (70%+)", completed: quizPassed },
  ];

  const completedCount = items.filter(item => item.completed).length;
  const progressPercentage = (completedCount / items.length) * 100;

  return (
    <Card className="sticky top-4 p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/10">
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="font-bold text-xl mb-2">تقدمك في الدرس</h3>
          <div className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {Math.round(progressPercentage)}%
          </div>
        </div>

        <Progress value={progressPercentage} className="h-3" />

        <div className="space-y-3 mt-6">
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => !item.completed && onMarkComplete(item.key)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                item.completed
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/50 hover:bg-muted"
              }`}
            >
              {item.completed ? (
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              )}
              <span className="text-sm font-medium text-right flex-1">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
};
