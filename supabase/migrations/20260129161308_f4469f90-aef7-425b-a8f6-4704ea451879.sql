-- إصلاح سياسات RLS للأمان

-- 1. تعديل سياسة ad_settings لتقييد القراءة عبر Edge Function
DROP POLICY IF EXISTS "Anyone can view ad settings" ON public.ad_settings;

-- إنشاء سياسة جديدة تسمح فقط للمستخدمين المصادق عليهم بالقراءة
CREATE POLICY "Authenticated users can view ad settings" 
ON public.ad_settings 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 2. تعديل سياسة subscription_packages لتقييد القراءة للمستخدمين المصادق عليهم
DROP POLICY IF EXISTS "Everyone can view active packages" ON public.subscription_packages;

-- إنشاء سياسة جديدة
CREATE POLICY "Authenticated users can view active packages" 
ON public.subscription_packages 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);