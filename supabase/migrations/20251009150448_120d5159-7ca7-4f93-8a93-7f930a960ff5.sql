-- Update RLS policy to allow auto-parsing from authenticated users
-- Drop old restrictive policy
DROP POLICY IF EXISTS "Only admins can manage content" ON public.daily_content;

-- Create separate policies for different operations
CREATE POLICY "Admins can do everything on content"
ON public.daily_content
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Auto-parsing can update sections"
ON public.daily_content
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND sections IS NULL OR (sections::text = '[]' OR sections::text = 'null'))
WITH CHECK (auth.uid() IS NOT NULL);

-- Add index for better performance on parsing checks
CREATE INDEX IF NOT EXISTS idx_daily_content_sections 
ON public.daily_content ((sections IS NULL OR sections::text = '[]'));

-- Add a column to track parsing attempts and status
ALTER TABLE public.daily_content 
ADD COLUMN IF NOT EXISTS last_parse_attempt timestamp with time zone,
ADD COLUMN IF NOT EXISTS parse_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS parse_error text;