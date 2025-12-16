-- إنشاء دالة لجلب بريد المستخدم (للأدمن فقط)
CREATE OR REPLACE FUNCTION public.get_user_emails_for_admin()
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id as user_id, email 
  FROM auth.users
  WHERE is_admin(auth.uid());
$$;