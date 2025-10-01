-- إنشاء جدول إعدادات الذكاء الاصطناعي
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول قاعدة المعرفة
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'pdf', 'text', 'video'
  content TEXT, -- محتوى مستخرج
  file_url TEXT, -- رابط الملف الأصلي
  related_topics TEXT[], -- المواضيع المرتبطة
  test_type test_type,
  track academic_track,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول لتتبع الأسئلة المولدة
CREATE TABLE IF NOT EXISTS public.generated_questions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  question_hash TEXT NOT NULL, -- hash للسؤال لتجنب التكرار
  question_data JSONB, -- بيانات السؤال الكاملة
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS على الجداول الجديدة
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_questions_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies لـ ai_settings
CREATE POLICY "Everyone can view AI settings"
ON public.ai_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can manage AI settings"
ON public.ai_settings
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- RLS Policies لـ knowledge_base
CREATE POLICY "Everyone can view active knowledge base"
ON public.knowledge_base
FOR SELECT
TO authenticated
USING (is_active = true OR is_admin(auth.uid()));

CREATE POLICY "Only admins can manage knowledge base"
ON public.knowledge_base
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- RLS Policies لـ generated_questions_log
CREATE POLICY "Users can view their own generated questions"
ON public.generated_questions_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generated questions"
ON public.generated_questions_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all generated questions"
ON public.generated_questions_log
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- إضافة triggers لتحديث updated_at
CREATE TRIGGER update_ai_settings_updated_at
BEFORE UPDATE ON public.ai_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at
BEFORE UPDATE ON public.knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- إدخال إعدادات افتراضية للذكاء الاصطناعي
INSERT INTO public.ai_settings (setting_key, setting_value, description) VALUES
('system_prompt', '{"ar": "أنت معلم خبير متخصص في اختبارات القدرات والتحصيلي السعودية. مهمتك مساعدة الطلاب على التعلم والاستعداد للاختبارات بطريقة فعالة ومشجعة."}', 'System prompt للذكاء الاصطناعي'),
('quiz_limits', '{"min_questions": 5, "max_questions": 20, "default_questions": 10, "difficulty_distribution": {"easy": 0.3, "medium": 0.5, "hard": 0.2}}', 'حدود توليد الأسئلة'),
('content_generation_rules', '{"explanation_style": "مبسط وعملي", "include_examples": true, "answer_length": "متوسط", "use_modern_arabic": true}', 'قواعد توليد المحتوى'),
('quiz_generation_temperature', '{"temperature": 0.8, "enable_diversity": true}', 'إعدادات التنويع في الأسئلة')
ON CONFLICT (setting_key) DO NOTHING;