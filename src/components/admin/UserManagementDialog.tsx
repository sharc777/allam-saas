import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type TestType = Database["public"]["Enums"]["test_type"];
type AcademicTrack = Database["public"]["Enums"]["academic_track"];

interface UserManagementDialogProps {
  user: Profile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementDialog = ({ user, isOpen, onClose }: UserManagementDialogProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    test_type_preference: user?.test_type_preference || "قدرات" as TestType,
    track_preference: user?.track_preference || "عام" as AcademicTrack,
    trial_days: user?.trial_days || 0,
    subscription_active: user?.subscription_active || false,
  });

  // Fetch packages for selection
  const { data: packages } = useQuery({
    queryKey: ["subscription-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_packages")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Profile>) => {
      if (!user) return;
      
      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast({
        title: "✅ تم التحديث بنجاح",
        description: "تم تحديث بيانات المستخدم",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "❌ خطأ في التحديث",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const assignPackage = async (packageId: string) => {
    if (!user) return;
    
    const selectedPackage = packages?.find(p => p.id === packageId);
    if (!selectedPackage) return;

    const now = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // Default 1 month

    const { error } = await supabase
      .from("profiles")
      .update({
        package_id: packageId,
        package_start_date: now.toISOString(),
        package_end_date: endDate.toISOString(),
        subscription_active: true,
        trial_days: selectedPackage.trial_days || 0,
      })
      .eq("id", user.id);

    if (error) {
      toast({
        title: "❌ خطأ",
        description: error.message,
        variant: "destructive",
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast({
        title: "✅ تم تعيين الباقة",
        description: `تم تعيين باقة ${selectedPackage.name_ar} للمستخدم`,
      });
    }
  };

  // Fetch user's current role from user_roles table
  const { data: userRoles } = useQuery({
    queryKey: ["user-roles", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
  });

  const isAdmin = userRoles?.some(r => r.role === "admin") ?? false;

  const toggleRole = async () => {
    if (!user) return;

    const newRole = isAdmin ? "student" : "admin";

    try {
      const { data, error } = await supabase.functions.invoke('manage-roles', {
        body: {
          target_user_id: user.id,
          desired_role: newRole,
        }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to update role");
      }

      if (!data || !data.success) {
        throw new Error(data?.error || "Failed to update role");
      }

      // Refresh lists
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      queryClient.invalidateQueries({ queryKey: ["user-roles", user.id] });
      toast({
        title: "✅ تم تغيير الصلاحية",
        description: `تم تغيير الصلاحية إلى ${newRole === "admin" ? "أدمن" : "طالب"}`,
      });
      onClose();
    } catch (error: any) {
      console.error("Error toggling role:", error);
      toast({
        title: "❌ خطأ في تغيير الصلاحية",
        description: error.message || "حدث خطأ أثناء تحديث الدور",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>إدارة بيانات المستخدم</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">المعلومات الأساسية</h3>
            
            <div>
              <Label>الاسم الكامل</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>نوع الاختبار</Label>
                <Select 
                  value={formData.test_type_preference} 
                  onValueChange={(v: TestType) => setFormData({ ...formData, test_type_preference: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="قدرات">قدرات</SelectItem>
                    <SelectItem value="تحصيلي">تحصيلي</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>المسار</Label>
                <Select 
                  value={formData.track_preference} 
                  onValueChange={(v: AcademicTrack) => setFormData({ ...formData, track_preference: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="عام">عام</SelectItem>
                    <SelectItem value="علمي">علمي</SelectItem>
                    <SelectItem value="نظري">نظري</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Subscription Management */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-lg">إدارة الاشتراك</h3>
            
            <div>
              <Label>الأيام التجريبية المتبقية</Label>
              <Input
                type="number"
                value={formData.trial_days}
                onChange={(e) => setFormData({ ...formData, trial_days: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>تعيين باقة</Label>
              <Select onValueChange={assignPackage}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر باقة..." />
                </SelectTrigger>
                <SelectContent>
                  {packages?.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name_ar} - {pkg.price_monthly ? `${pkg.price_monthly} ريال/شهر` : 'مجاني'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.subscription_active}
                onChange={(e) => setFormData({ ...formData, subscription_active: e.target.checked })}
                className="rounded"
              />
              <Label>اشتراك نشط</Label>
            </div>
          </div>

          {/* Role Management */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-lg">الصلاحيات</h3>
            
            <div className="flex items-center gap-4">
              <p className="text-sm">الصلاحية الحالية: <strong>{isAdmin ? "أدمن" : "طالب"}</strong></p>
              <Button
                type="button"
                variant="outline"
                onClick={toggleRole}
              >
                تحويل إلى {isAdmin ? "طالب" : "أدمن"}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              )}
              <Save className="h-4 w-4 ml-2" />
              حفظ التغييرات
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};