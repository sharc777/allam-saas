import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const ADMIN_SESSION_KEY = "admin_original_session";
const IMPERSONATING_KEY = "impersonating_user";

interface ImpersonatedUser {
  id: string;
  email: string;
  full_name: string;
}

export const useImpersonation = () => {
  const navigate = useNavigate();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check on mount if we're currently impersonating
  useEffect(() => {
    const storedUser = localStorage.getItem(IMPERSONATING_KEY);
    const storedAdminSession = localStorage.getItem(ADMIN_SESSION_KEY);
    
    if (storedUser && storedAdminSession) {
      setIsImpersonating(true);
      setImpersonatedUser(JSON.parse(storedUser));
    }
  }, []);

  const impersonateUser = useCallback(async (targetUserId: string) => {
    setIsLoading(true);
    
    try {
      // Get current session (admin's session)
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      
      if (!adminSession) {
        toast({
          title: "خطأ",
          description: "يجب تسجيل الدخول أولاً",
          variant: "destructive",
        });
        return false;
      }

      // Save admin session to localStorage
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      }));

      // Call the edge function to get impersonation token
      const { data, error } = await supabase.functions.invoke("impersonate-user", {
        body: { target_user_id: targetUserId },
      });

      if (error || !data?.success) {
        console.error("Impersonation error:", error || data?.error);
        localStorage.removeItem(ADMIN_SESSION_KEY);
        toast({
          title: "خطأ في الدخول كمستخدم",
          description: data?.error || error?.message || "حدث خطأ غير متوقع",
          variant: "destructive",
        });
        return false;
      }

      // Store impersonated user info
      const targetUser: ImpersonatedUser = data.target_user;
      localStorage.setItem(IMPERSONATING_KEY, JSON.stringify(targetUser));

      // Sign in as the target user using the hashed token
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.hashed_token,
        type: "magiclink",
      });

      if (verifyError) {
        console.error("OTP verification error:", verifyError);
        localStorage.removeItem(ADMIN_SESSION_KEY);
        localStorage.removeItem(IMPERSONATING_KEY);
        toast({
          title: "خطأ في التحقق",
          description: verifyError.message,
          variant: "destructive",
        });
        return false;
      }

      setIsImpersonating(true);
      setImpersonatedUser(targetUser);

      // إرسال إشارة مخصصة لإعلام المكونات الأخرى
      window.dispatchEvent(new CustomEvent('impersonation-changed'));

      toast({
        title: "تم الدخول كمستخدم",
        description: `أنت الآن تتصفح كـ ${targetUser.full_name}`,
      });

      // Navigate to dashboard
      navigate("/dashboard");
      return true;
    } catch (err: any) {
      console.error("Impersonation error:", err);
      localStorage.removeItem(ADMIN_SESSION_KEY);
      localStorage.removeItem(IMPERSONATING_KEY);
      toast({
        title: "خطأ",
        description: err.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const returnToAdmin = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const storedSession = localStorage.getItem(ADMIN_SESSION_KEY);
      
      if (!storedSession) {
        toast({
          title: "خطأ",
          description: "لا توجد جلسة أدمن محفوظة",
          variant: "destructive",
        });
        return false;
      }

      const adminSession = JSON.parse(storedSession);

      // Sign out from current (impersonated) session
      await supabase.auth.signOut();

      // Restore admin session
      const { error } = await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      });

      if (error) {
        console.error("Session restore error:", error);
        toast({
          title: "خطأ في استعادة الجلسة",
          description: "يرجى تسجيل الدخول مرة أخرى",
          variant: "destructive",
        });
        navigate("/auth");
        return false;
      }

      // Clear impersonation state
      localStorage.removeItem(ADMIN_SESSION_KEY);
      localStorage.removeItem(IMPERSONATING_KEY);
      setIsImpersonating(false);
      setImpersonatedUser(null);

      // إرسال إشارة لإخفاء الشريط
      window.dispatchEvent(new CustomEvent('impersonation-changed'));

      toast({
        title: "تم العودة",
        description: "أنت الآن في حسابك كأدمن",
      });

      // Navigate to admin page
      navigate("/admin");
      return true;
    } catch (err: any) {
      console.error("Return to admin error:", err);
      toast({
        title: "خطأ",
        description: err.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  return {
    isImpersonating,
    impersonatedUser,
    isLoading,
    impersonateUser,
    returnToAdmin,
  };
};
