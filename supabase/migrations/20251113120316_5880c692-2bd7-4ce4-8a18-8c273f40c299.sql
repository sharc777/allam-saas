-- Drop the existing view
DROP VIEW IF EXISTS student_comprehensive_stats;

-- Recreate the view WITHOUT SECURITY DEFINER and with strict user filtering
CREATE VIEW student_comprehensive_stats AS
SELECT 
  p.id AS user_id,
  p.full_name,
  p.current_day,
  p.streak_days,
  p.total_points,
  p.subscription_active,
  p.trial_days,
  p.user_level AS current_level,
  
  -- Daily exercises completed
  COALESCE(
    (SELECT COUNT(*) 
     FROM daily_exercises de 
     WHERE de.user_id = p.id 
       AND de.exercise_type = 'daily' 
       AND de.completed_at IS NOT NULL),
    0
  ) AS daily_exercises_completed,
  
  -- Custom tests completed
  COALESCE(
    (SELECT COUNT(*) 
     FROM daily_exercises de 
     WHERE de.user_id = p.id 
       AND de.exercise_type = 'custom' 
       AND de.completed_at IS NOT NULL),
    0
  ) AS custom_tests_completed,
  
  -- Weakness practices completed
  COALESCE(
    (SELECT COUNT(*) 
     FROM daily_exercises de 
     WHERE de.user_id = p.id 
       AND de.exercise_type = 'weakness_practice' 
       AND de.completed_at IS NOT NULL),
    0
  ) AS weakness_practices_completed,
  
  -- Average score from all exercises
  COALESCE(
    (SELECT AVG(score::numeric / NULLIF(total_questions, 0) * 100)
     FROM daily_exercises de
     WHERE de.user_id = p.id 
       AND de.completed_at IS NOT NULL),
    0
  ) AS average_score,
  
  -- Total time spent
  COALESCE(
    (SELECT SUM(time_taken_minutes)
     FROM daily_exercises de
     WHERE de.user_id = p.id 
       AND de.completed_at IS NOT NULL),
    0
  ) AS total_time_spent,
  
  -- Strengths from performance
  COALESCE(
    (SELECT strengths 
     FROM student_performance sp 
     WHERE sp.user_id = p.id 
     LIMIT 1),
    '[]'::jsonb
  ) AS strengths,
  
  -- Weaknesses from performance
  COALESCE(
    (SELECT weaknesses 
     FROM student_performance sp 
     WHERE sp.user_id = p.id 
     LIMIT 1),
    '[]'::jsonb
  ) AS weaknesses,
  
  -- Achievements unlocked
  COALESCE(
    (SELECT COUNT(*) 
     FROM student_achievements sa 
     WHERE sa.user_id = p.id),
    0
  ) AS achievements_unlocked,
  
  -- Last activity date
  (SELECT MAX(activity_date)
   FROM student_activities sa
   WHERE sa.user_id = p.id) AS last_activity_date,
  
  -- Improvement rate from performance
  COALESCE(
    (SELECT improvement_rate 
     FROM student_performance sp 
     WHERE sp.user_id = p.id 
     LIMIT 1),
    0
  ) AS improvement_rate

FROM profiles p
-- CRITICAL: Filter to ensure users can only see their own data
WHERE p.id = auth.uid();