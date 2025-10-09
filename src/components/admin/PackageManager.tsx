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
    features: [] as string[],
    limits: {} as Record<string, number>,
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
      features: [],
      limits: {},
      is_active: true,
      is_featured: false,
    });
    setNewFeature("");
  };

  const handleEdit = (pkg: SubscriptionPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name_ar: pkg.name_ar,
      name_en: pkg.name_en || "",
      description_ar: pkg.description_ar || "",
      price_monthly: Number(pkg.price_monthly) || 0,
      price_yearly: Number(pkg.price_yearly) || 0,
      trial_days: pkg.trial_days || 3,
      features: Array.isArray(pkg.features) ? pkg.features as string[] : [],
      limits: (pkg.limits as Record<string, number>) || {},
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
                    <div className="space-y-1">
                      {(pkg.features as string[]).map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <span className="text-primary">✓</span>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}
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
