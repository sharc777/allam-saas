import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Lightbulb, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
  actionUrl?: string;
}

export const SmartRecommendations = () => {
  const navigate = useNavigate();

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
    staleTime: 5 * 60 * 1000, // 5 minutes
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

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            <CardTitle>توصيات ذكية مخصصة</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            توصيات مبنية على أدائك وتحليل نقاط قوتك وضعفك
          </p>
        </CardHeader>
      </Card>

      {recommendations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            لا توجد توصيات حالياً. استمر في حل التمارين لتحصل على توصيات مخصصة.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {recommendations.map((rec, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="font-bold text-lg">{rec.title}</h3>
                  <Badge variant={priorityColors[rec.priority]}>
                    {priorityLabels[rec.priority]}
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-4">{rec.description}</p>
                {rec.action && (
                  <Button 
                    onClick={() => rec.actionUrl && navigate(rec.actionUrl)}
                    className="w-full sm:w-auto"
                  >
                    {rec.action}
                    <ArrowRight className="w-4 h-4 mr-2" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
