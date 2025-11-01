-- ============================================
-- المرحلة 2.2: نظام التتبع الموحد - Triggers
-- ============================================

-- 1. Trigger لتسجيل إكمال الاختبارات (quiz_results)
CREATE OR REPLACE FUNCTION log_quiz_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- فقط عند إكمال الاختبار
  IF NEW.completed_at IS NOT NULL THEN
    INSERT INTO student_activities (
      user_id,
      activity_type,
      activity_date,
      metadata,
      score,
      time_spent_minutes,
      topics_covered,
      strengths_identified,
      weaknesses_identified
    ) VALUES (
      NEW.user_id,
      CASE 
        WHEN NEW.quiz_mode = 'daily' THEN 'quiz_completed'
        WHEN NEW.quiz_mode = 'review' THEN 'quiz_review'
        WHEN NEW.quiz_mode = 'custom' THEN 'custom_test'
        ELSE 'quiz_other'
      END,
      NEW.completed_at,
      jsonb_build_object(
        'quiz_id', NEW.id,
        'day_number', NEW.day_number,
        'total_questions', NEW.total_questions,
        'percentage', NEW.percentage,
        'quiz_mode', NEW.quiz_mode
      ),
      NEW.score,
      NEW.time_taken_minutes,
      -- استخراج المواضيع من الأسئلة
      ARRAY(
        SELECT DISTINCT jsonb_array_elements_text(
          CASE 
            WHEN jsonb_typeof(NEW.questions) = 'array' THEN 
              (SELECT jsonb_agg(elem->'topic') 
               FROM jsonb_array_elements(NEW.questions) AS elem 
               WHERE elem ? 'topic' AND elem->>'topic' IS NOT NULL AND elem->>'topic' != '')
            ELSE '[]'::jsonb
          END
        )
      ),
      NEW.strengths,
      NEW.weaknesses
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- إنشاء الـ trigger
DROP TRIGGER IF EXISTS quiz_completed_trigger ON quiz_results;
CREATE TRIGGER quiz_completed_trigger
AFTER INSERT OR UPDATE ON quiz_results
FOR EACH ROW
EXECUTE FUNCTION log_quiz_activity();

-- 2. Trigger لتسجيل التقييم الأولي (initial_assessments)
CREATE OR REPLACE FUNCTION log_assessment_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO student_activities (
    user_id,
    activity_type,
    activity_date,
    metadata,
    score,
    strengths_identified,
    weaknesses_identified
  ) VALUES (
    NEW.user_id,
    'initial_assessment',
    NEW.created_at,
    jsonb_build_object(
      'assessment_id', NEW.id,
      'test_type', NEW.test_type,
      'track', NEW.track,
      'level', NEW.level,
      'percentage', NEW.percentage,
      'total_questions', NEW.total_questions
    ),
    NEW.total_score,
    NEW.strengths,
    NEW.weaknesses
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- إنشاء الـ trigger
DROP TRIGGER IF EXISTS assessment_completed_trigger ON initial_assessments;
CREATE TRIGGER assessment_completed_trigger
AFTER INSERT ON initial_assessments
FOR EACH ROW
EXECUTE FUNCTION log_assessment_activity();

-- 3. Trigger لتسجيل فتح الإنجازات (student_achievements)
CREATE OR REPLACE FUNCTION log_achievement_unlock()
RETURNS TRIGGER AS $$
DECLARE
  v_achievement_name TEXT;
  v_achievement_category TEXT;
BEGIN
  -- الحصول على معلومات الإنجاز
  SELECT name_ar, category INTO v_achievement_name, v_achievement_category
  FROM achievements
  WHERE id = NEW.achievement_id;
  
  INSERT INTO student_activities (
    user_id,
    activity_type,
    activity_date,
    metadata
  ) VALUES (
    NEW.user_id,
    'achievement_unlocked',
    NEW.unlocked_at,
    jsonb_build_object(
      'achievement_id', NEW.achievement_id,
      'achievement_name', v_achievement_name,
      'achievement_category', v_achievement_category
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- إنشاء الـ trigger
DROP TRIGGER IF EXISTS achievement_unlocked_trigger ON student_achievements;
CREATE TRIGGER achievement_unlocked_trigger
AFTER INSERT ON student_achievements
FOR EACH ROW
EXECUTE FUNCTION log_achievement_unlock();

-- 4. Trigger لتسجيل محادثات AI (ai_conversations)
CREATE OR REPLACE FUNCTION log_ai_conversation()
RETURNS TRIGGER AS $$
DECLARE
  v_message_count INT;
BEGIN
  -- حساب عدد الرسائل
  v_message_count := jsonb_array_length(NEW.messages);
  
  INSERT INTO student_activities (
    user_id,
    activity_type,
    activity_date,
    metadata
  ) VALUES (
    NEW.user_id,
    CASE 
      WHEN NEW.context_type = 'weakness_review' THEN 'ai_weakness_help'
      WHEN NEW.context_type = 'focused_practice' THEN 'ai_practice_help'
      ELSE 'ai_conversation'
    END,
    NEW.created_at,
    jsonb_build_object(
      'conversation_id', NEW.id,
      'context_type', NEW.context_type,
      'title', NEW.title,
      'message_count', v_message_count
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- إنشاء الـ trigger
DROP TRIGGER IF EXISTS ai_conversation_trigger ON ai_conversations;
CREATE TRIGGER ai_conversation_trigger
AFTER INSERT ON ai_conversations
FOR EACH ROW
EXECUTE FUNCTION log_ai_conversation();

-- إضافة index لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_student_activities_user_type 
ON student_activities(user_id, activity_type);

CREATE INDEX IF NOT EXISTS idx_student_activities_date 
ON student_activities(activity_date DESC);

-- تعليق توضيحي
COMMENT ON FUNCTION log_quiz_activity() IS 'تسجيل تلقائي لنشاط الاختبارات في جدول student_activities';
COMMENT ON FUNCTION log_assessment_activity() IS 'تسجيل تلقائي للتقييم الأولي في جدول student_activities';
COMMENT ON FUNCTION log_achievement_unlock() IS 'تسجيل تلقائي لفتح الإنجازات في جدول student_activities';
COMMENT ON FUNCTION log_ai_conversation() IS 'تسجيل تلقائي لمحادثات AI في جدول student_activities';