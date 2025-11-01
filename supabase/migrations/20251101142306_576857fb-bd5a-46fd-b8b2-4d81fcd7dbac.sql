-- Create user_performance_history table
CREATE TABLE IF NOT EXISTS public.user_performance_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_hash TEXT NOT NULL,
  topic TEXT NOT NULL,
  section TEXT NOT NULL,
  difficulty difficulty_level NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_spent_seconds INTEGER,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS for user_performance_history
ALTER TABLE public.user_performance_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own performance history"
  ON public.user_performance_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own performance history"
  ON public.user_performance_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all performance history"
  ON public.user_performance_history FOR SELECT
  USING (is_admin(auth.uid()));

-- Create user_weakness_profile table
CREATE TABLE IF NOT EXISTS public.user_weakness_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  section TEXT NOT NULL,
  weakness_score NUMERIC NOT NULL DEFAULT 0,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  correct_attempts INTEGER NOT NULL DEFAULT 0,
  avg_time_seconds INTEGER,
  priority TEXT NOT NULL DEFAULT 'medium',
  trend TEXT NOT NULL DEFAULT 'stable',
  last_attempt TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, topic, section)
);

-- Enable RLS for user_weakness_profile
ALTER TABLE public.user_weakness_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weakness profile"
  ON public.user_weakness_profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weakness profile"
  ON public.user_weakness_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weakness profile"
  ON public.user_weakness_profile FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all weakness profiles"
  ON public.user_weakness_profile FOR SELECT
  USING (is_admin(auth.uid()));

-- Indexes for user_performance_history
CREATE INDEX idx_performance_history_user_id ON public.user_performance_history(user_id);
CREATE INDEX idx_performance_history_attempted_at ON public.user_performance_history(attempted_at DESC);
CREATE INDEX idx_performance_history_topic ON public.user_performance_history(topic);
CREATE INDEX idx_performance_history_user_topic ON public.user_performance_history(user_id, topic);
CREATE INDEX idx_performance_history_user_attempted ON public.user_performance_history(user_id, attempted_at DESC);

-- Indexes for user_weakness_profile
CREATE INDEX idx_weakness_profile_user_id ON public.user_weakness_profile(user_id);
CREATE INDEX idx_weakness_profile_priority ON public.user_weakness_profile(priority);
CREATE INDEX idx_weakness_profile_user_score ON public.user_weakness_profile(user_id, weakness_score DESC);

-- Indexes for existing tables
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON public.quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_completed_at ON public.quiz_results(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_completed ON public.quiz_results(user_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_exercises_user_id ON public.daily_exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_exercises_completed_at ON public.daily_exercises(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_exercises_user_completed ON public.daily_exercises(user_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_questions_cache_section_difficulty ON public.questions_cache(section, difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_cache_is_used ON public.questions_cache(is_used) WHERE is_used = false;
CREATE INDEX IF NOT EXISTS idx_questions_cache_reserved ON public.questions_cache(reserved_by, reserved_at) WHERE reserved_by IS NOT NULL;