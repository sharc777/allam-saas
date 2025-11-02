-- Add performance indexes only (policies already exist)
CREATE INDEX IF NOT EXISTS idx_user_performance_user_date 
ON public.user_performance_history(user_id, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_weakness_profile_score 
ON public.user_weakness_profile(user_id, weakness_score DESC);