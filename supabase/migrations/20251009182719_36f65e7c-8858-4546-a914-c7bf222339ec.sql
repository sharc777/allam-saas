-- حذف السياسة القديمة غير الواضحة
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- إضافة سياسات واضحة ومحددة للأدمن

-- السماح للأدمن بإضافة صلاحيات جديدة
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- السماح للأدمن بتحديث الصلاحيات
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- السماح للأدمن بحذف الصلاحيات
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));