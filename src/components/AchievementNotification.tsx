import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Achievement {
  id: string;
  name_ar: string;
  description_ar?: string;
  icon: string;
  points: number;
}

interface AchievementNotificationProps {
  achievement: Achievement;
  onClose: () => void;
}

export const AchievementNotification = ({ achievement, onClose }: AchievementNotificationProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Animate in
    setTimeout(() => setShow(true), 100);
    
    // Auto close after 5 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setShow(false);
    setTimeout(() => onClose(), 300);
  };

  return (
    <div 
      className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        show ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
    >
      <Card className="border-2 border-primary shadow-elegant bg-gradient-to-br from-primary/10 to-secondary/10 backdrop-blur-sm">
        <div className="p-6 flex items-start gap-4" dir="rtl">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center flex-shrink-0 animate-bounce">
            <Trophy className="w-8 h-8 text-primary-foreground" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
              <h3 className="text-xl font-bold">إنجاز جديد!</h3>
            </div>
            <p className="text-lg font-semibold text-primary mb-1">
              {achievement.icon} {achievement.name_ar}
            </p>
            {achievement.description_ar && (
              <p className="text-sm text-muted-foreground mb-2">
                {achievement.description_ar}
              </p>
            )}
            <Badge variant="secondary" className="bg-success/20 text-success">
              +{achievement.points} نقاط
            </Badge>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};