import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [testType, setTestType] = useState<"قدرات" | "تحصيلي">("قدرات");
  const [track, setTrack] = useState<"علمي" | "نظري" | "عام">("عام");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        // Check subscription status and decrement trial days after login
        await supabase.functions.invoke("check-subscription");
        await supabase.functions.invoke("decrement-trial-days");
        
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
              test_type_preference: testType,
              track_preference: track,
            },
          },
        });

        if (error) throw error;
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            {isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin
              ? "أدخل بياناتك للوصول إلى حسابك"
              : "أدخل بياناتك لإنشاء حساب جديد"}
          </CardDescription>
        </CardHeader>
        <CardContent>
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

                <div className="space-y-2">
                  <Label>نوع الاختبار</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTestType("قدرات")}
                      disabled={loading}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        testType === "قدرات"
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      قدرات
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTestType("تحصيلي");
                        setTrack("علمي");
                      }}
                      disabled={loading}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        testType === "تحصيلي"
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      تحصيلي
                    </button>
                  </div>
                </div>

                {testType === "تحصيلي" && (
                  <div className="space-y-2">
                    <Label>المسار</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setTrack("علمي")}
                        disabled={loading}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          track === "علمي"
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        علمي
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrack("نظري")}
                        disabled={loading}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          track === "نظري"
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        نظري
                      </button>
                    </div>
                  </div>
                )}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
