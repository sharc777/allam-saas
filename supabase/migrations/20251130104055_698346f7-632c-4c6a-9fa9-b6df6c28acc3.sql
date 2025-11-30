-- Fix Security Definer View issue by dropping and recreating without SECURITY DEFINER
-- The view already has proper WHERE filtering (id = auth.uid()) so SECURITY DEFINER is not needed

DROP VIEW IF EXISTS student_comprehensive_stats;

CREATE VIEW student_comprehensive_stats AS
SELECT 
  p.id AS user_id,
  p.full_name,
  p.current_day,
  p.streak_days,
  p.total_points,
  p.subscription_active,
  p.trial_days,
  sp.current_level,
  (SELECT COUNT(*) FROM daily_exercises de WHERE de.user_id = p.id AND de.completed_at IS NOT NULL) AS daily_exercises_completed,
  (SELECT COUNT(*) FROM daily_exercises de WHERE de.user_id = p.id AND de.exercise_type = 'custom' AND de.completed_at IS NOT NULL) AS custom_tests_completed,
  (SELECT COUNT(*) FROM daily_exercises de WHERE de.user_id = p.id AND de.exercise_type = 'weakness_practice' AND de.completed_at IS NOT NULL) AS weakness_practices_completed,
  sp.average_score,
  (SELECT SUM(time_spent_minutes) FROM student_activities sa WHERE sa.user_id = p.id) AS total_time_spent,
  sp.strengths,
  sp.weaknesses,
  (SELECT COUNT(*) FROM student_achievements sa WHERE sa.user_id = p.id) AS achievements_unlocked,
  (SELECT MAX(activity_date) FROM student_activities sa WHERE sa.user_id = p.id) AS last_activity_date,
  sp.improvement_rate
FROM profiles p
LEFT JOIN student_performance sp ON p.id = sp.user_id
WHERE p.id = auth.uid();