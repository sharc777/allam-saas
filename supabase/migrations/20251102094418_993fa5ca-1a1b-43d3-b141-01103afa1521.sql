-- Add unique index to prevent duplicate performance records
-- This ensures no duplicate records for the same user/question/exercise combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_performance_unique 
ON user_performance_history (
  user_id, 
  question_hash, 
  COALESCE((metadata->>'exercise_id')::text, 'na')
);

-- Add comment explaining the index
COMMENT ON INDEX idx_user_performance_unique IS 
'Prevents duplicate performance tracking for the same user, question, and exercise. Uses COALESCE for exercise_id to handle NULL values.';