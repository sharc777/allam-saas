-- تحديث دالة handle_new_user لتعيين test_type_preference و initial_assessment_completed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- إنشاء profile مع القيم الجديدة
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
    COALESCE((NEW.raw_user_meta_data->>'test_type_preference')::test_type, 'قدرات'::test_type),
    COALESCE((NEW.raw_user_meta_data->>'track_preference')::academic_track, 'عام'::academic_track),
    true, -- تعيين initial_assessment_completed = true افتراضياً
    3,
    false
  );
  
  -- إضافة role في user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student'::app_role);
  
  RETURN NEW;
END;
$function$;