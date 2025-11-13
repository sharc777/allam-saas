-- Phase 1: Database Schema Improvements

-- 1. Knowledge Base Metadata
ALTER TABLE knowledge_base 
ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('سهل', 'متوسط', 'صعب')),
ADD COLUMN IF NOT EXISTS section TEXT CHECK (section IN ('كمي', 'لفظي')),
ADD COLUMN IF NOT EXISTS learning_objectives TEXT[],
ADD COLUMN IF NOT EXISTS source_file TEXT;

CREATE INDEX IF NOT EXISTS idx_knowledge_base_difficulty ON knowledge_base(difficulty) WHERE difficulty IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_base_section ON knowledge_base(section) WHERE section IS NOT NULL;

-- 2. Questions Cache - Add Missing Fields
ALTER TABLE questions_cache
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '48 hours'),
ADD COLUMN IF NOT EXISTS generation_source TEXT DEFAULT 'ai' CHECK (generation_source IN ('cache', 'ai', 'manual')),
ADD COLUMN IF NOT EXISTS topic TEXT;

CREATE INDEX IF NOT EXISTS idx_questions_cache_expires_at ON questions_cache(expires_at) WHERE is_used = false;
CREATE INDEX IF NOT EXISTS idx_questions_cache_topic ON questions_cache(topic) WHERE topic IS NOT NULL;

-- 3. Questions Bank - Add Validation Fields
ALTER TABLE questions_bank
ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'manual' CHECK (created_by IN ('ai', 'manual', 'imported')),
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'approved' CHECK (validation_status IN ('approved', 'rejected', 'pending')),
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_questions_bank_validation_status ON questions_bank(validation_status);
CREATE INDEX IF NOT EXISTS idx_questions_bank_created_by ON questions_bank(created_by);

-- 4. Update RPC function for better locking
CREATE OR REPLACE FUNCTION fetch_and_reserve_questions(
  p_test_type TEXT,
  p_section TEXT,
  p_difficulty TEXT,
  p_user_id UUID,
  p_count INT
)
RETURNS TABLE (
  id UUID,
  question_data JSONB,
  question_hash TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE questions_cache
  SET 
    reserved_by = p_user_id,
    reserved_at = NOW()
  WHERE id IN (
    SELECT qc.id
    FROM questions_cache qc
    WHERE qc.test_type = p_test_type::test_type
      AND qc.section = p_section
      AND qc.difficulty = p_difficulty::difficulty_level
      AND qc.is_used = false
      AND qc.reserved_by IS NULL
      AND (qc.expires_at IS NULL OR qc.expires_at > NOW())
    ORDER BY RANDOM()
    LIMIT p_count
    FOR UPDATE SKIP LOCKED
  )
  RETURNING questions_cache.id, questions_cache.question_data, questions_cache.question_hash;
END;
$$;

-- 5. Auto-promote high-quality cache questions to bank
CREATE OR REPLACE FUNCTION auto_promote_cache_to_bank()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  usage_count INT;
  calc_success_rate NUMERIC;
BEGIN
  -- Check if question has been used enough times
  SELECT COUNT(*) INTO usage_count
  FROM user_performance_history 
  WHERE question_hash = NEW.question_hash;
  
  -- Only promote if used 50+ times
  IF usage_count >= 50 THEN
    -- Calculate success rate
    SELECT 
      COALESCE(
        COUNT(*) FILTER (WHERE is_correct = true)::NUMERIC / NULLIF(COUNT(*), 0),
        0
      )
    INTO calc_success_rate
    FROM user_performance_history
    WHERE question_hash = NEW.question_hash;
    
    -- Promote if success rate is reasonable (30-70%)
    IF calc_success_rate >= 0.3 AND calc_success_rate <= 0.7 THEN
      INSERT INTO questions_bank (
        subject, topic, difficulty, question_type,
        question_text, options, correct_answer, explanation,
        created_by, validation_status, usage_count, success_rate
      )
      SELECT 
        'قدرات'::test_subject,
        COALESCE(NEW.topic, 'عام'),
        NEW.difficulty,
        'multiple_choice'::question_type,
        NEW.question_data->>'question_text',
        NEW.question_data->'options',
        NEW.question_data->>'correct_answer',
        NEW.question_data->>'explanation',
        'ai',
        'approved',
        usage_count,
        calc_success_rate
      WHERE NOT EXISTS (
        SELECT 1 FROM questions_bank 
        WHERE question_text = NEW.question_data->>'question_text'
      );
      
      IF FOUND THEN
        RAISE NOTICE 'Question promoted to bank: %', NEW.question_hash;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-promotion
DROP TRIGGER IF EXISTS trigger_auto_promote_questions ON questions_cache;
CREATE TRIGGER trigger_auto_promote_questions
AFTER UPDATE OF is_used ON questions_cache
FOR EACH ROW
WHEN (NEW.is_used = true)
EXECUTE FUNCTION auto_promote_cache_to_bank();