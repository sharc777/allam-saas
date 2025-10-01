import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const AISettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["ai-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_settings")
        .select("*");

      if (error) throw error;
      
      const settingsMap: Record<string, any> = {};
      data.forEach(setting => {
        settingsMap[setting.setting_key] = setting.setting_value;
      });
      
      return settingsMap;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from("ai_settings")
        .update({ setting_value: value })
        .eq("setting_key", key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      toast({ title: "تم حفظ الإعدادات بنجاح" });
    },
    onError: (error) => {
      console.error("Error updating settings:", error);
      toast({
        title: "خطأ في حفظ الإعدادات",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const [systemPrompt, setSystemPrompt] = useState("");
  const [quizLimits, setQuizLimits] = useState({
    min_questions: 5,
    max_questions: 20,
    default_questions: 10,
  });
  const [temperature, setTemperature] = useState(0.8);

  // تحميل القيم عند جلب البيانات
  useState(() => {
    if (settings) {
      if (settings.system_prompt?.ar) {
        setSystemPrompt(settings.system_prompt.ar);
      }
      if (settings.quiz_limits) {
        setQuizLimits(settings.quiz_limits);
      }
      if (settings.quiz_generation_temperature?.temperature) {
        setTemperature(settings.quiz_generation_temperature.temperature);
      }
    }
  });

  const handleSaveSystemPrompt = () => {
    updateMutation.mutate({
      key: "system_prompt",
      value: { ar: systemPrompt },
    });
  };

  const handleSaveQuizLimits = () => {
    updateMutation.mutate({
      key: "quiz_limits",
      value: quizLimits,
    });
  };

  const handleSaveTemperature = () => {
    updateMutation.mutate({
      key: "quiz_generation_temperature",
      value: { temperature, enable_diversity: true },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold">إعدادات الذكاء الاصطناعي</h2>

      <Tabs defaultValue="prompt" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="prompt">System Prompt</TabsTrigger>
          <TabsTrigger value="quiz">حدود الأسئلة</TabsTrigger>
          <TabsTrigger value="generation">التنويع</TabsTrigger>
        </TabsList>

        <TabsContent value="prompt">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="system-prompt">System Prompt المخصص</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  هذا النص سيتم استخدامه كتعليمات أساسية للذكاء الاصطناعي في جميع المحادثات
                </p>
                <Textarea
                  id="system-prompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={10}
                  placeholder="أنت معلم خبير..."
                  className="font-arabic"
                />
              </div>
              <Button onClick={handleSaveSystemPrompt} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                <Save className="h-4 w-4 ml-2" />
                حفظ System Prompt
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="quiz">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="min-questions">الحد الأدنى للأسئلة</Label>
                <Input
                  id="min-questions"
                  type="number"
                  min="1"
                  max="50"
                  value={quizLimits.min_questions}
                  onChange={(e) => setQuizLimits({ ...quizLimits, min_questions: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="max-questions">الحد الأقصى للأسئلة</Label>
                <Input
                  id="max-questions"
                  type="number"
                  min="1"
                  max="50"
                  value={quizLimits.max_questions}
                  onChange={(e) => setQuizLimits({ ...quizLimits, max_questions: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="default-questions">العدد الافتراضي للأسئلة</Label>
                <Input
                  id="default-questions"
                  type="number"
                  min="1"
                  max="50"
                  value={quizLimits.default_questions}
                  onChange={(e) => setQuizLimits({ ...quizLimits, default_questions: parseInt(e.target.value) })}
                />
              </div>

              <Button onClick={handleSaveQuizLimits} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                <Save className="h-4 w-4 ml-2" />
                حفظ الحدود
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="generation">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="temperature">
                  Temperature (التنويع في الأسئلة)
                </Label>
                <p className="text-sm text-muted-foreground mb-2">
                  قيمة أعلى = تنويع أكثر (0.0 - 1.0)
                </p>
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                />
                <div className="mt-2 text-sm text-muted-foreground">
                  القيمة الحالية: {temperature}
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">نصائح:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>0.0 - 0.3: أسئلة متسقة ومتوقعة</li>
                  <li>0.4 - 0.7: توازن جيد بين التنويع والجودة</li>
                  <li>0.8 - 1.0: تنويع عالي وإبداع أكثر</li>
                </ul>
              </div>

              <Button onClick={handleSaveTemperature} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                <Save className="h-4 w-4 ml-2" />
                حفظ الإعدادات
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
