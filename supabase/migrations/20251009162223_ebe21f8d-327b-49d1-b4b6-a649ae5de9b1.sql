-- Phase 2 & 3: Add daily limits tracking and AI training examples

-- Add daily exercise tracking to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS daily_exercises_count jsonb DEFAULT '{"كمي": 0, "لفظي": 0, "last_reset": null}'::jsonb;

-- Create table for AI training examples (simplified admin)
CREATE TABLE IF NOT EXISTS ai_training_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL CHECK (section IN ('كمي', 'لفظي', 'تحصيلي')),
  test_type test_type NOT NULL,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_answer text NOT NULL,
  explanation text,
  subject text,
  difficulty difficulty_level DEFAULT 'medium',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on ai_training_examples
ALTER TABLE ai_training_examples ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can manage training examples
CREATE POLICY "Only admins can manage training examples"
ON ai_training_examples
FOR ALL
USING (is_admin(auth.uid()));

-- Create RPC function to increment daily exercise count
CREATE OR REPLACE FUNCTION increment_daily_count(
  p_user_id uuid,
  p_section text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counts jsonb;
  v_last_reset timestamptz;
  v_now timestamptz := now();
BEGIN
  SELECT daily_exercises_count INTO v_counts FROM profiles WHERE id = p_user_id;
  
  v_last_reset := (v_counts->>'last_reset')::timestamptz;
  
  -- Reset if 24 hours passed
  IF v_last_reset IS NULL OR v_now - v_last_reset > interval '24 hours' THEN
    v_counts := jsonb_build_object(
      'كمي', 0,
      'لفظي', 0,
      'last_reset', v_now
    );
  END IF;
  
  -- Increment counter
  v_counts := jsonb_set(
    v_counts,
    ARRAY[p_section],
    to_jsonb(COALESCE((v_counts->>p_section)::int, 0) + 1)
  );
  
  -- Update profile
  UPDATE profiles 
  SET daily_exercises_count = v_counts
  WHERE id = p_user_id;
END;
$$;

-- Add trigger for updated_at on ai_training_examples
CREATE TRIGGER update_ai_training_examples_updated_at
BEFORE UPDATE ON ai_training_examples
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();