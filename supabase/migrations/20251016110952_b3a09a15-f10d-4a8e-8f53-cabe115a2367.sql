-- Create questions cache table for pre-generated questions
CREATE TABLE public.questions_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type test_type NOT NULL,
  section TEXT NOT NULL,
  difficulty difficulty_level NOT NULL,
  track academic_track DEFAULT 'عام'::academic_track,
  question_data JSONB NOT NULL,
  question_hash TEXT UNIQUE NOT NULL,
  is_used BOOLEAN DEFAULT false,
  reserved_by UUID REFERENCES auth.users(id),
  reserved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

-- Indexes for fast lookup
CREATE INDEX idx_cache_lookup ON public.questions_cache(test_type, section, difficulty, track, is_used) WHERE is_used = false;
CREATE INDEX idx_cache_hash ON public.questions_cache(question_hash);
CREATE INDEX idx_cache_reserved ON public.questions_cache(reserved_by, reserved_at) WHERE reserved_by IS NOT NULL;

-- Enable RLS
ALTER TABLE public.questions_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view unreserved cache"
  ON public.questions_cache FOR SELECT
  USING (is_used = false OR reserved_by IS NULL OR auth.uid() = reserved_by);

CREATE POLICY "System can insert cache"
  ON public.questions_cache FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "System can update cache"
  ON public.questions_cache FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage cache"
  ON public.questions_cache FOR ALL
  USING (is_admin(auth.uid()));

-- Function to clean expired reservations (older than 5 minutes)
CREATE OR REPLACE FUNCTION public.clean_expired_cache_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE questions_cache
  SET reserved_by = NULL, reserved_at = NULL
  WHERE reserved_at < NOW() - INTERVAL '5 minutes';
END;
$$;