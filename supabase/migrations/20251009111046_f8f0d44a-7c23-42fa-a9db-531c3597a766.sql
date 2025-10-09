-- المرحلة 1: تحديث قاعدة البيانات

-- 1.1 إضافة أعمدة جديدة لجدول profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS subscription_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS user_level TEXT DEFAULT 'مبتدئ',
ADD COLUMN IF NOT EXISTS initial_assessment_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS daily_quiz_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_quiz_date DATE;

-- 1.2 إنشاء جدول التقييم الأولي
CREATE TABLE IF NOT EXISTS public.initial_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  test_type test_type NOT NULL,
  track academic_track DEFAULT 'عام',
  total_score INTEGER NOT NULL,
  percentage NUMERIC NOT NULL,
  strengths TEXT[],
  weaknesses TEXT[],
  recommended_topics TEXT[],
  level TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 تفعيل RLS على الجدول الجديد
ALTER TABLE public.initial_assessments ENABLE ROW LEVEL SECURITY;

-- 1.4 سياسات RLS للتقييم الأولي
CREATE POLICY "Users can view their own initial assessment"
ON public.initial_assessments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own initial assessment"
ON public.initial_assessments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all initial assessments"
ON public.initial_assessments
FOR SELECT
USING (is_admin(auth.uid()));

-- 1.5 تحديث trigger لإضافة الأيام التجريبية تلقائياً عند التسجيل
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, trial_days, subscription_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'طالب جديد'),
    'student',
    3,
    false
  );
  RETURN NEW;
END;
$function$;