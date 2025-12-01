import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { signUpSchema, loginSchema } from "@/lib/validation";
import { useRateLimit } from "@/hooks/useRateLimit";
import { emailTemplates } from "@/lib/emailTemplates";

// Auth component with security features
const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const navigate = useNavigate();
  
  const { checkLimit: checkLoginLimit } = useRateLimit({
    maxRequests: 5,
    windowMs: 300000, // 5 attempts per 5 minutes
    message: "تم تجاوز عدد محاولات تسجيل الدخول. يرجى الانتظار 5 دقائق."
  });

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === "SIGNED_IN") {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    if (!checkLoginLimit()) {
      return;
    }
    
    // Validate inputs
    if (!isLogin) {
      const result = signUpSchema.safeParse({ email, password, fullName });
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        toast.error(
          errors.email?.[0] || 
          errors.password?.[0] || 
          errors.fullName?.[0] || 
          "بيانات غير صالحة"
        );
        return;
      }
    } else {
      const result = loginSchema.safeParse({ email, password });
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        toast.error(errors.email?.[0] || errors.password?.[0] || "بيانات غير صالحة");
        return;
      }
    }
    
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        toast.success("تم تسجيل الدخول بنجاح");
      } else {
        // Validation for sign up
        if (!fullName.trim()) {
          toast.error("الرجاء إدخال الاسم الكامل");
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;
        
        // إرسال إيميل الترحيب
        try {
          await supabase.functions.invoke('send-email-notification', {
            body: {
              to: email,
              subject: 'مرحباً بك في دربني! 🎓',
              html: emailTemplates.welcomeEmail(fullName),
              notificationType: 'welcome'
            }
          });
        } catch (emailError) {
          console.error('خطأ في إرسال إيميل الترحيب:', emailError);
          // لا نعرض خطأ للمستخدم لأن التسجيل نجح
        }
        
        toast.success("تم إنشاء الحساب بنجاح");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      if (error.message?.includes("Invalid login credentials")) {
        toast.error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      } else if (error.message?.includes("User already registered")) {
        toast.error("هذا البريد الإلكتروني مسجل مسبقاً");
      } else {
        toast.error(error.message || "حدث خطأ، حاول مرة أخرى");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("الرجاء إدخال البريد الإلكتروني");
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      if (error) throw error;
      
      setResetEmailSent(true);
      toast.success("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. الرابط صالح لمدة ساعة واحدة فقط.");
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error("حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            {forgotPassword ? "نسيت كلمة المرور" : isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}
          </CardTitle>
          <CardDescription className="text-center">
            {forgotPassword
              ? "أدخل بريدك الإلكتروني لإرسال رابط إعادة تعيين كلمة المرور"
              : isLogin
              ? "أدخل بياناتك للوصول إلى حسابك"
              : "أدخل بياناتك لإنشاء حساب جديد"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {forgotPassword ? (
            resetEmailSent ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-center space-y-2">
                  <p className="text-sm text-primary font-medium">
                    تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الرجاء التحقق من صندوق الوارد أو البريد المزعج. الرابط صالح لمدة ساعة واحدة فقط ويمكن استخدامه مرة واحدة فقط.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setForgotPassword(false);
                    setResetEmailSent(false);
                    setEmail("");
                  }}
                >
                  العودة لتسجيل الدخول
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    "إرسال رابط إعادة التعيين"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setForgotPassword(false)}
                  disabled={loading}
                >
                  العودة لتسجيل الدخول
                </Button>
              </form>
            )
          ) : (
            <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">الاسم الكامل</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="أدخل اسمك الكامل"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    disabled={loading}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري التحميل...
                  </>
                ) : isLogin ? (
                  "تسجيل الدخول"
                ) : (
                  "إنشاء حساب"
                )}
              </Button>
            </form>
          )}

          {!forgotPassword && (
            <>
              {isLogin && (
                <div className="mt-4 text-center text-sm">
                  <button
                    type="button"
                    onClick={() => setForgotPassword(true)}
                    className="text-primary hover:underline"
                    disabled={loading}
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
              )}
              
              <div className="mt-4 text-center text-sm">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary hover:underline"
                  disabled={loading}
                >
                  {isLogin ? "ليس لديك حساب؟ إنشاء حساب جديد" : "لديك حساب؟ تسجيل الدخول"}
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
