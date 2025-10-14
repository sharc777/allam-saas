import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface TestTypeDialogProps {
  open: boolean;
  onComplete: () => void;
  userId: string;
}

export const TestTypeDialog = ({ open, onComplete, userId }: TestTypeDialogProps) => {
  const [testType, setTestType] = useState<"قدرات" | "تحصيلي">("قدرات");
  const [track, setTrack] = useState<"علمي" | "نظري" | "عام">("عام");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          test_type_preference: testType,
          track_preference: track,
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("تم حفظ تفضيلاتك بنجاح");
      onComplete();
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("حدث خطأ في حفظ التفضيلات");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">اختر نوع الاختبار</DialogTitle>
          <DialogDescription className="text-center">
            لتخصيص تجربتك التعليمية، الرجاء اختيار نوع الاختبار
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

          <Button
            onClick={handleSave}
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              "حفظ والمتابعة"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
