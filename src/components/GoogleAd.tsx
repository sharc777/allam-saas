import { useEffect, useState, useRef, useCallback } from 'react';
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
  const adContainerRef = useRef<HTMLDivElement>(null);
  const adInitializedRef = useRef(false);
  const scriptLoadedRef = useRef(false);

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

  // تحميل سكريبت AdSense مرة واحدة فقط
  const loadAdSenseScript = useCallback(() => {
    if (scriptLoadedRef.current) return;
    if (!adSettings?.adsense_client_id) return;
    
    const existingScript = document.querySelector('script[src*="adsbygoogle.js"]');
    if (existingScript) {
      scriptLoadedRef.current = true;
      return;
    }
    
    const script = document.createElement('script');
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adSettings.adsense_client_id}`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      scriptLoadedRef.current = true;
    };
    document.head.appendChild(script);
  }, [adSettings?.adsense_client_id]);

  // تهيئة الإعلان مرة واحدة فقط لكل عنصر
  useEffect(() => {
    if (!adSettings?.is_enabled || !adSettings.adsense_client_id) return;
    if (!adSettings.placement_settings[slot]) return;
    if (!adSettings.ad_slots[slot]) return;
    if (adInitializedRef.current) return;
    if (!adContainerRef.current) return;

    // تحميل السكريبت أولاً
    loadAdSenseScript();

    // التحقق من أن العنصر ins موجود وليس محملاً
    const insElement = adContainerRef.current.querySelector('ins.adsbygoogle');
    if (!insElement) return;
    
    // التحقق من أن الإعلان لم يُحمّل مسبقاً
    if (insElement.getAttribute('data-ad-status') === 'filled' || 
        insElement.getAttribute('data-ad-status') === 'unfilled') {
      adInitializedRef.current = true;
      return;
    }

    // انتظار تحميل السكريبت ثم تنفيذ push
    const initAd = () => {
      if (typeof window === 'undefined') return;
      
      try {
        // @ts-ignore
        const adsbygoogle = window.adsbygoogle || [];
        // @ts-ignore
        window.adsbygoogle = adsbygoogle;
        
        // التحقق من عدم وجود الإعلان مسبقاً
        if (!adInitializedRef.current) {
          adsbygoogle.push({});
          adInitializedRef.current = true;
        }
      } catch (err) {
        // تجاهل أخطاء "already have ads" لأنها طبيعية
        if (err instanceof Error && !err.message.includes('already have ads')) {
          console.error('AdSense initialization error:', err);
        }
      }
    };

    // انتظار تحميل السكريبت
    if (scriptLoadedRef.current) {
      initAd();
    } else {
      const checkScript = setInterval(() => {
        if (scriptLoadedRef.current) {
          clearInterval(checkScript);
          initAd();
        }
      }, 100);
      
      // إيقاف الفحص بعد 5 ثواني
      setTimeout(() => clearInterval(checkScript), 5000);
    }
  }, [adSettings, slot, loadAdSenseScript]);

  // Reset on unmount for potential re-mount scenarios
  useEffect(() => {
    return () => {
      adInitializedRef.current = false;
    };
  }, []);

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

  return (
    <div ref={adContainerRef} className={`ad-container ${className}`}>
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
