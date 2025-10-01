-- Create enums for structured data
CREATE TYPE user_role AS ENUM ('student', 'admin');
CREATE TYPE question_subject AS ENUM ('math', 'arabic', 'science', 'english', 'logical_reasoning');
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE question_type AS ENUM ('multiple_choice', 'true_false', 'short_answer');
CREATE TYPE conversation_context AS ENUM ('general', 'quiz_help', 'topic_explanation', 'study_plan');

-- 1. Profiles table (معلومات الطلاب)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role DEFAULT 'student' NOT NULL,
  current_day INTEGER DEFAULT 1 CHECK (current_day >= 1 AND current_day <= 30),
  streak_days INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Daily content table (محتوى الـ30 يوم)
CREATE TABLE public.daily_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number INTEGER UNIQUE NOT NULL CHECK (day_number >= 1 AND day_number <= 30),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  content_text TEXT,
  duration_minutes INTEGER NOT NULL,
  topics JSONB DEFAULT '[]'::jsonb,
  learning_objectives TEXT[],
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Questions bank (قاعدة الأسئلة)
CREATE TABLE public.questions_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject question_subject NOT NULL,
  topic TEXT NOT NULL,
  difficulty difficulty_level NOT NULL,
  question_type question_type NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB, -- for multiple choice: {a: "text", b: "text", ...}
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Student progress (تتبع التقدم)
CREATE TABLE public.student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 30),
  content_completed BOOLEAN DEFAULT false,
  exercises_completed BOOLEAN DEFAULT false,
  quiz_completed BOOLEAN DEFAULT false,
  time_spent_minutes INTEGER DEFAULT 0,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, day_number)
);

-- 5. Quiz results (نتائج الاختبارات)
CREATE TABLE public.quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  day_number INTEGER CHECK (day_number >= 1 AND day_number <= 30),
  quiz_type TEXT DEFAULT 'daily', -- daily, practice, final
  questions JSONB NOT NULL, -- array of {question_id, user_answer, is_correct}
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage DECIMAL(5,2) GENERATED ALWAYS AS ((score::DECIMAL / NULLIF(total_questions, 0)) * 100) STORED,
  time_taken_minutes INTEGER,
  strengths TEXT[],
  weaknesses TEXT[],
  completed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. Achievements (الإنجازات)
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  description_ar TEXT,
  icon TEXT NOT NULL, -- emoji or icon name
  requirement_type TEXT NOT NULL, -- streak, score, completion, etc.
  requirement_value INTEGER NOT NULL,
  points INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 7. Student achievements (إنجازات الطلاب)
CREATE TABLE public.student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, achievement_id)
);

-- 8. AI conversations (محادثات الذكاء الاصطناعي)
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  messages JSONB DEFAULT '[]'::jsonb NOT NULL, -- [{role, content, timestamp}]
  context_type conversation_context DEFAULT 'general',
  related_topic TEXT,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_student_progress_user ON public.student_progress(user_id);
CREATE INDEX idx_student_progress_day ON public.student_progress(day_number);
CREATE INDEX idx_quiz_results_user ON public.quiz_results(user_id);
CREATE INDEX idx_quiz_results_day ON public.quiz_results(day_number);
CREATE INDEX idx_questions_subject ON public.questions_bank(subject);
CREATE INDEX idx_questions_difficulty ON public.questions_bank(difficulty);
CREATE INDEX idx_questions_topic ON public.questions_bank(topic);
CREATE INDEX idx_ai_conversations_user ON public.ai_conversations(user_id);
CREATE INDEX idx_student_achievements_user ON public.student_achievements(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_content_updated_at
  BEFORE UPDATE ON public.daily_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_questions_bank_updated_at
  BEFORE UPDATE ON public.questions_bank
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_progress_updated_at
  BEFORE UPDATE ON public.student_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'طالب جديد'),
    'student'
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for daily_content
CREATE POLICY "Published content is viewable by everyone"
  ON public.daily_content FOR SELECT
  USING (is_published = true OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Only admins can manage content"
  ON public.daily_content FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for questions_bank
CREATE POLICY "Admins can manage questions"
  ON public.questions_bank FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Students can view questions"
  ON public.questions_bank FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for student_progress
CREATE POLICY "Users can view their own progress"
  ON public.student_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own progress"
  ON public.student_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.student_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
  ON public.student_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for quiz_results
CREATE POLICY "Users can view their own results"
  ON public.quiz_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own results"
  ON public.quiz_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all results"
  ON public.quiz_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for achievements
CREATE POLICY "Everyone can view achievements"
  ON public.achievements FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage achievements"
  ON public.achievements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for student_achievements
CREATE POLICY "Users can view their own achievements"
  ON public.student_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can unlock their own achievements"
  ON public.student_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all student achievements"
  ON public.student_achievements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for ai_conversations
CREATE POLICY "Users can view their own conversations"
  ON public.ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON public.ai_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON public.ai_conversations FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all conversations"
  ON public.ai_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert some default achievements
INSERT INTO public.achievements (name, name_ar, description, description_ar, icon, requirement_type, requirement_value, points) VALUES
('First Step', 'الخطوة الأولى', 'Complete your first day', 'أكمل يومك الأول', '🎯', 'days_completed', 1, 10),
('Week Warrior', 'محارب الأسبوع', 'Complete 7 days in a row', 'أكمل 7 أيام متتالية', '🔥', 'streak_days', 7, 50),
('Half Way There', 'في منتصف الطريق', 'Complete 15 days', 'أكمل 15 يوم', '⭐', 'days_completed', 15, 100),
('Challenge Master', 'سيد التحدي', 'Complete all 30 days', 'أكمل الـ30 يوم', '🏆', 'days_completed', 30, 500),
('Perfect Score', 'الدرجة الكاملة', 'Get 100% on a quiz', 'احصل على 100% في اختبار', '💯', 'quiz_perfect', 1, 75),
('Quick Learner', 'سريع التعلم', 'Complete 5 quizzes with 90%+', 'أكمل 5 اختبارات بنسبة 90%+', '⚡', 'quiz_high_score', 5, 150);

-- Insert sample daily content for first 5 days
INSERT INTO public.daily_content (day_number, title, description, duration_minutes, topics, learning_objectives, is_published) VALUES
(1, 'مقدمة في الجبر', 'تعرف على أساسيات الجبر والمعادلات البسيطة', 45, '["الجبر", "المعادلات", "الأساسيات"]'::jsonb, ARRAY['فهم المتغيرات', 'حل المعادلات البسيطة', 'التعرف على الثوابت'], true),
(2, 'الأعداد والعمليات', 'مراجعة شاملة للأعداد وأنواعها والعمليات عليها', 45, '["الأعداد", "العمليات الحسابية"]'::jsonb, ARRAY['التمييز بين أنواع الأعداد', 'إجراء العمليات الحسابية', 'حل مسائل متنوعة'], true),
(3, 'الهندسة الأساسية', 'المساحات والمحيطات للأشكال الهندسية', 50, '["الهندسة", "المساحات", "المحيطات"]'::jsonb, ARRAY['حساب مساحات الأشكال', 'حساب المحيطات', 'تطبيق القوانين'], true),
(4, 'النسبة والتناسب', 'فهم وتطبيق النسب والتناسب في المسائل', 40, '["النسبة", "التناسب", "التطبيقات"]'::jsonb, ARRAY['فهم مفهوم النسبة', 'حل مسائل التناسب', 'التطبيق العملي'], true),
(5, 'المعادلات المتقدمة', 'حل المعادلات من الدرجة الأولى والثانية', 55, '["المعادلات", "الدرجة الثانية"]'::jsonb, ARRAY['حل معادلات الدرجة الأولى', 'مقدمة للدرجة الثانية', 'التطبيق العملي'], true);

-- Insert sample questions
INSERT INTO public.questions_bank (subject, topic, difficulty, question_type, question_text, options, correct_answer, explanation, tags) VALUES
('math', 'الجبر', 'easy', 'multiple_choice', 'ما قيمة x في المعادلة: 2x + 5 = 13؟', 
 '{"a": "3", "b": "4", "c": "5", "d": "6"}'::jsonb, 'b', 'نطرح 5 من الطرفين: 2x = 8، ثم نقسم على 2: x = 4', ARRAY['معادلات', 'جبر أساسي']),
 
('math', 'الهندسة', 'medium', 'multiple_choice', 'مساحة مستطيل طوله 8 سم وعرضه 5 سم هي:', 
 '{"a": "13 سم²", "b": "26 سم²", "c": "40 سم²", "d": "80 سم²"}'::jsonb, 'c', 'مساحة المستطيل = الطول × العرض = 8 × 5 = 40 سم²', ARRAY['هندسة', 'مساحات']),
 
('math', 'الأعداد', 'easy', 'multiple_choice', 'ما هو ناتج: 15 × 3 - 10؟', 
 '{"a": "35", "b": "45", "c": "55", "d": "35"}'::jsonb, 'a', 'أولاً: 15 × 3 = 45، ثم: 45 - 10 = 35', ARRAY['عمليات حسابية', 'ترتيب العمليات']),
 
('arabic', 'النحو', 'medium', 'multiple_choice', 'ما إعراب كلمة "طالب" في الجملة: "رأيت طالباً مجتهداً"؟', 
 '{"a": "فاعل", "b": "مفعول به", "c": "مبتدأ", "d": "خبر"}'::jsonb, 'b', 'طالباً مفعول به منصوب وعلامة نصبه الفتحة الظاهرة', ARRAY['إعراب', 'نحو']),
 
('math', 'النسبة والتناسب', 'medium', 'multiple_choice', 'إذا كانت النسبة بين عددين هي 3:4 ومجموعهما 35، فما قيمة العدد الأصغر؟', 
 '{"a": "12", "b": "15", "c": "18", "d": "20"}'::jsonb, 'b', 'نفرض العددين 3x و 4x، إذن: 3x + 4x = 35، 7x = 35، x = 5، العدد الأصغر = 3 × 5 = 15', ARRAY['نسبة', 'تناسب']);
