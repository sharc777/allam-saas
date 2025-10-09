import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, Zap } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";

export const TrialCountdown = () => {
  const { data: profile } = useProfile();
  const { subscribed } = useSubscription();

  // Don't show if user has active subscription
  if (subscribed || profile?.subscription_active) return null;

  const trialDays = profile?.trial_days || 0;
  const totalTrialDays = 3;
  const progress = ((totalTrialDays - trialDays) / totalTrialDays) * 100;

  // Don't show if trial expired
  if (trialDays === 0) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="font-bold">الفترة التجريبية</h3>
            </div>
            <div className="flex items-center gap-2 text-primary">
              <Zap className="w-4 h-4" />
              <span className="font-bold text-lg">{trialDays}</span>
              <span className="text-sm">{trialDays === 1 ? 'يوم' : 'أيام'}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              تم استخدام {totalTrialDays - trialDays} من {totalTrialDays} أيام
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
