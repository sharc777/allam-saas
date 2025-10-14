-- CRITICAL SECURITY FIX 1: Remove profiles.role column to prevent privilege escalation
-- The role should ONLY be stored in user_roles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- CRITICAL SECURITY FIX 2: Add explicit deny policies for anonymous users
-- Prevent enumeration attacks and unauthorized access

-- Profiles table: Deny all anonymous access
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- Quiz results: Deny all anonymous access
DROP POLICY IF EXISTS "Deny anonymous access to quiz_results" ON public.quiz_results;
CREATE POLICY "Deny anonymous access to quiz_results"
ON public.quiz_results
FOR ALL
TO anon
USING (false);

-- Initial assessments: Deny all anonymous access
DROP POLICY IF EXISTS "Deny anonymous access to initial_assessments" ON public.initial_assessments;
CREATE POLICY "Deny anonymous access to initial_assessments"
ON public.initial_assessments
FOR ALL
TO anon
USING (false);

-- Daily exercises: Deny all anonymous access
DROP POLICY IF EXISTS "Deny anonymous access to daily_exercises" ON public.daily_exercises;
CREATE POLICY "Deny anonymous access to daily_exercises"
ON public.daily_exercises
FOR ALL
TO anon
USING (false);

-- Student performance: Deny all anonymous access
DROP POLICY IF EXISTS "Deny anonymous access to student_performance" ON public.student_performance;
CREATE POLICY "Deny anonymous access to student_performance"
ON public.student_performance
FOR ALL
TO anon
USING (false);

-- Student progress: Deny all anonymous access
DROP POLICY IF EXISTS "Deny anonymous access to student_progress" ON public.student_progress;
CREATE POLICY "Deny anonymous access to student_progress"
ON public.student_progress
FOR ALL
TO anon
USING (false);

-- AI conversations: Deny all anonymous access
DROP POLICY IF EXISTS "Deny anonymous access to ai_conversations" ON public.ai_conversations;
CREATE POLICY "Deny anonymous access to ai_conversations"
ON public.ai_conversations
FOR ALL
TO anon
USING (false);

-- User roles: Deny all anonymous access
DROP POLICY IF EXISTS "Deny anonymous access to user_roles" ON public.user_roles;
CREATE POLICY "Deny anonymous access to user_roles"
ON public.user_roles
FOR ALL
TO anon
USING (false);

-- Student achievements: Deny all anonymous access
DROP POLICY IF EXISTS "Deny anonymous access to student_achievements" ON public.student_achievements;
CREATE POLICY "Deny anonymous access to student_achievements"
ON public.student_achievements
FOR ALL
TO anon
USING (false);