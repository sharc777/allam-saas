-- إضافة سياسة RLS جديدة للسماح للطلاب برؤية الأسئلة المتاحة في الـ Cache
CREATE POLICY "Students can view available cache questions" 
ON questions_cache
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_used = false 
  AND (reserved_by IS NULL OR reserved_at < (now() - interval '5 minutes'))
);