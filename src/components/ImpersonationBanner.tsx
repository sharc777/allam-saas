import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, User, Loader2 } from "lucide-react";
import { useImpersonation } from "@/hooks/useImpersonation";

// دالة التحقق من localStorage
const checkLocalStorageForImpersonation = () => {
  const storedUser = localStorage.getItem("impersonating_user");
  const storedSession = localStorage.getItem("admin_original_session");
  return !!storedUser && !!storedSession;
};

export const ImpersonationBanner = () => {
  const { isImpersonating, impersonatedUser, isLoading, returnToAdmin } = useImpersonation();
  
  // التحقق الفوري عند التهيئة
  const [visible, setVisible] = useState(() => checkLocalStorageForImpersonation());

  useEffect(() => {
    const checkImpersonation = () => {
      const isImpersonatingNow = checkLocalStorageForImpersonation();
      setVisible(isImpersonatingNow);
    };

    // فحص فوري
    checkImpersonation();
    
    // فحص دوري كل ثانية للتأكد
    const interval = setInterval(checkImpersonation, 1000);

    // الاستماع لتغييرات localStorage
    window.addEventListener("storage", checkImpersonation);
    
    // الاستماع للـ custom event من useImpersonation
    window.addEventListener("impersonation-changed", checkImpersonation);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", checkImpersonation);
      window.removeEventListener("impersonation-changed", checkImpersonation);
    };
  }, []);

  if (!visible && !isImpersonating) return null;

  const userInfo = impersonatedUser || (() => {
    try {
      const stored = localStorage.getItem("impersonating_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  if (!userInfo) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 py-2 px-4 shadow-lg">
      <div className="container mx-auto flex items-center justify-between gap-4" dir="rtl">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5" />
          <span className="font-medium">
            أنت تتصفح كـ: <strong>{userInfo.full_name}</strong>
            <span className="text-amber-800 text-sm mr-2">({userInfo.email})</span>
          </span>
        </div>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={returnToAdmin}
          disabled={isLoading}
          className="bg-amber-100 hover:bg-amber-200 text-amber-950 gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          العودة لحساب الأدمن
        </Button>
      </div>
    </div>
  );
};
