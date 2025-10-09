-- Add sections support to daily_content
ALTER TABLE daily_content 
ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS requires_previous_completion BOOLEAN DEFAULT false;

-- Add section progress tracking to student_progress
ALTER TABLE student_progress
ADD COLUMN IF NOT EXISTS section_progress JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS can_proceed_to_next BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_section_completed TEXT;