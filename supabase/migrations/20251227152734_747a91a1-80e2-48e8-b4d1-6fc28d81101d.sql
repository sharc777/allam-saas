-- إعادة إنشاء الـ View بدون SECURITY DEFINER لإصلاح مشكلة الأمان
DROP VIEW IF EXISTS public.student_comprehensive_stats;

CREATE VIEW public.student_comprehensive_stats AS
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

-- إضافة تعليق للتوثيق
COMMENT ON VIEW public.student_comprehensive_stats IS 'User comprehensive stats - inherits RLS from underlying tables (profiles, student_performance, etc.)';

-- توثيق سياسات RLS الحالية للـ profiles
COMMENT ON POLICY "Users can view their own profile" ON profiles IS 'Security: Users can only access their own profile data via auth.uid() = id';
COMMENT ON POLICY "Deny anonymous access to profiles" ON profiles IS 'Security: Blocks all anonymous/unauthenticated access to profiles';
COMMENT ON POLICY "Users can update their own profile" ON profiles IS 'Security: Users can only modify their own profile';
COMMENT ON POLICY "Admins can view all profiles" ON profiles IS 'Security: Admin-only access to all profiles for management';

-- توثيق سياسات RLS للـ ai_conversations  
COMMENT ON POLICY "Users can view their own conversations" ON ai_conversations IS 'Security: Users can only see their own AI conversation history';
COMMENT ON POLICY "Users can create their own conversations" ON ai_conversations IS 'Security: Users can only create conversations for themselves';
COMMENT ON POLICY "Users can update their own conversations" ON ai_conversations IS 'Security: Users can only modify their own conversations';
COMMENT ON POLICY "Users can delete their own conversations" ON ai_conversations IS 'Security: Users can only delete their own conversations';
COMMENT ON POLICY "Deny anonymous access to ai_conversations" ON ai_conversations IS 'Security: Blocks all anonymous access to AI conversations';
COMMENT ON POLICY "Admins can view all conversations" ON ai_conversations IS 'Security: Admin-only access for support and moderation';