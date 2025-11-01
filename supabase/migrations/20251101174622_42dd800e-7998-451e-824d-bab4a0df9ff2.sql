-- Phase 1: Add quality_score column to ai_training_examples
ALTER TABLE ai_training_examples 
ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 3 
CHECK (quality_score BETWEEN 1 AND 5);

-- Phase 3: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_weakness_user_section 
ON user_weakness_profile(user_id, section, weakness_score DESC);

CREATE INDEX IF NOT EXISTS idx_training_quality 
ON ai_training_examples(section, test_type, quality_score DESC);

CREATE INDEX IF NOT EXISTS idx_performance_user_time 
ON user_performance_history(user_id, attempted_at DESC);

-- Add comment for clarity
COMMENT ON COLUMN ai_training_examples.quality_score IS 'Question quality score from 1-5, mapped from quality-score-questions function';