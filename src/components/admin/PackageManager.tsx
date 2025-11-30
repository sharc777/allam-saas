import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Trash2, Package, Star, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";

type SubscriptionPackage = Database["public"]["Tables"]["subscription_packages"]["Row"];

export const PackageManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SubscriptionPackage | null>(null);
  const [formData, setFormData] = useState({
    name_ar: "",
    name_en: "",
    description_ar: "",
    price_monthly: 0,
    price_yearly: 0,
    trial_days: 3,
    stripe_price_id_monthly: "",
    stripe_price_id_yearly: "",
    features: [] as string[],
    limits: {
      daily_exercises_quantitative: 10,
      daily_exercises_verbal: 10,
      daily_custom_tests: 5,
      daily_ai_conversations: 20,
      ai_tutoring_minutes: 60,
      accessible_days: 30,
      unlock_all_days: false,
      weakness_analysis: true,
      smart_recommendations: true,
      export_reports: false,
    },
    is_active: true,
    is_featured: false,
  });
  const [newFeature, setNewFeature] = useState("");

  const { data: packages, isLoading } = useQuery({
    queryKey: ["subscription-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_packages")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as SubscriptionPackage[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("subscription_packages").insert([{
        ...data,
        features: data.features,
        limits: data.limits,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-packages"] });
      toast({ title: "✅ تم إضافة الباقة بنجاح" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "❌ خطأ في إضافة الباقة",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const { error } = await supabase
        .from("subscription_packages")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-packages"] });
      toast({ title: "✅ تم تحديث الباقة بنجاح" });
      setIsDialogOpen(false);
      setEditingPackage(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("subscription_packages")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-packages"] });
      toast({ title: "✅ تم حذف الباقة بنجاح" });
    },
  });

  const resetForm = () => {
    setFormData({
      name_ar: "",
      name_en: "",
      description_ar: "",
      price_monthly: 0,
      price_yearly: 0,
      trial_days: 3,
      stripe_price_id_monthly: "",
      stripe_price_id_yearly: "",
      features: [],
      limits: {
        daily_exercises_quantitative: 10,
        daily_exercises_verbal: 10,
        daily_custom_tests: 5,
        daily_ai_conversations: 20,
        ai_tutoring_minutes: 60,
        accessible_days: 30,
        unlock_all_days: false,
        weakness_analysis: true,
        smart_recommendations: true,
        export_reports: false,
      },
      is_active: true,
      is_featured: false,
    });
    setNewFeature("");
  };

  const handleEdit = (pkg: SubscriptionPackage) => {
    setEditingPackage(pkg);
    const pkgLimits = (pkg.limits as any) || {};
    setFormData({
      name_ar: pkg.name_ar,
      name_en: pkg.name_en || "",
      description_ar: pkg.description_ar || "",
      price_monthly: Number(pkg.price_monthly) || 0,
      price_yearly: Number(pkg.price_yearly) || 0,
      trial_days: pkg.trial_days || 3,
      stripe_price_id_monthly: pkg.stripe_price_id_monthly || "",
      stripe_price_id_yearly: pkg.stripe_price_id_yearly || "",
      features: Array.isArray(pkg.features) ? pkg.features as string[] : [],
      limits: {
        daily_exercises_quantitative: pkgLimits.daily_exercises_quantitative || 10,
        daily_exercises_verbal: pkgLimits.daily_exercises_verbal || 10,
        daily_custom_tests: pkgLimits.daily_custom_tests || 5,
        daily_ai_conversations: pkgLimits.daily_ai_conversations || 20,
        ai_tutoring_minutes: pkgLimits.ai_tutoring_minutes || 60,
        accessible_days: pkgLimits.accessible_days || 30,
        unlock_all_days: pkgLimits.unlock_all_days || false,
        weakness_analysis: pkgLimits.weakness_analysis !== false,
        smart_recommendations: pkgLimits.smart_recommendations !== false,
        export_reports: pkgLimits.export_reports || false,
      },
      is_active: pkg.is_active,
      is_featured: pkg.is_featured || false,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPackage) {
      updateMutation.mutate({ id: editingPackage.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, newFeature.trim()],
      });
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
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
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold mb-2">💳 إدارة الباقات</h2>
          <p className="text-sm text-muted-foreground">
            إنشاء وتعديل باقات الاشتراك المتاحة للطلاب
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingPackage(null); resetForm(); }}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة باقة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingPackage ? "تعديل الباقة" : "إضافة باقة جديدة"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>الاسم بالعربية *</Label>
                  <Input
                    value={formData.name_ar}
                    onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>الاسم بالإنجليزية</Label>
                  <Input
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>الوصف</Label>
                <Textarea
                  value={formData.description_ar}
                  onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>السعر الشهري (ريال)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price_monthly}
                    onChange={(e) => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>السعر السنوي (ريال)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price_yearly}
                    onChange={(e) => setFormData({ ...formData, price_yearly: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>الأيام التجريبية</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.trial_days}
                    onChange={(e) => setFormData({ ...formData, trial_days: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Stripe Price ID (شهري)</Label>
                  <Input
                    value={formData.stripe_price_id_monthly}
                    onChange={(e) => setFormData({ ...formData, stripe_price_id_monthly: e.target.value })}
                    placeholder="price_xxxxx"
                    pattern="^price_.*"
                  />
                  <p className="text-xs text-muted-foreground mt-1">يجب أن يبدأ بـ price_</p>
                </div>
                <div>
                  <Label>Stripe Price ID (سنوي)</Label>
                  <Input
                    value={formData.stripe_price_id_yearly}
                    onChange={(e) => setFormData({ ...formData, stripe_price_id_yearly: e.target.value })}
                    placeholder="price_xxxxx"
                    pattern="^price_.*"
                  />
                  <p className="text-xs text-muted-foreground mt-1">يجب أن يبدأ بـ price_</p>
                </div>
              </div>

              <div>
                <Label>المميزات</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    placeholder="أضف ميزة..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                  />
                  <Button type="button" onClick={addFeature} variant="outline">
                    إضافة
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                      <span className="flex-1">{feature}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFeature(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* حدود الباقة */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold">📊 حدود الباقة</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>التمارين اليومية (كمي)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.limits.daily_exercises_quantitative}
                      onChange={(e) => setFormData({
                        ...formData,
                        limits: { ...formData.limits, daily_exercises_quantitative: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div>
                    <Label>التمارين اليومية (لفظي)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.limits.daily_exercises_verbal}
                      onChange={(e) => setFormData({
                        ...formData,
                        limits: { ...formData.limits, daily_exercises_verbal: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div>
                    <Label>الاختبارات المخصصة</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.limits.daily_custom_tests}
                      onChange={(e) => setFormData({
                        ...formData,
                        limits: { ...formData.limits, daily_custom_tests: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div>
                    <Label>محادثات AI</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.limits.daily_ai_conversations}
                      onChange={(e) => setFormData({
                        ...formData,
                        limits: { ...formData.limits, daily_ai_conversations: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div>
                    <Label>دقائق المعلم الذكي</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.limits.ai_tutoring_minutes}
                      onChange={(e) => setFormData({
                        ...formData,
                        limits: { ...formData.limits, ai_tutoring_minutes: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div>
                    <Label>عدد الأيام المتاحة</Label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={formData.limits.accessible_days}
                      onChange={(e) => setFormData({
                        ...formData,
                        limits: { ...formData.limits, accessible_days: parseInt(e.target.value) || 30 }
                      })}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.limits.unlock_all_days}
                      onChange={(e) => setFormData({
                        ...formData,
                        limits: { ...formData.limits, unlock_all_days: e.target.checked }
                      })}
                      className="rounded"
                    />
                    <span className="text-sm">🔓 فتح جميع الأيام مباشرة</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.limits.weakness_analysis}
                      onChange={(e) => setFormData({
                        ...formData,
                        limits: { ...formData.limits, weakness_analysis: e.target.checked }
                      })}
                      className="rounded"
                    />
                    <span className="text-sm">📊 تحليل نقاط الضعف</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.limits.smart_recommendations}
                      onChange={(e) => setFormData({
                        ...formData,
                        limits: { ...formData.limits, smart_recommendations: e.target.checked }
                      })}
                      className="rounded"
                    />
                    <span className="text-sm">🎯 التوصيات الذكية</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.limits.export_reports}
                      onChange={(e) => setFormData({
                        ...formData,
                        limits: { ...formData.limits, export_reports: e.target.checked }
                      })}
                      className="rounded"
                    />
                    <span className="text-sm">📥 تصدير التقارير</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded"
                  />
                  <span>باقة نشطة</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="rounded"
                  />
                  <span>باقة مميزة</span>
                </label>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  )}
                  {editingPackage ? "حفظ التعديلات" : "إضافة الباقة"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {packages?.map((pkg) => (
          <Card key={pkg.id} className={pkg.is_featured ? "border-2 border-primary" : ""}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {pkg.is_featured && (
                      <Crown className="h-5 w-5 text-yellow-500" />
                    )}
                    <h3 className="text-xl font-bold">{pkg.name_ar}</h3>
                    {pkg.is_featured && (
                      <Badge variant="default">مميزة</Badge>
                    )}
                    {!pkg.is_active && (
                      <Badge variant="secondary">غير نشطة</Badge>
                    )}
                  </div>
                  {pkg.description_ar && (
                    <p className="text-muted-foreground mb-3">{pkg.description_ar}</p>
                  )}
                  <div className="flex gap-4 mb-3 items-center">
                    <div>
                      <span className="text-2xl font-bold text-primary">
                        {pkg.price_monthly ? `${pkg.price_monthly} ريال` : 'مجاني'}
                      </span>
                      <span className="text-sm text-muted-foreground">/شهر</span>
                    </div>
                    {pkg.price_yearly && pkg.price_yearly > 0 && (
                      <div>
                        <span className="text-lg font-semibold text-success">
                          {pkg.price_yearly} ريال
                        </span>
                        <span className="text-sm text-muted-foreground">/سنة</span>
                      </div>
                    )}
                    <div className="bg-muted px-3 py-1 rounded-full">
                      <span className="text-sm font-medium">
                        🎁 {pkg.trial_days || 0} أيام تجريبية
                      </span>
                    </div>
                  </div>
                  {pkg.features && Array.isArray(pkg.features) && pkg.features.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {(pkg.features as string[]).map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <span className="text-primary">✓</span>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Stripe Price IDs */}
                  <div className="space-y-2 pt-3 border-t">
                    <div className="text-xs text-muted-foreground">
                      {pkg.stripe_price_id_monthly && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Stripe Monthly:</span>
                          <code className="bg-muted px-2 py-0.5 rounded">{pkg.stripe_price_id_monthly}</code>
                        </div>
                      )}
                      {pkg.stripe_price_id_yearly && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Stripe Yearly:</span>
                          <code className="bg-muted px-2 py-0.5 rounded">{pkg.stripe_price_id_yearly}</code>
                        </div>
                      )}
                      {pkg.is_active && !pkg.stripe_price_id_monthly && !pkg.stripe_price_id_yearly && (
                        <div className="text-warning flex items-center gap-1">
                          ⚠️ تحذير: الباقة نشطة بدون Stripe Price IDs
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(pkg)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm("هل أنت متأكد من حذف هذه الباقة؟")) {
                        deleteMutation.mutate(pkg.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
