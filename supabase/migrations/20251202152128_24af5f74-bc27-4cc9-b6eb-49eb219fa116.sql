-- Move materialized view to private schema to fix security warnings

-- 1. Create private schema if not exists
CREATE SCHEMA IF NOT EXISTS private;

-- 2. Drop the public materialized view
DROP MATERIALIZED VIEW IF EXISTS public.questions_stats_by_subtopic;

-- 3. Create materialized view in private schema (not exposed to API)
CREATE MATERIALIZED VIEW private.questions_stats_by_subtopic AS
SELECT 
  subject,
  sub_topic,
  difficulty,
  COUNT(*) as total_questions,
  COUNT(*) FILTER (WHERE validation_status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE validation_status = 'pending') as pending_count,
  AVG(success_rate) as avg_success_rate,
  MIN(usage_count) as min_usage,
  MAX(usage_count) as max_usage
FROM public.questions_bank
GROUP BY subject, sub_topic, difficulty;

CREATE UNIQUE INDEX ON private.questions_stats_by_subtopic(subject, sub_topic, difficulty);

-- 4. Update refresh function to use private schema
CREATE OR REPLACE FUNCTION public.refresh_questions_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY private.questions_stats_by_subtopic;
END;
$$;

-- 5. Update get_questions_stats to use private schema
CREATE OR REPLACE FUNCTION public.get_questions_stats(p_subject TEXT DEFAULT NULL, p_sub_topic TEXT DEFAULT NULL)
RETURNS TABLE (
  subject TEXT,
  sub_topic TEXT,
  difficulty TEXT,
  total_questions BIGINT,
  approved_count BIGINT,
  pending_count BIGINT,
  avg_success_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  -- Only admins can access stats
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    qs.subject::TEXT,
    qs.sub_topic,
    qs.difficulty::TEXT,
    qs.total_questions,
    qs.approved_count,
    qs.pending_count,
    qs.avg_success_rate
  FROM private.questions_stats_by_subtopic qs
  WHERE (p_subject IS NULL OR qs.subject::TEXT = p_subject)
    AND (p_sub_topic IS NULL OR qs.sub_topic = p_sub_topic);
END;
$$;