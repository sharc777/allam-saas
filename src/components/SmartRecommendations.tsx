import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Lightbulb, ArrowRight, Target, BookOpen, Brain, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
  actionUrl?: string;
}

export const SmartRecommendations = () => {
  const navigate = useNavigate();
  const [completedRecs, setCompletedRecs] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["smart-recommendations"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("generate-smart-recommendations", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data;
    },
    staleTime: 30 * 60 * 1000, // ✅ 30 دقيقة بدلاً من 5
    gcTime: 60 * 60 * 1000,    // ✅ ساعة كاملة
  });

  const priorityColors = {
    high: "destructive",
    medium: "default",
    low: "secondary",
  } as const;

  const priorityLabels = {
    high: "عالية",
    medium: "متوسطة",
    low: "منخفضة",
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const recommendations: Recommendation[] = data?.recommendations || [];

  const getRecIcon = (priority: string) => {
    if (priority === 'high') return <Target className="w-5 h-5" />;
    if (priority === 'medium') return <BookOpen className="w-5 h-5" />;
    return <Brain className="w-5 h-5" />;
  };

  const getCategoryIcon = (title: string) => {
    if (title.includes('تمرين') || title.includes('ممارسة')) return '🎯';
    if (title.includes('مراجعة') || title.includes('درس')) return '📚';
    if (title.includes('اختبار')) return '📝';
    return '💡';
  };

  const handleComplete = (index: number) => {
    setCompletedRecs(prev => new Set([...prev, index]));
  };

  const completionRate = recommendations.length > 0 
    ? (completedRecs.size / recommendations.length) * 100 
    : 0;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              <CardTitle>توصيات ذكية مخصصة</CardTitle>
            </div>
            {recommendations.length > 0 && (
              <Badge variant="secondary" className="text-sm">
                {completedRecs.size}/{recommendations.length} مكتمل
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            توصيات مبنية على أدائك وتحليل نقاط قوتك وضعفك
          </p>
          {recommendations.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>التقدم الكلي</span>
                <span>{completionRate.toFixed(0)}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
          )}
        </CardHeader>
      </Card>

      {recommendations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد توصيات حالياً. استمر في حل التمارين لتحصل على توصيات مخصصة.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {recommendations.map((rec, index) => {
            const isCompleted = completedRecs.has(index);
            
            return (
              <Card 
                key={index} 
                className={`hover:shadow-md transition-all ${
                  isCompleted ? 'opacity-60 bg-accent/5' : ''
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`text-3xl flex-shrink-0 ${isCompleted ? 'grayscale' : ''}`}>
                      {getCategoryIcon(rec.title)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className={`font-bold text-lg ${isCompleted ? 'line-through' : ''}`}>
                              {rec.title}
                            </h3>
                            {isCompleted && (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            )}
                          </div>
                          <Badge 
                            variant={priorityColors[rec.priority]}
                            className="mb-2"
                          >
                            {getRecIcon(rec.priority)}
                            <span className="mr-2">{priorityLabels[rec.priority]}</span>
                          </Badge>
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-4">{rec.description}</p>
                      
                      {!isCompleted && rec.action && (
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => {
                              if (rec.actionUrl) navigate(rec.actionUrl);
                              handleComplete(index);
                            }}
                            className="flex-1 sm:flex-none"
                          >
                            {rec.action}
                            <ArrowRight className="w-4 h-4 mr-2" />
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => handleComplete(index)}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
