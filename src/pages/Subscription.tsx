import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionPageSkeleton } from "@/components/LoadingSkeleton";
import { usePackages } from "@/hooks/usePackages";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Subscription = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const { subscribed, productId, isLoading: subscriptionLoading } = useSubscription();
  const { data: packages, isLoading: packagesLoading } = usePackages({ activeOnly: true });

  // Show success message if redirected from successful payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast({
        title: "🎉 تم الاشتراك بنجاح!",
        description: "مبروك! تم تفعيل اشتراكك ويمكنك الآن الوصول لجميع المحتوى",
        duration: 5000,
      });
      window.history.replaceState({}, '', '/subscription');
    }
  }, [toast]);

  const handleSubscribe = async (packageId: string, packageName: string, billingPeriod: "monthly" | "yearly") => {
    try {
      setLoadingPlan(packageName);

      // التحقق من تسجيل الدخول
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "⚠️ يجب تسجيل الدخول أولاً",
          description: "للاشتراك في الخطة، يرجى تسجيل الدخول إلى حسابك",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // إنشاء جلسة الدفع - الـ Edge Function ستجلب Stripe ID من الجدول الخاص
      const { data, error } = await supabase.functions.invoke("create-package-checkout", {
        body: { 
          packageId,
          billingPeriod 
        },
      });

      if (error) {
        console.error("Checkout error:", error);
        throw new Error(error.message || "فشل إنشاء جلسة الدفع");
      }

      if (data?.url) {
        // التوجيه لصفحة الدفع في نفس النافذة
        window.location.href = data.url;
      } else {
        throw new Error("لم يتم إرجاع رابط الدفع");
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      const errorMessage = error instanceof Error ? error.message : "حدث خطأ غير متوقع";
      toast({
        title: "❌ فشل إنشاء جلسة الدفع",
        description: errorMessage.includes("STRIPE") 
          ? "مشكلة في الاتصال بنظام الدفع. يرجى المحاولة مرة أخرى."
          : errorMessage,
        variant: "destructive",
        duration: 6000,
      });
      setLoadingPlan(null);
    }
  };

  if (subscriptionLoading || packagesLoading) {
    return <SubscriptionPageSkeleton />;
  }

  if (!packages || packages.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5">
        <Navbar />
        <div className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                لا توجد باقات اشتراك متاحة حالياً. يرجى التواصل مع الإدارة.
              </AlertDescription>
            </Alert>
            <div className="text-center mt-8">
              <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                العودة للوحة التحكم
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const featuredPackage = packages.find(pkg => pkg.is_featured);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              اختر <span className="text-primary">خطتك المناسبة</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              استثمر في مستقبلك الأكاديمي واحصل على وصول كامل لجميع الميزات
            </p>
          </div>

          {/* Billing Toggle */}
          {packages.some(pkg => pkg.price_yearly && pkg.price_yearly > 0) && (
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-4 p-1 bg-muted rounded-lg">
                <Button
                  variant={billingPeriod === "monthly" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setBillingPeriod("monthly")}
                  className="transition-all"
                >
                  شهري
                </Button>
                <Button
                  variant={billingPeriod === "yearly" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setBillingPeriod("yearly")}
                  className="transition-all"
                >
                  سنوي
                  {packages.some(pkg => {
                    const monthly = Number(pkg.price_monthly) || 0;
                    const yearly = Number(pkg.price_yearly) || 0;
                    return yearly > 0 && monthly > 0 && yearly < monthly * 12;
                  }) && (
                    <Badge className="mr-2 bg-success text-success-foreground">وفر حتى 33%</Badge>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Plans */}
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {packages.map((pkg) => {
              const price = billingPeriod === "monthly" 
                ? Number(pkg.price_monthly) || 0
                : Number(pkg.price_yearly) || 0;

              const isFree = price === 0;
              const isPopular = pkg.is_featured;
              const isCurrentPlan = subscribed && productId === pkg.id;

              // Calculate savings for yearly
              const monthlyCost = Number(pkg.price_monthly) || 0;
              const yearlyCost = Number(pkg.price_yearly) || 0;
              const savingsPercent = monthlyCost > 0 && yearlyCost > 0
                ? Math.round((1 - (yearlyCost / (monthlyCost * 12))) * 100)
                : 0;

              return (
                <Card
                  key={pkg.id}
                  className={`relative border-2 transition-all hover:shadow-xl ${
                    isPopular
                      ? "border-primary shadow-lg scale-105"
                      : isCurrentPlan
                      ? "border-success"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-4 py-1">
                        الأكثر شعبية 🔥
                      </Badge>
                    </div>
                  )}
                  
                  {isCurrentPlan && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-success text-success-foreground px-4 py-1">
                        باقتك الحالية ✓
                      </Badge>
                    </div>
                  )}

                  {!isPopular && !isCurrentPlan && billingPeriod === "yearly" && savingsPercent > 0 && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge variant="secondary" className="px-4 py-1">
                        وفر {savingsPercent}%
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-8">
                    <CardTitle className="text-2xl mb-2">{pkg.name_ar}</CardTitle>
                    {pkg.description_ar && (
                      <p className="text-sm text-muted-foreground mb-4">{pkg.description_ar}</p>
                    )}
                    <CardDescription>
                      <div className="text-4xl font-bold text-foreground mb-1">
                        {isFree ? (
                          "مجاني"
                        ) : (
                          <>
                            {price} <span className="text-lg text-muted-foreground">ر.س</span>
                          </>
                        )}
                      </div>
                      <div className="text-sm">
                        {billingPeriod === "monthly" ? "شهرياً" : "سنوياً"}
                      </div>
                      {pkg.trial_days && pkg.trial_days > 0 && !isFree && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs">
                            🎁 {pkg.trial_days} أيام تجريبية
                          </Badge>
                        </div>
                      )}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {pkg.features && Array.isArray(pkg.features) && pkg.features.length > 0 && (
                      <ul className="space-y-3 mb-6">
                        {(pkg.features as string[]).map((feature, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <Button
                      className="w-full"
                      variant={isPopular ? "default" : "outline"}
                      size="lg"
                      disabled={loadingPlan === pkg.name_ar || isCurrentPlan || isFree}
                      onClick={() => handleSubscribe(pkg.id, pkg.name_ar, billingPeriod)}
                    >
                      {loadingPlan === pkg.name_ar ? (
                        <>
                          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                          جاري التحميل...
                        </>
                      ) : isCurrentPlan ? (
                        "باقتك الحالية"
                      ) : isFree ? (
                        "ابدأ مجاناً"
                      ) : (
                        "اشترك الآن"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Info Section */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-primary mb-2">30 يوم</div>
                  <p className="text-sm text-muted-foreground">ضمان استرداد الأموال</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary mb-2">24/7</div>
                  <p className="text-sm text-muted-foreground">دعم فني متواصل</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary mb-2">+1000</div>
                  <p className="text-sm text-muted-foreground">طالب ناجح</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Back Button */}
          <div className="text-center mt-8">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              العودة للوحة التحكم
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
