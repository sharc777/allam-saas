-- Step 1: Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = user_id AND role = 'admin'::user_role
  );
$$;

-- Step 2: Drop all existing RLS policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Only admins can manage achievements" ON public.achievements;
DROP POLICY IF EXISTS "Everyone can view achievements" ON public.achievements;

DROP POLICY IF EXISTS "Admins can view all conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can create their own conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.ai_conversations;

DROP POLICY IF EXISTS "Only admins can manage content" ON public.daily_content;
DROP POLICY IF EXISTS "Published content is viewable by everyone" ON public.daily_content;

DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions_bank;
DROP POLICY IF EXISTS "Students can view questions" ON public.questions_bank;

DROP POLICY IF EXISTS "Admins can view all results" ON public.quiz_results;
DROP POLICY IF EXISTS "Users can view their own results" ON public.quiz_results;
DROP POLICY IF EXISTS "Users can create their own results" ON public.quiz_results;

DROP POLICY IF EXISTS "Admins can view all student achievements" ON public.student_achievements;
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.student_achievements;
DROP POLICY IF EXISTS "Users can unlock their own achievements" ON public.student_achievements;

DROP POLICY IF EXISTS "Admins can view all progress" ON public.student_progress;
DROP POLICY IF EXISTS "Users can view their own progress" ON public.student_progress;
DROP POLICY IF EXISTS "Users can manage their own progress" ON public.student_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.student_progress;

-- Step 3: Create new RLS policies using the security definer function

-- Profiles policies (simple, no recursion)
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_admin(auth.uid()));

-- Achievements policies
CREATE POLICY "Everyone can view achievements"
ON public.achievements FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage achievements"
ON public.achievements FOR ALL
USING (public.is_admin(auth.uid()));

-- AI Conversations policies
CREATE POLICY "Users can view their own conversations"
ON public.ai_conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all conversations"
ON public.ai_conversations FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can create their own conversations"
ON public.ai_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
ON public.ai_conversations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
ON public.ai_conversations FOR DELETE
USING (auth.uid() = user_id);

-- Daily Content policies
CREATE POLICY "Published content is viewable by everyone"
ON public.daily_content FOR SELECT
USING (is_published = true OR public.is_admin(auth.uid()));

CREATE POLICY "Only admins can manage content"
ON public.daily_content FOR ALL
USING (public.is_admin(auth.uid()));

-- Questions Bank policies
CREATE POLICY "Students can view questions"
ON public.questions_bank FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage questions"
ON public.questions_bank FOR ALL
USING (public.is_admin(auth.uid()));

-- Quiz Results policies
CREATE POLICY "Users can view their own results"
ON public.quiz_results FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all results"
ON public.quiz_results FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can create their own results"
ON public.quiz_results FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Student Achievements policies
CREATE POLICY "Users can view their own achievements"
ON public.student_achievements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all student achievements"
ON public.student_achievements FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can unlock their own achievements"
ON public.student_achievements FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Student Progress policies
CREATE POLICY "Users can view their own progress"
ON public.student_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
ON public.student_progress FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can manage their own progress"
ON public.student_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.student_progress FOR UPDATE
USING (auth.uid() = user_id);