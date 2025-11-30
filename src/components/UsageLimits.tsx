import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, RefreshCw, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { usePackages } from "@/hooks/usePackages";

export const UsageLimits = () => {
  const { data: profile } = useProfile();
  
  // Fetch daily limits
  const { data: limits, isLoading: limitsLoading, refetch } = useQuery({
    queryKey: ["daily-limits", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-daily-limits");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch custom test limits
  const { data: testLimits, isLoading: testLimitsLoading } = useQuery({
    queryKey: ["custom-test-limits", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data, error } = await supabase.rpc("check_custom_test_limit", {
        p_user_id: profile.id,
      });
      if (error) throw error;
      return data as {
        can_create: boolean;
        remaining: number;
        max_tests: number;
        current_count: number;
        message: string;
      } | null;
    },
    enabled: !!profile?.id,
    refetchInterval: 60000,
  });

  // Get user's package info
  const { data: packages } = usePackages({ activeOnly: true });
  const userPackage = packages?.find((pkg) => pkg.id === profile?.package_id);

  if (limitsLoading || testLimitsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 استخدامك اليوم</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const calculatePercentage = (current: number, max: number) => {
    if (max === 999 || max === 0) return 100;
    return (current / max) * 100;
  };

  const formatResetTime = (resetAt: string) => {
    const reset = new Date(resetAt);
    const now = new Date();
    const diff = reset.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `بعد ${hours} ساعة و ${minutes} دقيقة`;
    }
    return `بعد ${minutes} دقيقة`;
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">📊 استخدامك اليوم</CardTitle>
          {userPackage && (
            <Badge variant="secondary" className="text-xs">
              {userPackage.name_ar}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quantitative Exercises */}
        {limits && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">تمارين كمي</span>
              <span className="text-muted-foreground">
                {limits.current_counts?.quantitative || 0}/{limits.max_quantitative || 10}
              </span>
            </div>
            <Progress
              value={calculatePercentage(
                limits.current_counts?.quantitative || 0,
                limits.max_quantitative || 10
              )}
              className="h-2"
            />
          </div>
        )}

        {/* Verbal Exercises */}
        {limits && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">تمارين لفظي</span>
              <span className="text-muted-foreground">
                {limits.current_counts?.verbal || 0}/{limits.max_verbal || 10}
              </span>
            </div>
            <Progress
              value={calculatePercentage(
                limits.current_counts?.verbal || 0,
                limits.max_verbal || 10
              )}
              className="h-2"
            />
          </div>
        )}

        {/* Custom Tests */}
        {testLimits && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">اختبارات مخصصة</span>
              <span className="text-muted-foreground">
                {testLimits.current_count || 0}/{testLimits.max_tests || 5}
              </span>
            </div>
            <Progress
              value={calculatePercentage(
                testLimits.current_count || 0,
                testLimits.max_tests || 5
              )}
              className="h-2"
            />
          </div>
        )}

        {/* Reset Timer */}
        {limits?.reset_at && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <Clock className="w-3 h-3" />
            <span>تجديد الحدود: {formatResetTime(limits.reset_at)}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
            }}
            className="flex-1"
          >
            <RefreshCw className="w-3 h-3 ml-1" />
            تحديث
          </Button>
          
          {!profile?.subscription_active && (
            <Button
              asChild
              size="sm"
              className="flex-1 gradient-primary"
            >
              <Link to="/subscription">
                <ArrowUpCircle className="w-3 h-3 ml-1" />
                ترقية الباقة
              </Link>
            </Button>
          )}
        </div>

        {/* Status Message */}
        {limits?.message && (
          <div className="text-xs text-center text-muted-foreground pt-2 border-t">
            {limits.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
};