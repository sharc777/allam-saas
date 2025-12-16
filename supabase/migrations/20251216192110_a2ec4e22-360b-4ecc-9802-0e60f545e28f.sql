-- تحديث دالة handle_new_user لقراءة trial_days من الباقة
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
DECLARE
  v_free_package_id uuid;
  v_trial_days integer;
BEGIN
  -- البحث عن الباقة المجانية وقراءة trial_days منها
  SELECT id, COALESCE(trial_days, 30) INTO v_free_package_id, v_trial_days
  FROM subscription_packages
  WHERE (price_monthly IS NULL OR price_monthly = 0)
    AND is_active = true
  ORDER BY display_order
  LIMIT 1;

  -- إدراج البروفايل مع الباقة المجانية و trial_days من الباقة
  INSERT INTO public.profiles (
    id, 
    full_name,
    package_id,
    package_start_date,
    trial_days
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
    v_free_package_id,
    NOW(),
    COALESCE(v_trial_days, 30)
  );

  RETURN NEW;
END;
$$;