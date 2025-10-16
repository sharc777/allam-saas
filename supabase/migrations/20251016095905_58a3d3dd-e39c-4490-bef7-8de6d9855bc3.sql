-- Update handle_new_user to set default values instead of NULL
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create profile with default test type and track
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
    'قدرات'::test_type, -- Default value instead of NULL
    'عام'::academic_track, -- Default value
    true,
    3,
    false
  );
  
  -- Add student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student'::app_role);
  
  RETURN NEW;
END;
$$;

-- Update existing users with NULL test_type_preference to default values
UPDATE profiles 
SET 
  test_type_preference = 'قدرات'::test_type,
  track_preference = COALESCE(track_preference, 'عام'::academic_track)
WHERE test_type_preference IS NULL;