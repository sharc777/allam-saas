import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AdSettings {
  id: string;
  is_enabled: boolean;
  adsense_client_id: string | null;
  ad_slots: {
    hero: string;
    between_sections: string;
    footer: string;
    sidebar: string;
  };
  placement_settings: {
    hero: boolean;
    between_sections: boolean;
    footer: boolean;
    sidebar: boolean;
  };
}

export const AdManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: adSettings, isLoading } = useQuery({
    queryKey: ['ad-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_settings')
        .select('*')
        .single();

      if (error) throw error;
      
      return {
        id: data.id,
        is_enabled: data.is_enabled,
        adsense_client_id: data.adsense_client_id,
        ad_slots: data.ad_slots as AdSettings['ad_slots'],
        placement_settings: data.placement_settings as AdSettings['placement_settings'],
      };
    },
  });

  const [formData, setFormData] = useState<Partial<AdSettings>>({});

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<AdSettings>) => {
      if (!adSettings?.id) throw new Error('No settings found');

      const { error } = await supabase
        .from('ad_settings')
        .update(updates)
        .eq('id', adSettings.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-settings'] });
      toast({
        title: '✅ تم الحفظ',
        description: 'تم تحديث إعدادات الإعلانات بنجاح',
      });
    },
    onError: (error) => {
      toast({
        title: '❌ خطأ',
        description: 'فشل حفظ الإعدادات: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!adSettings) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">
          لم يتم العثور على إعدادات الإعلانات
        </p>
      </Card>
    );
  }

  const currentData = { ...adSettings, ...formData };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const updateField = (field: keyof AdSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateSlot = (slot: keyof AdSettings['ad_slots'], value: string) => {
    setFormData(prev => ({
      ...prev,
      ad_slots: {
        ...currentData.ad_slots,
        [slot]: value,
      },
    }));
  };

  const updatePlacement = (placement: keyof AdSettings['placement_settings'], enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      placement_settings: {
        ...currentData.placement_settings,
        [placement]: enabled,
      },
    }));
  };

  const placements = [
    { key: 'hero', label: '🏠 بعد الهيدر الرئيسي', description: 'يظهر بعد قسم البطل في الصفحة الرئيسية' },
    { key: 'between_sections', label: '📄 بين الأقسام', description: 'يظهر بين قسم المميزات وقسم كيف يعمل' },
    { key: 'footer', label: '🔻 قبل الفوتر', description: 'يظهر قبل التذييل في الصفحة' },
    { key: 'sidebar', label: '📱 الشريط الجانبي', description: 'يظهر في الشريط الجانبي (قريباً)' },
  ];

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">📢 إدارة الإعلانات</h2>
          <p className="text-muted-foreground mt-1">
            تحكم في إعلانات Google AdSense المعروضة في الموقع
          </p>
        </div>

        <Separator />

        {/* Enable/Disable Ads */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <Label className="text-base font-semibold">تفعيل الإعلانات</Label>
            <p className="text-sm text-muted-foreground">
              تشغيل أو إيقاف عرض الإعلانات في الموقع
            </p>
          </div>
          <Switch
            checked={currentData.is_enabled || false}
            onCheckedChange={(checked) => updateField('is_enabled', checked)}
          />
        </div>

        <Separator />

        {/* AdSense Client ID */}
        <div className="space-y-2">
          <Label htmlFor="client-id" className="text-base font-semibold">
            معرف AdSense (Client ID)
          </Label>
          <p className="text-sm text-muted-foreground">
            أدخل معرف حساب AdSense الخاص بك (مثال: ca-pub-1234567890123456)
          </p>
          <Input
            id="client-id"
            placeholder="ca-pub-1234567890123456"
            value={currentData.adsense_client_id || ''}
            onChange={(e) => updateField('adsense_client_id', e.target.value)}
            dir="ltr"
            className="font-mono"
          />
        </div>

        <Separator />

        {/* Ad Placements */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">📍 مواقع الإعلانات</h3>
            <p className="text-sm text-muted-foreground">
              قم بتفعيل المواقع وإدخال معرفات الإعلانات (Ad Slot IDs)
            </p>
          </div>

          {placements.map((placement) => (
            <Card key={placement.key} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="font-semibold">{placement.label}</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {placement.description}
                  </p>
                </div>
                <Switch
                  checked={currentData.placement_settings[placement.key as keyof typeof currentData.placement_settings]}
                  onCheckedChange={(checked) =>
                    updatePlacement(placement.key as keyof AdSettings['placement_settings'], checked)
                  }
                />
              </div>

              {currentData.placement_settings[placement.key as keyof typeof currentData.placement_settings] && (
                <div>
                  <Label htmlFor={`slot-${placement.key}`} className="text-sm">
                    Slot ID
                  </Label>
                  <Input
                    id={`slot-${placement.key}`}
                    placeholder="1234567890"
                    value={currentData.ad_slots[placement.key as keyof typeof currentData.ad_slots]}
                    onChange={(e) =>
                      updateSlot(placement.key as keyof AdSettings['ad_slots'], e.target.value)
                    }
                    dir="ltr"
                    className="font-mono mt-1"
                  />
                </div>
              )}
            </Card>
          ))}
        </div>

        <Separator />

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || Object.keys(formData).length === 0}
            size="lg"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>💾 حفظ الإعدادات</>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};
