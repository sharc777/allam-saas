-- Fix security warnings for materialized view
-- Revoke public access and grant only to authenticated users

REVOKE ALL ON questions_stats_by_subtopic FROM anon, public;
GRANT SELECT ON questions_stats_by_subtopic TO authenticated;

-- Create RLS-like function to check admin access for the view (using TEXT types)
CREATE OR REPLACE FUNCTION get_questions_stats(p_subject TEXT DEFAULT NULL, p_sub_topic TEXT DEFAULT NULL)
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
SET search_path = public
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
  FROM questions_stats_by_subtopic qs
  WHERE (p_subject IS NULL OR qs.subject::TEXT = p_subject)
    AND (p_sub_topic IS NULL OR qs.sub_topic = p_sub_topic);
END;
$$;