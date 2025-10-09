import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Lock, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DayStatus {
  day: number;
  completed: boolean;
  score?: number;
  locked: boolean;
}

interface DayGridProps {
  days: DayStatus[];
  sectionType: string;
  testType: string;
}

export const DayGrid = ({ days, sectionType, testType }: DayGridProps) => {
  const navigate = useNavigate();

  const handleDayClick = (day: number, locked: boolean) => {
    if (!locked) {
      navigate(`/daily-exercise?section=${sectionType}&testType=${testType}&day=${day}`);
    }
  };

  return (
    <div className="grid grid-cols-6 gap-3 p-6">
      {days.map((dayInfo) => (
        <Button
          key={dayInfo.day}
          variant={dayInfo.completed ? "default" : "outline"}
          className={`h-16 relative ${
            dayInfo.locked 
              ? "cursor-not-allowed opacity-50" 
              : "hover:scale-105 transition-transform"
          }`}
          onClick={() => handleDayClick(dayInfo.day, dayInfo.locked)}
          disabled={dayInfo.locked}
        >
          <div className="flex flex-col items-center gap-1">
            {dayInfo.completed ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
                <span className="text-sm font-bold">{dayInfo.day}</span>
                {dayInfo.score !== undefined && (
                  <Badge variant="secondary" className="text-xs px-1">
                    {dayInfo.score}%
                  </Badge>
                )}
              </>
            ) : dayInfo.locked ? (
              <>
                <Lock className="w-5 h-5" />
                <span className="text-sm">{dayInfo.day}</span>
              </>
            ) : (
              <>
                <Circle className="w-5 h-5" />
                <span className="text-sm font-semibold">{dayInfo.day}</span>
              </>
            )}
          </div>
        </Button>
      ))}
    </div>
  );
};