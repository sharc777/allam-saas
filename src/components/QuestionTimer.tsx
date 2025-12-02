import { useState, useEffect, useRef } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionTimerProps {
  isActive: boolean;
  onTimeUpdate?: (seconds: number) => void;
  initialTime?: number;
  showWarning?: boolean;
}

export const QuestionTimer = ({ 
  isActive, 
  onTimeUpdate,
  initialTime = 0,
  showWarning = true 
}: QuestionTimerProps) => {
  const [seconds, setSeconds] = useState(initialTime);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          const newTime = prev + 1;
          onTimeUpdate?.(newTime);
          return newTime;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, onTimeUpdate]);

  // Reset timer when initialTime changes (new question)
  useEffect(() => {
    setSeconds(initialTime);
  }, [initialTime]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (!showWarning) return "text-muted-foreground";
    if (seconds < 60) return "text-green-500";
    if (seconds < 90) return "text-yellow-500";
    return "text-red-500";
  };

  const getTimeBgColor = () => {
    if (!showWarning) return "bg-muted/50";
    if (seconds < 60) return "bg-green-500/10";
    if (seconds < 90) return "bg-yellow-500/10";
    return "bg-red-500/10";
  };

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors",
      getTimeBgColor()
    )}>
      <Clock className={cn("w-4 h-4", getTimeColor())} />
      <span className={cn("font-mono text-sm font-medium", getTimeColor())}>
        {formatTime(seconds)}
      </span>
    </div>
  );
};

// Helper function to get time indicator
export const getTimeIndicator = (seconds: number) => {
  if (seconds < 60) return { icon: "🟢", label: "سريع", color: "text-green-500" };
  if (seconds < 90) return { icon: "🟡", label: "متوسط", color: "text-yellow-500" };
  return { icon: "🔴", label: "بطيء", color: "text-red-500" };
};

// Helper function to format time
export const formatTimeDisplay = (totalSeconds: number) => {
  if (totalSeconds < 60) return `${totalSeconds} ث`;
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return secs > 0 ? `${mins} د ${secs} ث` : `${mins} د`;
};
