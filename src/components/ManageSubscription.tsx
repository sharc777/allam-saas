import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Loader2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";

export const ManageSubscription = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { subscribed, subscriptionEnd, refetch } = useSubscription();

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke("customer-portal");
      
      if (error) {
        throw error;
      }

      if (data?.url) {
        window.open(data.url, "_blank");
        
        toast({
          title: "✅ تم فتح لوحة إدارة الاشتراك",
          description: "يمكنك إدارة اشتراكك من هناك",
        });

        // Refresh subscription status after a delay
        setTimeout(() => {
          refetch();
        }, 3000);
      }
    } catch (error: any) {
      console.error("Error opening customer portal:", error);
      toast({
        title: "❌ خطأ",
        description: error.message || "فشل فتح لوحة إدارة الاشتراك",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!subscribed) {
    return null;
  }

  return (
    <Card className="border-success/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          إدارة اشتراكك
        </CardTitle>
        <CardDescription>
          {subscriptionEnd && (
            <span>
              الاشتراك نشط حتى:{" "}
              {new Date(subscriptionEnd).toLocaleDateString("ar-SA", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleManageSubscription}
          disabled={loading}
          variant="outline"
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              جاري التحميل...
            </>
          ) : (
            <>
              <ExternalLink className="w-4 h-4 ml-2" />
              إدارة الاشتراك والفواتير
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-3">
          يمكنك إلغاء أو تحديث اشتراكك في أي وقت
        </p>
      </CardContent>
    </Card>
  );
};
