-- Add new columns to daily_content for better lesson structure
ALTER TABLE daily_content 
ADD COLUMN IF NOT EXISTS examples jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS key_points text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS quick_tips text[] DEFAULT ARRAY[]::text[];

-- Add comment to explain the examples structure
COMMENT ON COLUMN daily_content.examples IS 'Array of example objects: [{title, problem, solution, explanation}]';
COMMENT ON COLUMN daily_content.key_points IS 'Array of main key points from the lesson';
COMMENT ON COLUMN daily_content.quick_tips IS 'Array of quick tips for students';