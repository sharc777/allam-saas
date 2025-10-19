import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Home, RefreshCw } from "lucide-react";

interface ErrorFallbackProps {
  error?: Error;
  onReset: () => void;
}

export const ErrorFallback = ({ error, onReset }: ErrorFallbackProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-2 border-destructive/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl">حدث خطأ غير متوقع</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4" dir="rtl">
          <p className="text-muted-foreground">
            نعتذر، حدث خطأ أثناء تحميل هذه الصفحة. يمكنك المحاولة مرة أخرى أو العودة للصفحة الرئيسية.
          </p>
          
          {error && (
            <details className="p-4 bg-muted rounded-lg">
              <summary className="cursor-pointer font-semibold text-sm mb-2">
                تفاصيل الخطأ (للمطورين)
              </summary>
              <pre className="text-xs overflow-auto text-destructive">
                {error.message}
              </pre>
            </details>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={onReset}
              className="flex-1"
              variant="default"
            >
              <Home className="w-4 h-4 ml-2" />
              العودة للرئيسية
            </Button>
            <Button
              onClick={() => window.location.reload()}
              className="flex-1"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 ml-2" />
              إعادة التحميل
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
