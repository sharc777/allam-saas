-- ============================================
-- Phase 1: Add fields to daily_exercises
-- ============================================
ALTER TABLE daily_exercises 
ADD COLUMN IF NOT EXISTS exercise_type TEXT DEFAULT 'daily' 
CHECK (exercise_type IN ('daily', 'custom', 'weakness_practice'));

ALTER TABLE daily_exercises 
ADD COLUMN IF NOT EXISTS custom_topic TEXT;

-- ============================================
-- Phase 1: Add daily custom tests count to profiles
-- ============================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS daily_custom_tests_count JSONB DEFAULT '{"count": 0, "last_reset": null}';

-- ============================================
-- Phase 1: Function to check custom test limit
-- ============================================
CREATE OR REPLACE FUNCTION check_custom_test_limit(p_user_id UUID) 
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_test_count INT;
  v_last_reset TIMESTAMPTZ;
  v_limit INT;
  v_has_subscription BOOLEAN;
BEGIN
  -- Get profile data
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  
  -- Check subscription status
  v_has_subscription := v_profile.subscription_active OR (v_profile.trial_days > 0);
  
  -- Set limits based on subscription
  v_limit := CASE 
    WHEN v_profile.subscription_active THEN 20  -- مشتركون: 20 اختبار يومياً
    WHEN v_profile.trial_days > 0 THEN 5       -- تجريبي: 5 اختبارات يومياً
    ELSE 0                                      -- غير مشترك: 0
  END;
  
  -- Get current count
  v_test_count := COALESCE((v_profile.daily_custom_tests_count->>'count')::INT, 0);
  v_last_reset := (v_profile.daily_custom_tests_count->>'last_reset')::TIMESTAMPTZ;
  
  -- Reset if 24 hours passed
  IF v_last_reset IS NULL OR NOW() - v_last_reset > INTERVAL '24 hours' THEN
    v_test_count := 0;
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', v_test_count < v_limit,
    'current', v_test_count,
    'limit', v_limit,
    'has_subscription', v_has_subscription
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- Phase 1: Function to increment custom test count
-- ============================================
CREATE OR REPLACE FUNCTION increment_custom_test_count(p_user_id UUID) 
RETURNS VOID AS $$
DECLARE
  v_counts JSONB;
  v_last_reset TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT daily_custom_tests_count INTO v_counts FROM profiles WHERE id = p_user_id;
  v_last_reset := (v_counts->>'last_reset')::TIMESTAMPTZ;
  
  -- Reset if 24 hours passed
  IF v_last_reset IS NULL OR v_now - v_last_reset > INTERVAL '24 hours' THEN
    v_counts := jsonb_build_object('count', 0, 'last_reset', v_now);
  END IF;
  
  -- Increment counter
  v_counts := jsonb_set(v_counts, '{count}', to_jsonb(COALESCE((v_counts->>'count')::INT, 0) + 1));
  
  -- Update profile
  UPDATE profiles SET daily_custom_tests_count = v_counts WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- Phase 2: Create student_activities table
-- ============================================
CREATE TABLE IF NOT EXISTS student_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'daily_exercise', 
    'custom_test', 
    'weakness_practice',
    'quiz_completed',
    'lesson_completed',
    'achievement_unlocked',
    'ai_chat_session'
  )),
  activity_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}',
  score INT,
  time_spent_minutes INT,
  topics_covered TEXT[],
  strengths_identified TEXT[],
  weaknesses_identified TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_student_activities_user_date ON student_activities(user_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_activities_type ON student_activities(activity_type);

-- Enable RLS
ALTER TABLE student_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own activities" ON student_activities
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activities" ON student_activities
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all activities" ON student_activities
FOR SELECT USING (is_admin(auth.uid()));

-- ============================================
-- Phase 2: Trigger to log exercise activities
-- ============================================
CREATE OR REPLACE FUNCTION log_exercise_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND (OLD.completed_at IS NULL OR OLD IS NULL) THEN
    INSERT INTO student_activities (
      user_id, 
      activity_type, 
      activity_date,
      metadata,
      score,
      time_spent_minutes,
      topics_covered
    ) VALUES (
      NEW.user_id,
      CASE 
        WHEN NEW.exercise_type = 'custom' THEN 'custom_test'
        WHEN NEW.exercise_type = 'weakness_practice' THEN 'weakness_practice'
        ELSE 'daily_exercise'
      END,
      NEW.completed_at,
      jsonb_build_object(
        'exercise_id', NEW.id,
        'section_type', NEW.section_type,
        'total_questions', NEW.total_questions,
        'custom_topic', NEW.custom_topic
      ),
      NEW.score,
      NEW.time_taken_minutes,
      ARRAY(SELECT DISTINCT jsonb_array_elements_text(
        CASE 
          WHEN jsonb_typeof(NEW.questions) = 'array' THEN 
            (SELECT jsonb_agg(elem->'topic') FROM jsonb_array_elements(NEW.questions) AS elem WHERE elem ? 'topic')
          ELSE '[]'::jsonb
        END
      ))
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER exercise_completed_trigger
AFTER INSERT OR UPDATE ON daily_exercises
FOR EACH ROW EXECUTE FUNCTION log_exercise_activity();

-- ============================================
-- Phase 3: Create comprehensive stats view
-- ============================================
CREATE OR REPLACE VIEW student_comprehensive_stats AS
SELECT 
  p.id as user_id,
  p.full_name,
  p.current_day,
  p.streak_days,
  p.total_points,
  
  -- إحصائيات التمارين
  COUNT(DISTINCT de.id) FILTER (WHERE de.exercise_type = 'daily') as daily_exercises_completed,
  COUNT(DISTINCT de.id) FILTER (WHERE de.exercise_type = 'custom') as custom_tests_completed,
  COUNT(DISTINCT de.id) FILTER (WHERE de.exercise_type = 'weakness_practice') as weakness_practices_completed,
  ROUND(AVG(de.score), 2) as average_score,
  
  -- إحصائيات الوقت
  COALESCE(SUM(de.time_taken_minutes), 0) as total_time_spent,
  
  -- نقاط القوة والضعف
  sp.strengths,
  sp.weaknesses,
  sp.current_level,
  
  -- الإنجازات
  COUNT(DISTINCT sa.id) as achievements_unlocked,
  
  -- النشاط الأخير
  MAX(de.completed_at) as last_activity_date,
  
  -- معدل التحسن
  sp.improvement_rate,
  
  -- الاشتراك
  p.subscription_active,
  p.trial_days
  
FROM profiles p
LEFT JOIN daily_exercises de ON de.user_id = p.id
LEFT JOIN student_performance sp ON sp.user_id = p.id AND sp.test_type = p.test_type_preference
LEFT JOIN student_achievements sa ON sa.user_id = p.id
GROUP BY p.id, p.full_name, p.current_day, p.streak_days, p.total_points,
         sp.strengths, sp.weaknesses, sp.current_level, sp.improvement_rate,
         p.subscription_active, p.trial_days;