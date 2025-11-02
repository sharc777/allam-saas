import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const verifySession = async () => {
      // Check hash parameters
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      const error = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');
      
      // Check for errors in URL
      if (error) {
        toast.error(errorDescription || "رابط غير صالح");
        setLinkExpired(true);
        return;
      }
      
      // Verify it's a recovery type link
      if (!accessToken || type !== 'recovery') {
        setLinkExpired(true);
        return;
      }
      
      // Verify session is valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setLinkExpired(true);
      }
    };
    
    verifySession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    if (!newPassword || !confirmPassword) {
      toast.error("الرجاء إدخال كلمة المرور الجديدة");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast.success("تم تحديث كلمة المرور بنجاح");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Password update error:", error);
      toast.error(error.message || "حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            إعادة تعيين كلمة المرور
          </CardTitle>
          <CardDescription className="text-center">
            {linkExpired ? "الرابط غير صالح أو منتهي الصلاحية" : "أدخل كلمة المرور الجديدة"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {linkExpired ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
                <p className="text-sm text-destructive">
                  هذا الرابط غير صالح أو منتهي الصلاحية. الرجاء طلب رابط جديد.
                </p>
              </div>
              <Button 
                onClick={() => navigate("/auth")} 
                className="w-full"
              >
                طلب رابط جديد
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري التحديث...
                </>
              ) : (
                "تحديث كلمة المرور"
              )}
            </Button>
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
