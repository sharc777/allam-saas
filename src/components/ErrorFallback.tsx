import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Home, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ErrorFallbackProps {
  error?: Error;
  onReset: () => void;
}

export const ErrorFallback = ({ error, onReset }: ErrorFallbackProps) => {
  const getErrorMessage = (error?: Error): string => {
    if (!error) return "حدث خطأ غير متوقع";
    
    const message = error.message.toLowerCase();
    
    // Translate common errors to Arabic
    if (message.includes("not authenticated") || message.includes("unauthorized")) {
      return "جلسة العمل منتهية. يرجى تسجيل الدخول مرة أخرى.";
    }
    if (message.includes("network") || message.includes("fetch")) {
      return "مشكلة في الاتصال بالإنترنت. تحقق من اتصالك وحاول مرة أخرى.";
    }
    if (message.includes("timeout")) {
      return "انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.";
    }
    if (message.includes("failed to fetch") || message.includes("load failed")) {
      return "فشل تحميل البيانات. تحقق من اتصالك بالإنترنت.";
    }
    
    return error.message;
  };

  const errorMessage = getErrorMessage(error);
  const isDevelopment = import.meta.env.DEV;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-2 border-destructive/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl">حدث خطأ</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6" dir="rtl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-base">
              {errorMessage}
            </AlertDescription>
          </Alert>

          {isDevelopment && error && (
            <details className="bg-muted p-4 rounded-md text-sm">
              <summary className="cursor-pointer font-semibold mb-2">
                تفاصيل الخطأ التقنية (وضع التطوير)
              </summary>
              <pre className="text-xs overflow-auto text-muted-foreground whitespace-pre-wrap">
                {error.stack || error.message}
              </pre>
            </details>
          )}

          <div className="space-y-3">
            <h3 className="font-semibold">ماذا يمكنك فعله؟</h3>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
              <li>تحقق من اتصالك بالإنترنت</li>
              <li>أعد تحميل الصفحة</li>
              <li>امسح ذاكرة التخزين المؤقت للمتصفح</li>
              <li>إذا استمرت المشكلة، تواصل مع الدعم الفني</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={onReset} className="flex-1 gap-2">
              <Home className="h-4 w-4" />
              العودة للصفحة الرئيسية
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex-1 gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            رمز الخطأ: {Date.now().toString(36).toUpperCase()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
