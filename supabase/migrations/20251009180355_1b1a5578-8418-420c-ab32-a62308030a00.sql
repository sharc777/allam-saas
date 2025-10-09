-- المرحلة 0: نظام صلاحيات آمن باستخدام user_roles (مُصحح)

-- 1. إنشاء enum للأدوار الجديد
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'student');

-- 2. إنشاء جدول user_roles منفصل (أكثر أماناً)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- 3. تفعيل RLS على user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. إنشاء دالة has_role آمنة (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. نقل الأدوار الموجودة من profiles إلى user_roles
-- فقط admin و student (القيم الموجودة فعلياً)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 
  CASE 
    WHEN role::text = 'admin' THEN 'admin'::app_role
    ELSE 'student'::app_role
  END
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. تحديث دالة is_admin لاستخدام user_roles
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(user_id, 'admin'::app_role)
$$;

-- 7. RLS policies لجدول user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 8. تحديث handle_new_user trigger لإضافة role تلقائياً
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- إنشاء profile
  INSERT INTO public.profiles (id, full_name, role, trial_days, subscription_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'طالب جديد'),
    'student',
    3,
    false
  );
  
  -- إضافة role في user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student'::app_role);
  
  RETURN NEW;
END;
$$;