import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Crown, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const Subscription = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Stripe price IDs من المنتجات التي أنشأناها
  const plans = [
    {
      name: "شهري",
      price: "99",
      period: "شهر",
      priceId: "price_1SGHtMAAmQE640SA9VrhcguK",
      icon: Zap,
      color: "primary",
      features: [
        "وصول كامل لجميع الدروس",
        "اختبارات يومية غير محدودة",
        "المعلم الذكي AI",
        "تقارير تفصيلية للأداء",
        "دعم فني على مدار الساعة",
      ],
    },
    {
      name: "ربع سنوي",
      price: "249",
      period: "3 أشهر",
      priceId: "price_1SGHtnAAmQE640SAvc5QmGhN",
      icon: Sparkles,
      color: "secondary",
      discount: "17%",
      popular: true,
      features: [
        "كل ميزات الخطة الشهرية",
        "خصم 17% على السعر",
        "محتوى حصري إضافي",
        "أولوية في الدعم الفني",
        "تحديثات مجانية",
      ],
    },
    {
      name: "سنوي",
      price: "799",
      period: "سنة",
      priceId: "price_1SGHu3AAmQE640SAibqtBMKd",
      icon: Crown,
      color: "accent",
      discount: "33%",
      features: [
        "كل ميزات الخطة الربع سنوية",
        "خصم 33% على السعر",
        "جلسات استشارية مباشرة",
        "وصول مبكر للميزات الجديدة",
        "ضمان استرداد الأموال 30 يوم",
      ],
    },
  ];

  const handleSubscribe = async (priceId: string, planName: string) => {
    try {
      setLoadingPlan(planName);

      // التحقق من تسجيل الدخول
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "يجب تسجيل الدخول",
          description: "الرجاء تسجيل الدخول للاشتراك",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // إنشاء جلسة الدفع
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });

      if (error) throw error;

      if (data?.url) {
        // فتح صفحة الدفع في نافذة جديدة
        window.open(data.url, "_blank");
        
        toast({
          title: "جاري التوجيه",
          description: "تم فتح صفحة الدفع في نافذة جديدة",
        });
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إنشاء جلسة الدفع",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              اختر <span className="text-primary">خطتك المناسبة</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              استثمر في مستقبلك الأكاديمي واحصل على وصول كامل لجميع الميزات
            </p>
          </div>

          {/* Plans */}
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`relative border-2 transition-all hover:shadow-xl ${
                  plan.popular
                    ? "border-primary shadow-lg scale-105"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      الأكثر شعبية 🔥
                    </Badge>
                  </div>
                )}
                
                {plan.discount && !plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge variant="secondary" className="px-4 py-1">
                      وفر {plan.discount}
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-8">
                  <div className="flex justify-center mb-4">
                    <div className={`p-4 rounded-full bg-${plan.color}/10`}>
                      <plan.icon className={`w-8 h-8 text-${plan.color}`} />
                    </div>
                  </div>
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <CardDescription>
                    <div className="text-4xl font-bold text-foreground mb-1">
                      {plan.price} <span className="text-lg text-muted-foreground">ر.س</span>
                    </div>
                    <div className="text-sm">{plan.period}</div>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    size="lg"
                    disabled={loadingPlan === plan.name}
                    onClick={() => handleSubscribe(plan.priceId, plan.name)}
                  >
                    {loadingPlan === plan.name ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        جاري التحميل...
                      </>
                    ) : (
                      "اشترك الآن"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
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
