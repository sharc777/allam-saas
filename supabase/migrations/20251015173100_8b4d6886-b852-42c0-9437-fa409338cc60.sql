-- تحديث دالة handle_new_user لجعل test_type_preference = NULL للمستخدمين الجدد
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- إنشاء profile مع test_type_preference = NULL
  INSERT INTO public.profiles (
    id, 
    full_name, 
    test_type_preference, 
    track_preference,
    initial_assessment_completed,
    trial_days, 
    subscription_active
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'طالب جديد'),
    NULL, -- لا نحدد نوع الاختبار عند التسجيل - سيتم اختياره لاحقاً
    'عام'::academic_track, -- قيمة افتراضية
    true,
    3,
    false
  );
  
  -- إضافة role في user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student'::app_role);
  
  RETURN NEW;
END;
$$;