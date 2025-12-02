-- Phase 1 & 2: ترقية جداول ai_training_examples و questions_bank

-- 1. إضافة أعمدة جديدة لـ ai_training_examples
ALTER TABLE ai_training_examples 
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS sub_topic TEXT;

ALTER TABLE ai_training_examples
  ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS success_rate NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS generated_questions_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS example_hash TEXT;

-- إضافة constraint للـ validation_status
ALTER TABLE ai_training_examples DROP CONSTRAINT IF EXISTS ai_training_examples_validation_status_check;
ALTER TABLE ai_training_examples ADD CONSTRAINT ai_training_examples_validation_status_check 
  CHECK (validation_status IN ('pending', 'approved', 'rejected'));

-- 2. Indexes محسّنة لـ ai_training_examples
DROP INDEX IF EXISTS idx_training_subtopic;
DROP INDEX IF EXISTS idx_training_section_subtopic;
DROP INDEX IF EXISTS idx_training_performance;
DROP INDEX IF EXISTS idx_training_usage;

CREATE INDEX idx_training_subtopic ON ai_training_examples(sub_topic, difficulty, quality_score DESC);
CREATE INDEX idx_training_section_subtopic ON ai_training_examples(section, sub_topic, validation_status);
CREATE INDEX idx_training_performance ON ai_training_examples(success_rate DESC NULLS LAST) WHERE validation_status = 'approved';
CREATE INDEX idx_training_usage ON ai_training_examples(usage_count ASC, last_used_at ASC NULLS FIRST) WHERE validation_status = 'approved';

-- 3. إضافة أعمدة لـ questions_bank
ALTER TABLE questions_bank
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS times_answered INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS times_correct INTEGER DEFAULT 0;

-- 4. توحيد قيم subject في questions_bank
UPDATE questions_bank SET subject = 'كمي' WHERE subject = 'math';
UPDATE questions_bank SET subject = 'لفظي' WHERE subject = 'arabic';

-- 5. Indexes محسّنة لـ questions_bank
DROP INDEX IF EXISTS idx_qbank_optimized;
DROP INDEX IF EXISTS idx_qbank_hash_fast;
DROP INDEX IF EXISTS idx_qbank_unused;

CREATE INDEX idx_qbank_optimized ON questions_bank(subject, sub_topic, difficulty, validation_status) 
  WHERE validation_status = 'approved';
CREATE INDEX idx_qbank_hash_fast ON questions_bank USING hash(question_hash);
CREATE INDEX idx_qbank_unused ON questions_bank(last_used_at ASC NULLS FIRST, usage_count ASC)
  WHERE validation_status = 'approved';

-- 6. إنشاء Materialized View للإحصائيات
DROP MATERIALIZED VIEW IF EXISTS questions_stats_by_subtopic;

CREATE MATERIALIZED VIEW questions_stats_by_subtopic AS
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
FROM questions_bank
GROUP BY subject, sub_topic, difficulty;

CREATE UNIQUE INDEX ON questions_stats_by_subtopic(subject, sub_topic, difficulty);

-- 7. Function لتحديث الـ View
CREATE OR REPLACE FUNCTION refresh_questions_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY questions_stats_by_subtopic;
END;
$$;