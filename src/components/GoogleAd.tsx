import { useEffect, useState } from 'react';
import { useAdSettings } from '@/hooks/useAdSettings';
import { supabase } from '@/integrations/supabase/client';

interface GoogleAdProps {
  slot: 'hero' | 'between_sections' | 'footer' | 'sidebar';
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
  className?: string;
}

export const GoogleAd = ({ slot, format = 'auto', className = '' }: GoogleAdProps) => {
  const { data: adSettings, isLoading } = useAdSettings();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();
        setIsAdmin(!!roles);
      }
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    if (adSettings?.is_enabled && adSettings.adsense_client_id && typeof window !== 'undefined') {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        console.error('AdSense error:', err);
      }
    }
  }, [adSettings]);

  // Don't render if loading
  if (isLoading) {
    return null;
  }

  // Don't render if ads are disabled
  if (!adSettings?.is_enabled) {
    // Show placeholder only for admins
    if (isAdmin) {
      return (
        <div className={`bg-muted/50 border-2 border-dashed border-muted-foreground/20 rounded-lg p-8 text-center ${className}`}>
          <p className="text-muted-foreground text-sm">
            📢 موضع الإعلان ({slot}) - معطل حالياً
          </p>
        </div>
      );
    }
    return null;
  }

  // Don't render if this placement is disabled
  if (!adSettings.placement_settings[slot]) {
    return null;
  }

  // Don't render if no slot ID configured
  const slotId = adSettings.ad_slots[slot];
  if (!slotId || !adSettings.adsense_client_id) {
    if (isAdmin) {
      return (
        <div className={`bg-yellow-50 dark:bg-yellow-950/30 border-2 border-dashed border-yellow-300 dark:border-yellow-800 rounded-lg p-8 text-center ${className}`}>
          <p className="text-yellow-700 dark:text-yellow-300 text-sm">
            ⚠️ يرجى تكوين معرف الإعلان في لوحة الإدارة
          </p>
        </div>
      );
    }
    return null;
  }

  // Load AdSense script if not loaded
  useEffect(() => {
    if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adSettings.adsense_client_id}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }
  }, [adSettings.adsense_client_id]);

  return (
    <div className={`ad-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={adSettings.adsense_client_id}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
};
