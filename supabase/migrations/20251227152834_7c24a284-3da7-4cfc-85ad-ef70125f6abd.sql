-- إصلاح SECURITY DEFINER عبر إعادة إنشاء الـ View بـ SECURITY INVOKER
DROP VIEW IF EXISTS public.student_comprehensive_stats;

CREATE VIEW public.student_comprehensive_stats 
WITH (security_invoker = on) AS
SELECT 
    p.id AS user_id,
    p.full_name,
    p.current_day,
    p.streak_days,
    p.total_points,
    p.subscription_active,
    p.trial_days,
    sp.current_level,
    sp.average_score,
    sp.strengths,
    sp.weaknesses,
    sp.improvement_rate,
    (SELECT count(*) FROM daily_exercises de WHERE de.user_id = p.id AND de.completed_at IS NOT NULL) AS daily_exercises_completed,
    (SELECT count(*) FROM daily_exercises de WHERE de.user_id = p.id AND de.exercise_type = 'custom' AND de.completed_at IS NOT NULL) AS custom_tests_completed,
    (SELECT count(*) FROM daily_exercises de WHERE de.user_id = p.id AND de.exercise_type = 'weakness_practice' AND de.completed_at IS NOT NULL) AS weakness_practices_completed,
    (SELECT sum(sa.time_spent_minutes) FROM student_activities sa WHERE sa.user_id = p.id) AS total_time_spent,
    (SELECT count(*) FROM student_achievements sach WHERE sach.user_id = p.id) AS achievements_unlocked,
    (SELECT max(sa.activity_date) FROM student_activities sa WHERE sa.user_id = p.id) AS last_activity_date
FROM profiles p
LEFT JOIN student_performance sp ON p.id = sp.user_id;

COMMENT ON VIEW public.student_comprehensive_stats IS 'User comprehensive stats with SECURITY INVOKER - inherits RLS from underlying tables';