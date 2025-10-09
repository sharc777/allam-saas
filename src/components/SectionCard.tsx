import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SectionCardProps {
  sectionType: string;
  sectionNameAr: string;
  testType: string;
  completedDays: number;
  averageScore: number;
  icon?: string;
}

export const SectionCard = ({
  sectionType,
  sectionNameAr,
  testType,
  completedDays,
  averageScore,
  icon = "📚"
}: SectionCardProps) => {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate(`/daily-exercise?section=${sectionType}&testType=${testType}`);
  };

  return (
    <Card className="hover:shadow-elegant transition-all duration-300 border-2 hover:border-primary/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <span className="text-3xl">{icon}</span>
            {sectionNameAr}
          </CardTitle>
          {averageScore > 0 && (
            <Badge variant={averageScore >= 70 ? "default" : "secondary"} className="text-lg px-3 py-1">
              {averageScore.toFixed(0)}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {completedDays} / 30 يوم مكتمل
            </span>
          </div>
          {averageScore > 0 && (
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-primary font-semibold">
                متوسط الأداء
              </span>
            </div>
          )}
        </div>
        <Button 
          onClick={handleStart}
          className="w-full gradient-primary text-primary-foreground"
          size="lg"
        >
          ابدأ التمرين اليوم
        </Button>
      </CardContent>
    </Card>
  );
};