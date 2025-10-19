import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  BookOpen, 
  Trophy, 
  Brain, 
  Target, 
  CheckCircle2,
  MessageSquare,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Activity {
  id: string;
  activity_type: string;
  activity_date: string;
  metadata: any;
  score?: number;
  time_spent_minutes?: number;
  topics_covered?: string[];
}

interface ActivityTimelineProps {
  activities: Activity[];
}

const activityIcons: Record<string, any> = {
  daily_exercise: BookOpen,
  custom_test: Target,
  weakness_practice: Brain,
  quiz_completed: CheckCircle2,
  lesson_completed: Zap,
  achievement_unlocked: Trophy,
  ai_chat_session: MessageSquare,
};

const activityLabels: Record<string, string> = {
  daily_exercise: "تمرين يومي",
  custom_test: "اختبار مخصص",
  weakness_practice: "تدريب على نقاط الضعف",
  quiz_completed: "اختبار مكتمل",
  lesson_completed: "درس مكتمل",
  achievement_unlocked: "إنجاز جديد",
  ai_chat_session: "جلسة مع المساعد الذكي",
};

const activityColors: Record<string, string> = {
  daily_exercise: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  custom_test: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  weakness_practice: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  quiz_completed: "bg-green-500/10 text-green-600 border-green-500/20",
  lesson_completed: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  achievement_unlocked: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  ai_chat_session: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
};

export const ActivityTimeline = ({ activities }: ActivityTimelineProps) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        لا توجد أنشطة حتى الآن
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        const Icon = activityIcons[activity.activity_type] || BookOpen;
        const label = activityLabels[activity.activity_type] || activity.activity_type;
        const colorClass = activityColors[activity.activity_type] || "bg-gray-500/10 text-gray-600 border-gray-500/20";

        return (
          <div
            key={activity.id}
            className="flex gap-4 items-start relative"
          >
            {/* Timeline line */}
            {index < activities.length - 1 && (
              <div className="absolute right-[19px] top-10 bottom-0 w-0.5 bg-border" />
            )}

            {/* Icon */}
            <div className={`p-2 rounded-full border-2 ${colorClass} z-10 bg-background`}>
              <Icon className="w-5 h-5" />
            </div>

            {/* Content */}
            <div className="flex-1 space-y-2 pb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-semibold">{label}</p>
                  {activity.metadata?.custom_topic && (
                    <p className="text-sm text-muted-foreground">
                      الموضوع: {activity.metadata.custom_topic}
                    </p>
                  )}
                  {activity.topics_covered && activity.topics_covered.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {activity.topics_covered.map((topic, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-left space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(activity.activity_date), "PPp", { locale: ar })}
                  </p>
                  {activity.score !== null && activity.score !== undefined && (
                    <Badge variant="outline" className="ml-0">
                      {activity.score}%
                    </Badge>
                  )}
                </div>
              </div>

              {activity.time_spent_minutes && (
                <p className="text-sm text-muted-foreground">
                  ⏱️ الوقت المستغرق: {activity.time_spent_minutes} دقيقة
                </p>
              )}

              {activity.metadata?.total_questions && (
                <p className="text-sm text-muted-foreground">
                  📝 عدد الأسئلة: {activity.metadata.total_questions}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
