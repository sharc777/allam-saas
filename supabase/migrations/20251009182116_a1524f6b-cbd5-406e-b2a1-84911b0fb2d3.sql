-- إضافة حقل أيام التجربة لجدول الباقات
ALTER TABLE public.subscription_packages 
ADD COLUMN trial_days integer DEFAULT 3;

COMMENT ON COLUMN public.subscription_packages.trial_days IS 'عدد الأيام التجريبية المتاحة مع هذه الباقة';