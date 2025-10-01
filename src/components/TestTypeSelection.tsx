import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, GraduationCap, Loader2 } from "lucide-react";

type TestType = "قدرات" | "تحصيلي";
type Track = "عام" | "علمي" | "نظري";

export const TestTypeSelection = () => {
  const [testType, setTestType] = useState<TestType>("قدرات");
  const [track, setTrack] = useState<Track>("عام");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const pendingSelection = localStorage.getItem("pending_test_selection");
    if (pendingSelection) {
      try {
        const { testType: savedTestType, track: savedTrack } = JSON.parse(pendingSelection);
        if (savedTestType) setTestType(savedTestType);
        if (savedTrack) setTrack(savedTrack);
        localStorage.removeItem("pending_test_selection");
      } catch (error) {
        console.error("Error loading pending selection:", error);
      }
    }
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        localStorage.setItem("pending_test_selection", JSON.stringify({ testType, track }));
        toast({
          title: "تسجيل الدخول مطلوب",
          description: "سجّل دخولك لحفظ تفضيلاتك",
        });
        navigate("/auth?redirect=/test-selection");
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          test_type_preference: testType,
          track_preference: track,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "تم الحفظ بنجاح",
        description: "تم حفظ تفضيلاتك",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: "خطأ",
        description: "تعذّر الحفظ، حاول مجدداً",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <GraduationCap className="w-16 h-16 mx-auto mb-4 text-primary" />
          <CardTitle className="text-3xl">اختر نوع الاختبار</CardTitle>
          <CardDescription className="text-lg">
            اختر نوع الاختبار الذي تريد التحضير له
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label className="text-lg font-semibold text-right block">نوع الاختبار</Label>
            <RadioGroup value={testType} onValueChange={(value) => setTestType(value as TestType)}>
              <div className="flex flex-row-reverse items-center gap-3 p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                <RadioGroupItem value="قدرات" id="qudurat" />
                <Label htmlFor="qudurat" className="flex-1 cursor-pointer">
                  <div className="flex flex-row-reverse items-center gap-3">
                    <BookOpen className="w-5 h-5" />
                    <div className="text-right">
                      <div className="font-semibold">اختبار القدرات</div>
                      <div className="text-sm text-muted-foreground">
                        يقيس القدرات التحليلية والاستنتاجية (كمي ولفظي)
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex flex-row-reverse items-center gap-3 p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                <RadioGroupItem value="تحصيلي" id="tahsili" />
                <Label htmlFor="tahsili" className="flex-1 cursor-pointer">
                  <div className="flex flex-row-reverse items-center gap-3">
                    <GraduationCap className="w-5 h-5" />
                    <div className="text-right">
                      <div className="font-semibold">الاختبار التحصيلي</div>
                      <div className="text-sm text-muted-foreground">
                        يقيس التحصيل الدراسي في المواد العلمية أو النظرية
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {testType === "تحصيلي" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <Label className="text-lg font-semibold text-right block">المسار</Label>
              <RadioGroup value={track} onValueChange={(value) => setTrack(value as Track)}>
                <div className="flex flex-row-reverse items-center gap-3 p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                  <RadioGroupItem value="علمي" id="scientific" />
                  <Label htmlFor="scientific" className="flex-1 cursor-pointer text-right">
                    <div className="font-semibold">المسار العلمي</div>
                    <div className="text-sm text-muted-foreground">
                      (فيزياء، كيمياء، أحياء، رياضيات)
                    </div>
                  </Label>
                </div>
                <div className="flex flex-row-reverse items-center gap-3 p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                  <RadioGroupItem value="نظري" id="literary" />
                  <Label htmlFor="literary" className="flex-1 cursor-pointer text-right">
                    <div className="font-semibold">المسار النظري</div>
                    <div className="text-sm text-muted-foreground">
                      (تاريخ، جغرافيا، فقه، نحو، أدب)
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <Button 
            onClick={handleSave} 
            disabled={loading} 
            className="w-full"
            size="lg"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <span>جاري الحفظ...</span>
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              "ابدأ التعلم"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};