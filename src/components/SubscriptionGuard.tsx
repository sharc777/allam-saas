import { ReactNode } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Crown, Zap, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SubscriptionGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireSubscription?: boolean;
}

export const SubscriptionGuard = ({ 
  children, 
  fallback,
  requireSubscription = true 
}: SubscriptionGuardProps) => {
  const { subscribed, isLoading: subLoading } = useSubscription();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const navigate = useNavigate();

  const isLoading = subLoading || profileLoading;
  
  // Check if user has a valid package that hasn't expired
  const hasValidPackage = profile?.package_id && 
    profile?.package_end_date && 
    new Date(profile.package_end_date) > new Date();
  
  const hasAccess = subscribed || profile?.subscription_active || (profile?.trial_days ?? 0) > 0 || hasValidPackage;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If subscription is not required, show content
  if (!requireSubscription) {
    return <>{children}</>;
  }

  // If user has access, show content
  if (hasAccess) {
    return <>{children}</>;
  }

  // Show fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default locked state
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-2 border-primary/20">
        <CardHeader className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full gradient-primary flex items-center justify-center">
            <Crown className="w-10 h-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl">
            <span className="text-primary">محتوى حصري</span> للمشتركين
          </CardTitle>
          <CardDescription className="text-lg">
            للوصول إلى هذا المحتوى، تحتاج إلى اشتراك نشط أو أيام تجريبية متبقية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              ماذا تحصل عند الاشتراك؟
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <span>وصول غير محدود لجميع التمارين والاختبارات</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <span>مساعد ذكي AI متاح 24/7</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <span>تحليل مفصل للأداء ونقاط القوة والضعف</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <span>محتوى يومي منظم لمدة 30 يوم</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <span>شهادة إتمام معتمدة</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              size="lg" 
              className="flex-1 gradient-primary text-primary-foreground"
              onClick={() => navigate("/subscription")}
            >
              <Crown className="ml-2 w-5 h-5" />
              عرض باقات الاشتراك
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate("/dashboard")}
            >
              العودة للوحة التحكم
            </Button>
          </div>

          {profile && (profile.trial_days ?? 0) === 0 && (
            <p className="text-sm text-center text-muted-foreground">
              💡 انتهت فترتك التجريبية. اشترك الآن للاستمرار في التعلم!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
