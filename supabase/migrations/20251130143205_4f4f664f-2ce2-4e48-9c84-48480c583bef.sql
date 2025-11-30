-- المرحلة 1: حذف وإعادة إنشاء دالة check_custom_test_limit لقراءة الحدود من الباقة
-- ===================================================================

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS check_custom_test_limit(uuid);

-- إنشاء دالة check_custom_test_limit الجديدة لقراءة الحدود من subscription_packages
CREATE FUNCTION check_custom_test_limit(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_package record;
  v_daily_count integer;
  v_max_tests integer := 5; -- Default limit
  v_can_create boolean;
  v_remaining integer;
BEGIN
  -- جلب بيانات المستخدم
  SELECT 
    trial_days,
    subscription_active,
    package_id,
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

  -- إذا لم يكن مشترك ولا في الفترة التجريبية
  IF NOT v_profile.subscription_active THEN
    RETURN json_build_object(
      'can_create', false,
      'remaining', 0,
      'max_tests', v_max_tests,
      'current_count', v_daily_count,
      'message', 'انتهت الفترة التجريبية. يرجى الاشتراك للمتابعة'
    );
  END IF;

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
END;
$$;

-- المرحلة 2: تحديث دالة handle_new_user لربط المستخدم بالباقة المجانية
-- ==============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_free_package_id uuid;
BEGIN
  -- البحث عن الباقة المجانية (price = 0 or NULL)
  SELECT id INTO v_free_package_id
  FROM subscription_packages
  WHERE (price_monthly IS NULL OR price_monthly = 0)
    AND is_active = true
  ORDER BY display_order
  LIMIT 1;

  -- إدراج البروفايل مع ربطه بالباقة المجانية
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
    3
  );

  RETURN NEW;
END;
$$;

-- المرحلة 3: إنشاء تريجر لتحديث package_end_date تلقائياً
-- ============================================================

CREATE OR REPLACE FUNCTION update_package_end_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duration_days integer;
BEGIN
  -- إذا تم تعيين package_id جديد وpackage_start_date
  IF NEW.package_id IS NOT NULL 
     AND NEW.package_start_date IS NOT NULL 
     AND (OLD.package_id IS NULL OR OLD.package_id != NEW.package_id) THEN
    
    -- الحصول على مدة الباقة (افتراضياً 30 يوم)
    SELECT COALESCE((limits->>'accessible_days')::integer, 30)
    INTO v_duration_days
    FROM subscription_packages
    WHERE id = NEW.package_id;

    -- تحديث package_end_date
    NEW.package_end_date := NEW.package_start_date + (v_duration_days || ' days')::interval;
  END IF;

  RETURN NEW;
END;
$$;

-- حذف التريجر القديم إن وُجد وإنشاء واحد جديد
DROP TRIGGER IF EXISTS set_package_end_date ON profiles;
CREATE TRIGGER set_package_end_date
  BEFORE INSERT OR UPDATE OF package_id, package_start_date ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_package_end_date();