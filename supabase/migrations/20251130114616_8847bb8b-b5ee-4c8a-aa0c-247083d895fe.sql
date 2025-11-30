-- إضافة قيم جديدة لـ enum question_subject
ALTER TYPE question_subject ADD VALUE IF NOT EXISTS 'كمي';
ALTER TYPE question_subject ADD VALUE IF NOT EXISTS 'لفظي';

-- إضافة سياسة RLS للسماح للمستخدمين بإدراج إحصائياتهم الخاصة
CREATE POLICY "Users can insert their own analytics"
ON ai_generation_analytics FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);