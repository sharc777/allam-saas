import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Brain, GraduationCap, Trophy, TrendingUp, Sparkles, BookOpen, AlertTriangle } from "lucide-react";
import { GoogleAd } from "@/components/GoogleAd";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
const Index = () => {
  const navigate = useNavigate();
  const {
    user,
    loading
  } = useAuth(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Handle password reset errors from URL hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('error=')) {
      const errorMatch = hash.match(/error=([^&]+)/);
      const errorDescMatch = hash.match(/error_description=([^&]+)/);
      
      if (errorMatch) {
        const errorCode = errorMatch[1];
        const errorDesc = errorDescMatch ? decodeURIComponent(errorDescMatch[1].replace(/\+/g, ' ')) : '';
        
        if (errorCode === 'otp_expired' || errorDesc.includes('expired')) {
          setResetError('expired');
        } else if (errorCode === 'access_denied') {
          setResetError('invalid');
        } else {
          setResetError('general');
        }
        
        // Clear hash from URL
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Password Reset Error Dialog */}
      <AlertDialog open={!!resetError} onOpenChange={() => setResetError(null)}>
        <AlertDialogContent className="max-w-md" dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl">
                {resetError === 'expired' ? 'انتهت صلاحية الرابط' : 
                 resetError === 'invalid' ? 'رابط غير صالح' : 
                 'حدث خطأ'}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base leading-relaxed text-right">
              {resetError === 'expired' ? (
                <>
                  <p className="mb-3">عذراً، انتهت صلاحية رابط إعادة تعيين كلمة المرور.</p>
                  <p className="text-muted-foreground">⏱️ الروابط صالحة لمدة ساعة واحدة فقط لحماية حسابك.</p>
                </>
              ) : resetError === 'invalid' ? (
                <p>الرابط المستخدم غير صالح أو تم استخدامه بالفعل.</p>
              ) : (
                <p>حدث خطأ أثناء التحقق من رابط إعادة تعيين كلمة المرور.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogAction asChild>
              <Button 
                onClick={() => {
                  setResetError(null);
                  navigate('/auth');
                }}
                className="w-full gradient-primary"
              >
                طلب رابط جديد
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-block">
              <span className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                ✨ استعد لاختبار القدرات
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-primary via-primary-glow to-secondary bg-clip-text text-transparent">
                دربني
              </span>
              <br />
              <span className="text-foreground">رحلتك نحو التميز</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              منصة تدريبية متكاملة تجمع بين المحتوى التعليمي المتقدم، الذكاء الاصطناعي، والاختبارات المخصصة لضمان تفوقك
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Link to="/dashboard">
                <Button size="lg" className="gradient-primary text-primary-foreground shadow-elegant hover:shadow-glow transition-smooth text-lg px-8 py-6">
                  <GraduationCap className="ml-2 w-5 h-5" />
                  ابدأ التدريب الآن
                </Button>
              </Link>
              <Button size="lg" variant="outline" onClick={() => navigate("/about")} className="border-2 text-lg px-8 py-6">
                <BookOpen className="ml-2 w-5 h-5" />
                اعرف المزيد
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-12 max-w-2xl mx-auto">
              <div className="space-y-2">
                <div className="text-4xl font-bold text-primary">30</div>
                <div className="text-sm text-muted-foreground">يوم تدريب</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold text-secondary">1000+</div>
                <div className="text-sm text-muted-foreground">سؤال وتمرين</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold text-success">95%</div>
                <div className="text-sm text-muted-foreground">نسبة النجاح</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ad Slot: Hero */}
      <GoogleAd slot="hero" format="horizontal" className="container mx-auto max-w-6xl my-8" />

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              لماذا <span className="text-primary">دربني</span>؟
            </h2>
            <p className="text-muted-foreground text-lg">
              منصة متكاملة مصممة خصيصاً لنجاحك
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Feature Cards */}
            <Card className="border-2 hover:border-primary/50 transition-smooth hover:shadow-elegant group">
              <CardContent className="p-6 space-y-4">
                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center group-hover:animate-glow">
                  <Brain className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold">مساعد ذكي AI</h3>
                <p className="text-muted-foreground leading-relaxed">
                  مساعد ذكاء اصطناعي متاح 24/7 للإجابة على جميع استفساراتك وشرح المفاهيم الصعبة بأسلوب مبسط
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-secondary/50 transition-smooth hover:shadow-elegant group">
              <CardContent className="p-6 space-y-4">
                <div className="w-14 h-14 rounded-2xl gradient-secondary flex items-center justify-center group-hover:animate-glow">
                  <GraduationCap className="w-7 h-7 text-secondary-foreground" />
                </div>
                <h3 className="text-xl font-bold">اختبارات مخصصة</h3>
                <p className="text-muted-foreground leading-relaxed">
                  الذكاء الاصطناعي يولد اختبارات مخصصة لك بناءً على مستواك وتقدمك لضمان أفضل النتائج
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-smooth hover:shadow-elegant group">
              <CardContent className="p-6 space-y-4">
                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center group-hover:animate-glow">
                  <BookOpen className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold">محتوى يومي</h3>
                <p className="text-muted-foreground leading-relaxed">
                  دروس وشروحات يومية منظمة بعناية لتغطية جميع جوانب اختبار القدرات
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-secondary/50 transition-smooth hover:shadow-elegant group">
              <CardContent className="p-6 space-y-4">
                <div className="w-14 h-14 rounded-2xl gradient-secondary flex items-center justify-center group-hover:animate-glow">
                  <TrendingUp className="w-7 h-7 text-secondary-foreground" />
                </div>
                <h3 className="text-xl font-bold">تتبع التقدم</h3>
                <p className="text-muted-foreground leading-relaxed">
                  لوحة تحكم شاملة لمراقبة تقدمك اليومي، نقاط قوتك، والمجالات التي تحتاج تحسين
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-smooth hover:shadow-elegant group">
              <CardContent className="p-6 space-y-4">
                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center group-hover:animate-glow">
                  <Trophy className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold">نظام التحفيز</h3>
                <p className="text-muted-foreground leading-relaxed">
                  احصل على شارات ومكافآت مع كل إنجاز لتبقى متحمساً طوال رحلة الـ30 يوم
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-secondary/50 transition-smooth hover:shadow-elegant group">
              <CardContent className="p-6 space-y-4">
                <div className="w-14 h-14 rounded-2xl gradient-secondary flex items-center justify-center group-hover:animate-glow">
                  <Sparkles className="w-7 h-7 text-secondary-foreground" />
                </div>
                <h3 className="text-xl font-bold">تعلم تكيفي</h3>
                <p className="text-muted-foreground leading-relaxed">
                  المنصة تتكيف مع مستواك وسرعة تعلمك لتوفير تجربة تعليمية مثالية لك
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Ad Slot: Between Sections */}
      <GoogleAd slot="between_sections" format="auto" className="container mx-auto max-w-6xl my-8" />

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">كيف يعمل؟</h2>
            <p className="text-muted-foreground text-lg">ثلاث خطوات بسيطة نحو التميز</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full gradient-primary mx-auto flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-elegant">
                1
              </div>
              <h3 className="text-xl font-bold">ابدأ التدريب</h3>
              <p className="text-muted-foreground">
                سجل في المنصة وابدأ رحلتك التعليمية. ستحصل على خطة دراسية مخصصة لك
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full gradient-secondary mx-auto flex items-center justify-center text-secondary-foreground text-2xl font-bold shadow-elegant">
                2
              </div>
              <h3 className="text-xl font-bold">تعلم وتدرب</h3>
              <p className="text-muted-foreground">
                كل يوم، استكشف محتوى جديد، تدرب مع المساعد الذكي، وحل الاختبارات المخصصة
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full gradient-primary mx-auto flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-elegant">
                3
              </div>
              <h3 className="text-xl font-bold">حقق هدفك</h3>
              <p className="text-muted-foreground">
                بعد 30 يوم، ستكون مستعداً تماماً لاجتياز اختباراتك بثقة وتميز
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 gradient-hero">
        <div className="container mx-auto max-w-4xl text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            هل أنت مستعد لبدء رحلة التميز؟
          </h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            انضم الآن إلى آلاف الطلاب الذين حققوا نتائج استثنائية مع دربني
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link to="/dashboard">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-xl text-lg px-8 py-6">
                <Trophy className="ml-2 w-5 h-5" />
                ابدأ التدريب الآن
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Ad Slot: Footer */}
      <GoogleAd slot="footer" format="horizontal" className="container mx-auto max-w-6xl my-8" />

      {/* Footer */}
      <footer className="py-12 px-4 bg-card border-t border-border">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">دربني</span>
          </div>
          <p className="text-muted-foreground mb-4">
            منصة متكاملة للاستعداد لاختبار القدرات
          </p>
          <p className="text-sm text-muted-foreground">© 2025 جميع الحقوق محفوظة لمنصة تحسين
www.T7seen.com</p>
        </div>
      </footer>
    </div>;
};
export default Index;