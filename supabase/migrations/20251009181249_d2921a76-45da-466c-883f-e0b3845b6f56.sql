-- المرحلة 3: نظام إدارة الباقات

-- إنشاء جدول الباقات
CREATE TABLE IF NOT EXISTS public.subscription_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- مثال: {"daily_quizzes": 10, "practice_quizzes": 50, "ai_tutoring_hours": 2}
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- تفعيل RLS
ALTER TABLE public.subscription_packages ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بعرض الباقات النشطة
CREATE POLICY "Everyone can view active packages"
ON public.subscription_packages
FOR SELECT
USING (is_active = true);

-- فقط الـ admin يمكنه إدارة الباقات
CREATE POLICY "Admins can manage packages"
ON public.subscription_packages
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- إضافة حقول الباقة لجدول profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.subscription_packages(id),
ADD COLUMN IF NOT EXISTS package_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS package_end_date TIMESTAMPTZ;

-- إنشاء trigger لتحديث updated_at
CREATE TRIGGER update_subscription_packages_updated_at
BEFORE UPDATE ON public.subscription_packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- إدراج باقات تجريبية
INSERT INTO public.subscription_packages (name_ar, name_en, description_ar, price_monthly, price_yearly, features, limits, is_active, is_featured, display_order)
VALUES 
(
  'الباقة المجانية',
  'Free Plan',
  'باقة تجريبية محدودة للبدء',
  0,
  0,
  '["10 اختبارات يومية", "دروس أساسية", "دعم المجتمع"]'::jsonb,
  '{"daily_quizzes": 10, "practice_quizzes": 20, "ai_tutoring_minutes": 0}'::jsonb,
  true,
  false,
  0
),
(
  'الباقة الأساسية',
  'Basic Plan',
  'باقة مناسبة للطلاب المبتدئين',
  49.99,
  499.99,
  '["50 اختبار يومي", "جميع الدروس", "30 دقيقة مع المعلم الذكي", "تقارير أساسية", "دعم فني"]'::jsonb,
  '{"daily_quizzes": 50, "practice_quizzes": 100, "ai_tutoring_minutes": 30}'::jsonb,
  true,
  false,
  1
),
(
  'الباقة الذهبية',
  'Gold Plan',
  'باقة متقدمة مع ميزات إضافية',
  99.99,
  999.99,
  '["اختبارات غير محدودة", "جميع الدروس المتقدمة", "3 ساعات مع المعلم الذكي", "تقارير تفصيلية", "أولوية في الدعم", "خطة دراسية مخصصة"]'::jsonb,
  '{"daily_quizzes": -1, "practice_quizzes": -1, "ai_tutoring_minutes": 180}'::jsonb,
  true,
  true,
  2
),
(
  'الباقة البلاتينية',
  'Platinum Plan',
  'باقة شاملة للطلاب الجادين',
  149.99,
  1499.99,
  '["كل ميزات الباقة الذهبية", "5 ساعات مع المعلم الذكي", "جلسات فردية مع معلم بشري", "تحليل شامل للأداء", "محتوى حصري", "دعم 24/7"]'::jsonb,
  '{"daily_quizzes": -1, "practice_quizzes": -1, "ai_tutoring_minutes": 300, "human_tutor_sessions": 4}'::jsonb,
  true,
  true,
  3
);