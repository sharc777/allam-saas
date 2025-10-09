-- Create daily_exercises table for 30-day exercise tracking
CREATE TABLE IF NOT EXISTS public.daily_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_number integer NOT NULL CHECK (day_number >= 1 AND day_number <= 30),
  section_type text NOT NULL, -- 'كمي' or 'لفظي' for قدرات, or subject names for تحصيلي
  test_type test_type NOT NULL,
  track academic_track DEFAULT 'عام',
  questions jsonb NOT NULL DEFAULT '[]',
  score integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 10,
  time_taken_minutes integer,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_number, section_type, test_type)
);

-- Create student_performance table for tracking overall performance
CREATE TABLE IF NOT EXISTS public.student_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  test_type test_type NOT NULL,
  track academic_track DEFAULT 'عام',
  current_level text NOT NULL DEFAULT 'مبتدئ', -- 'مبتدئ', 'متوسط', 'متقدم', 'ممتاز'
  total_exercises integer NOT NULL DEFAULT 0,
  total_score integer NOT NULL DEFAULT 0,
  average_score numeric NOT NULL DEFAULT 0,
  improvement_rate numeric DEFAULT 0, -- Percentage improvement
  strengths jsonb DEFAULT '[]', -- Array of strong topics
  weaknesses jsonb DEFAULT '[]', -- Array of weak topics
  badges jsonb DEFAULT '[]', -- Array of earned badges
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add preferred_sections to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_sections jsonb DEFAULT '{"قدرات": ["كمي", "لفظي"]}';

-- Enable RLS on new tables
ALTER TABLE public.daily_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_exercises
CREATE POLICY "Users can view their own exercises"
ON public.daily_exercises
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exercises"
ON public.daily_exercises
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercises"
ON public.daily_exercises
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all exercises"
ON public.daily_exercises
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- RLS Policies for student_performance
CREATE POLICY "Users can view their own performance"
ON public.student_performance
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own performance"
ON public.student_performance
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own performance"
ON public.student_performance
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all performance"
ON public.student_performance
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_exercises_user_day 
ON public.daily_exercises(user_id, day_number);

CREATE INDEX IF NOT EXISTS idx_daily_exercises_section 
ON public.daily_exercises(user_id, section_type, test_type);

CREATE INDEX IF NOT EXISTS idx_student_performance_user 
ON public.student_performance(user_id);