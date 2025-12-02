-- Fix check_custom_test_limit function to check for valid package
CREATE OR REPLACE FUNCTION public.check_custom_test_limit(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile record;
  v_package record;
  v_daily_count integer;
  v_max_tests integer := 5; -- Default limit
  v_can_create boolean;
  v_remaining integer;
  v_has_valid_package boolean;
BEGIN
  -- جلب بيانات المستخدم
  SELECT 
    trial_days,
    subscription_active,
    package_id,
    package_end_date,
    daily_custom_tests_count
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  -- إذا لم يتم العثور على المستخدم
  IF NOT FOUND THEN
    RETURN json_build_object(
      'can_create', false,
      'remaining', 0,
      'message', 'المستخدم غير موجود'
    );
  END IF;

  -- التحقق من وجود باقة صالحة
  v_has_valid_package := (
    v_profile.package_id IS NOT NULL AND 
    v_profile.package_end_date IS NOT NULL AND 
    v_profile.package_end_date > NOW()
  );

  -- جلب حدود الباقة إذا كان لديه باقة مرتبطة
  IF v_profile.package_id IS NOT NULL THEN
    SELECT 
      (limits->>'daily_custom_tests')::integer as daily_custom_tests
    INTO v_package
    FROM subscription_packages
    WHERE id = v_profile.package_id;

    -- استخدام الحد من الباقة إذا كان موجوداً
    IF v_package.daily_custom_tests IS NOT NULL THEN
      v_max_tests := v_package.daily_custom_tests;
    END IF;
  END IF;

  -- الحصول على عدد الاختبارات المخصصة اليوم
  v_daily_count := COALESCE((v_profile.daily_custom_tests_count->>'count')::integer, 0);

  -- خلال الفترة التجريبية: اختبارات غير محدودة
  IF v_profile.trial_days > 0 THEN
    RETURN json_build_object(
      'can_create', true,
      'remaining', 999,
      'max_tests', 999,
      'current_count', v_daily_count,
      'message', format('أنت في الفترة التجريبية - اختبارات غير محدودة (%s أيام متبقية)', v_profile.trial_days)
    );
  END IF;

  -- ✅ إذا لديه باقة صالحة أو اشتراك نشط: السماح بالاختبارات حسب الحدود
  IF v_profile.subscription_active OR v_has_valid_package THEN
    -- حساب الاختبارات المتبقية
    v_remaining := GREATEST(0, v_max_tests - v_daily_count);
    v_can_create := v_daily_count < v_max_tests;

    RETURN json_build_object(
      'can_create', v_can_create,
      'remaining', v_remaining,
      'max_tests', v_max_tests,
      'current_count', v_daily_count,
      'message', CASE 
        WHEN v_can_create THEN format('لديك %s اختبارات متبقية اليوم', v_remaining)
        ELSE format('وصلت للحد الأقصى اليومي (%s اختبارات)', v_max_tests)
      END
    );
  END IF;

  -- ❌ لا يوجد اشتراك نشط ولا باقة صالحة
  RETURN json_build_object(
    'can_create', false,
    'remaining', 0,
    'max_tests', v_max_tests,
    'current_count', v_daily_count,
    'message', 'انتهت صلاحية باقتك. يرجى التجديد أو الاشتراك'
  );
END;
$function$;