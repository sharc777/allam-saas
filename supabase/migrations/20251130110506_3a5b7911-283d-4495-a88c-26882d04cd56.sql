-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create new policy that only allows service_role to insert
CREATE POLICY "Only backend can create notifications" ON public.notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow authenticated users to create notifications ONLY for themselves (fallback)
CREATE POLICY "Users can create own notifications" ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);