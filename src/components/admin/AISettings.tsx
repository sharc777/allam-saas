import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

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
      // Check if setting exists
      const { data: existing } = await supabase
        .from("ai_settings")
        .select("id")
        .eq("setting_key", key)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("ai_settings")
          .update({ setting_value: value })
          .eq("setting_key", key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ai_settings")
          .insert({ setting_key: key, setting_value: value });
        if (error) throw error;
      }
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
    max_questions: 50,
    default_questions: 10,
    min_ratio: 0.6,
  });
  const [temperature, setTemperature] = useState(0.7);
  const [quizModel, setQuizModel] = useState("google/gemini-2.5-flash");
  const [kbLimits, setKbLimits] = useState({
    practice_fetch_limit: 20,
    lesson_fetch_limit: 5,
  });
  const [sectionsConfig, setSectionsConfig] = useState<any>({
    "قدرات": {
      "كمي": {
        default_count: 10,
        strict_section_filter: true,
        subjects: ["الحساب","الجبر","الهندسة","الإحصاء والاحتمالات","مسائل منطقية"],
        prompt_override: ""
      },
      "لفظي": {
        default_count: 10,
        strict_section_filter: true,
        subjects: ["استيعاب المقروء","إكمال الجمل","التناظر اللفظي","الخطأ السياقي","الارتباط والاختلاف"],
        prompt_override: ""
      }
    }
  });

  // Load values when settings are fetched
  useEffect(() => {
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
      if (settings.quiz_model?.model) {
        setQuizModel(settings.quiz_model.model);
      }
      if (settings.kb_limits) {
        setKbLimits(settings.kb_limits);
      }
      if (settings.quiz_sections_config) {
        setSectionsConfig(settings.quiz_sections_config);
      }
    }
  }, [settings]);

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

  const handleSaveModel = () => {
    updateMutation.mutate({
      key: "quiz_model",
      value: { model: quizModel },
    });
  };

  const handleSaveKbLimits = () => {
    updateMutation.mutate({
      key: "kb_limits",
      value: kbLimits,
    });
  };

  const handleSaveSectionsConfig = () => {
    updateMutation.mutate({
      key: "quiz_sections_config",
      value: sectionsConfig,
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
      <div>
        <h2 className="text-2xl font-bold">إعدادات الذكاء الاصطناعي</h2>
        <p className="text-sm text-muted-foreground mt-1">
          جميع التغييرات تُطبق مباشرة على مولّد الأسئلة دون الحاجة لنشر الكود
        </p>
      </div>

      <Tabs defaultValue="prompt" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="prompt">System Prompt</TabsTrigger>
          <TabsTrigger value="sections">أقسام الاختبار</TabsTrigger>
          <TabsTrigger value="model">النموذج</TabsTrigger>
          <TabsTrigger value="limits">القيود</TabsTrigger>
          <TabsTrigger value="knowledge">قاعدة المعرفة</TabsTrigger>
        </TabsList>

        <TabsContent value="prompt">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="system-prompt">System Prompt المخصص</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  هذا النص سيتم إضافته في بداية جميع طلبات توليد الأسئلة
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

        <TabsContent value="sections">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">قسم القدرات - كمي</h3>
                <div className="space-y-4">
                  <div>
                    <Label>عدد الأسئلة الافتراضي</Label>
                    <Input
                      type="number"
                      value={sectionsConfig["قدرات"]?.["كمي"]?.default_count || 10}
                      onChange={(e) => setSectionsConfig({
                        ...sectionsConfig,
                        "قدرات": {
                          ...sectionsConfig["قدرات"],
                          "كمي": {
                            ...sectionsConfig["قدرات"]["كمي"],
                            default_count: parseInt(e.target.value)
                          }
                        }
                      })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={sectionsConfig["قدرات"]?.["كمي"]?.strict_section_filter || false}
                      onCheckedChange={(checked) => setSectionsConfig({
                        ...sectionsConfig,
                        "قدرات": {
                          ...sectionsConfig["قدرات"],
                          "كمي": {
                            ...sectionsConfig["قدرات"]["كمي"],
                            strict_section_filter: checked
                          }
                        }
                      })}
                    />
                    <Label>فلترة صارمة للقسم (رفض أي سؤال لفظي)</Label>
                  </div>
                  <div>
                    <Label>الموضوعات (مفصولة بفواصل)</Label>
                    <Input
                      value={sectionsConfig["قدرات"]?.["كمي"]?.subjects?.join("،") || ""}
                      onChange={(e) => setSectionsConfig({
                        ...sectionsConfig,
                        "قدرات": {
                          ...sectionsConfig["قدرات"],
                          "كمي": {
                            ...sectionsConfig["قدرات"]["كمي"],
                            subjects: e.target.value.split("،").map(s => s.trim())
                          }
                        }
                      })}
                    />
                  </div>
                  <div>
                    <Label>Prompt مخصص (اختياري)</Label>
                    <Textarea
                      value={sectionsConfig["قدرات"]?.["كمي"]?.prompt_override || ""}
                      onChange={(e) => setSectionsConfig({
                        ...sectionsConfig,
                        "قدرات": {
                          ...sectionsConfig["قدرات"],
                          "كمي": {
                            ...sectionsConfig["قدرات"]["كمي"],
                            prompt_override: e.target.value
                          }
                        }
                      })}
                      rows={3}
                      placeholder="إن كان فارغاً، سيُستخدم البرومبت الافتراضي"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">قسم القدرات - لفظي</h3>
                <div className="space-y-4">
                  <div>
                    <Label>عدد الأسئلة الافتراضي</Label>
                    <Input
                      type="number"
                      value={sectionsConfig["قدرات"]?.["لفظي"]?.default_count || 10}
                      onChange={(e) => setSectionsConfig({
                        ...sectionsConfig,
                        "قدرات": {
                          ...sectionsConfig["قدرات"],
                          "لفظي": {
                            ...sectionsConfig["قدرات"]["لفظي"],
                            default_count: parseInt(e.target.value)
                          }
                        }
                      })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={sectionsConfig["قدرات"]?.["لفظي"]?.strict_section_filter || false}
                      onCheckedChange={(checked) => setSectionsConfig({
                        ...sectionsConfig,
                        "قدرات": {
                          ...sectionsConfig["قدرات"],
                          "لفظي": {
                            ...sectionsConfig["قدرات"]["لفظي"],
                            strict_section_filter: checked
                          }
                        }
                      })}
                    />
                    <Label>فلترة صارمة للقسم (رفض أي سؤال كمي)</Label>
                  </div>
                  <div>
                    <Label>الموضوعات (مفصولة بفواصل)</Label>
                    <Input
                      value={sectionsConfig["قدرات"]?.["لفظي"]?.subjects?.join("،") || ""}
                      onChange={(e) => setSectionsConfig({
                        ...sectionsConfig,
                        "قدرات": {
                          ...sectionsConfig["قدرات"],
                          "لفظي": {
                            ...sectionsConfig["قدرات"]["لفظي"],
                            subjects: e.target.value.split("،").map(s => s.trim())
                          }
                        }
                      })}
                    />
                  </div>
                  <div>
                    <Label>Prompt مخصص (اختياري)</Label>
                    <Textarea
                      value={sectionsConfig["قدرات"]?.["لفظي"]?.prompt_override || ""}
                      onChange={(e) => setSectionsConfig({
                        ...sectionsConfig,
                        "قدرات": {
                          ...sectionsConfig["قدرات"],
                          "لفظي": {
                            ...sectionsConfig["قدرات"]["لفظي"],
                            prompt_override: e.target.value
                          }
                        }
                      })}
                      rows={3}
                      placeholder="إن كان فارغاً، سيُستخدم البرومبت الافتراضي"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveSectionsConfig} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                <Save className="h-4 w-4 ml-2" />
                حفظ إعدادات الأقسام
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="model">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="model-select">نموذج الذكاء الاصطناعي</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  اختر النموذج المستخدم في توليد الأسئلة
                </p>
                <Select value={quizModel} onValueChange={setQuizModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro (أقوى)</SelectItem>
                    <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (موازن)</SelectItem>
                    <SelectItem value="google/gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (أسرع)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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

              <div className="flex gap-2">
                <Button onClick={handleSaveModel} disabled={updateMutation.isPending} className="flex-1">
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                  <Save className="h-4 w-4 ml-2" />
                  حفظ النموذج
                </Button>
                <Button onClick={handleSaveTemperature} disabled={updateMutation.isPending} className="flex-1">
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                  <Save className="h-4 w-4 ml-2" />
                  حفظ Temperature
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="limits">
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

              <div>
                <Label htmlFor="min-ratio">نسبة القبول الدنيا (0.0 - 1.0)</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  الحد الأدنى من الأسئلة المقبولة كنسبة من المطلوب (مثلاً 0.6 = 60%)
                </p>
                <Input
                  id="min-ratio"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={quizLimits.min_ratio}
                  onChange={(e) => setQuizLimits({ ...quizLimits, min_ratio: parseFloat(e.target.value) })}
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

        <TabsContent value="knowledge">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="practice-limit">عدد المعارف للتمرين</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  عدد العناصر المجلوبة من قاعدة المعرفة عند التمرين
                </p>
                <Input
                  id="practice-limit"
                  type="number"
                  min="1"
                  max="100"
                  value={kbLimits.practice_fetch_limit}
                  onChange={(e) => setKbLimits({ ...kbLimits, practice_fetch_limit: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="lesson-limit">عدد المعارف للدروس</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  عدد العناصر المجلوبة من قاعدة المعرفة للدروس المحددة
                </p>
                <Input
                  id="lesson-limit"
                  type="number"
                  min="1"
                  max="50"
                  value={kbLimits.lesson_fetch_limit}
                  onChange={(e) => setKbLimits({ ...kbLimits, lesson_fetch_limit: parseInt(e.target.value) })}
                />
              </div>

              <Button onClick={handleSaveKbLimits} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                <Save className="h-4 w-4 ml-2" />
                حفظ حدود قاعدة المعرفة
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};