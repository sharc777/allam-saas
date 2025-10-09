import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Award, Target, Zap } from "lucide-react";

interface PerformanceStatsProps {
  currentLevel: string;
  averageScore: number;
  improvementRate: number;
  strengths: string[];
  weaknesses: string[];
  badges: string[];
}

export const PerformanceStats = ({
  currentLevel,
  averageScore,
  improvementRate,
  strengths,
  weaknesses,
  badges
}: PerformanceStatsProps) => {
  const getLevelColor = (level: string) => {
    switch (level) {
      case "ممتاز": return "text-green-600";
      case "متقدم": return "text-blue-600";
      case "متوسط": return "text-yellow-600";
      default: return "text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      {/* Level and Score Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            مستواك الحالي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className={`text-3xl font-bold ${getLevelColor(currentLevel)}`}>
              {currentLevel}
            </span>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {averageScore.toFixed(0)}%
            </Badge>
          </div>
          
          {improvementRate !== 0 && (
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className={`w-4 h-4 ${improvementRate > 0 ? 'text-green-600' : 'text-red-600'}`} />
              <span className={improvementRate > 0 ? 'text-green-600' : 'text-red-600'}>
                {improvementRate > 0 ? '+' : ''}{improvementRate.toFixed(1)}% تطور
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Badges Card */}
      {badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              إنجازاتك
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge, index) => (
                <Badge key={index} variant="default" className="text-sm px-3 py-1">
                  {badge}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strengths and Weaknesses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            نقاط القوة والضعف
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {strengths.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-green-600 mb-2">نقاط القوة:</p>
              <div className="flex flex-wrap gap-2">
                {strengths.map((strength, index) => (
                  <Badge key={index} variant="outline" className="border-green-600 text-green-600">
                    {strength}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {weaknesses.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-red-600 mb-2">نقاط الضعف:</p>
              <div className="flex flex-wrap gap-2">
                {weaknesses.map((weakness, index) => (
                  <Badge key={index} variant="outline" className="border-red-600 text-red-600">
                    {weakness}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};