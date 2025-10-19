import { Button } from "@/components/ui/button";
import { BookOpen, FileText, AlertTriangle, Dumbbell, Lightbulb, TrendingUp, Target, Map } from "lucide-react";

interface QuickActionsProps {
  mode: "general" | "review_mistakes" | "focused_practice" | "instant_help";
  onActionClick: (message: string) => void;
  weaknessData?: any;
  disabled?: boolean;
}

const QuickActions = ({ mode, onActionClick, weaknessData, disabled }: QuickActionsProps) => {
  // Quick actions for instant_help mode
  const instantHelpActions = [
    {
      icon: BookOpen,
      label: "اشرح السؤال خطوة بخطوة",
      message: "اشرح لي هذا السؤال بالتفصيل خطوة بخطوة",
      color: "bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300",
    },
    {
      icon: FileText,
      label: "أعطني 3 أمثلة مشابهة",
      message: "أريد 3 أمثلة مشابهة لهذا السؤال مع الحلول",
      color: "bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-300",
    },
    {
      icon: AlertTriangle,
      label: "ما الأخطاء الشائعة؟",
      message: "ما هي الأخطاء الشائعة في هذا النوع من الأسئلة؟",
      color: "bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-300",
    },
    {
      icon: Dumbbell,
      label: "أريد تمرين تطبيقي",
      message: "أعطني تمرين تطبيقي مشابه لأحل بنفسي",
      color: "bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300",
    },
  ];

  // Quick actions for review_mistakes mode
  const reviewMistakesActions = weaknessData?.repeatedMistakes?.slice(0, 4).map((mistake: any) => ({
    icon: AlertTriangle,
    label: mistake.topic,
    message: `اشرح لي أخطائي في موضوع ${mistake.topic}`,
    color: "bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-300",
  })) || [];

  // Quick actions for focused_practice mode
  const focusedPracticeActions = weaknessData?.weaknesses?.critical?.slice(0, 4).map((weakness: any) => ({
    icon: Target,
    label: `${weakness.topic} (${weakness.successRate}%)`,
    message: `أريد تدريباً مركزاً على ${weakness.topic}`,
    color: "bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-300",
  })) || [];

  // Quick actions for general mode
  const generalActions = [
    {
      icon: Lightbulb,
      label: "اقترح لي ما أراجعه اليوم",
      message: "ما هي المواضيع التي تنصحني بمراجعتها اليوم؟",
      color: "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
    },
    {
      icon: TrendingUp,
      label: "كيف أحسن أدائي؟",
      message: "كيف يمكنني تحسين أدائي في الاختبار؟",
      color: "bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-300",
    },
    {
      icon: Target,
      label: "ما هي نقاط ضعفي الأساسية؟",
      message: "ما هي نقاط ضعفي الأساسية التي يجب أن أركز عليها؟",
      color: "bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-300",
    },
    {
      icon: Map,
      label: "أرني خطة دراسية",
      message: "اقترح لي خطة دراسية لتحسين أدائي",
      color: "bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300",
    },
  ];

  // Select actions based on mode
  let actions: any[] = [];
  if (mode === "instant_help") {
    actions = instantHelpActions;
  } else if (mode === "review_mistakes") {
    actions = reviewMistakesActions.length > 0 ? reviewMistakesActions : [];
  } else if (mode === "focused_practice") {
    actions = focusedPracticeActions.length > 0 ? focusedPracticeActions : [];
  } else {
    actions = generalActions;
  }

  if (actions.length === 0) return null;

  return (
    <div className="border-t p-4 bg-muted/30" dir="rtl">
      <p className="text-sm text-muted-foreground mb-3 font-semibold">
        ⚡ إجراءات سريعة:
      </p>
      <div className="flex gap-2 flex-wrap">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button
              key={index}
              size="sm"
              variant="outline"
              className={`${action.color} border-0 transition-all hover:scale-105`}
              onClick={() => onActionClick(action.message)}
              disabled={disabled}
            >
              <Icon className="w-4 h-4 ml-2" />
              {action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;
