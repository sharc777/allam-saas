-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Everyone can view AI settings" ON public.ai_settings;

-- Create a new restrictive policy that only allows admins to view AI settings
CREATE POLICY "Only admins can view AI settings" 
ON public.ai_settings 
FOR SELECT 
USING (is_admin(auth.uid()));