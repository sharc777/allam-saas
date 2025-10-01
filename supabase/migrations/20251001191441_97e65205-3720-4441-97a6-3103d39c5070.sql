-- المرحلة 2: تنظيف البيانات القديمة وإصلاح حالات الإكمال الخاطئة
-- تحديث student_progress لجعل content_completed و quiz_completed = false
-- للدروس التي لم تحقق الحد الأدنى من النجاح (70%)

UPDATE student_progress sp
SET 
  content_completed = false,
  quiz_completed = false,
  completed_at = NULL
WHERE EXISTS (
  SELECT 1 
  FROM quiz_results qr
  WHERE qr.user_id = sp.user_id 
    AND qr.day_number = sp.day_number
    AND (qr.percentage IS NULL OR qr.percentage < 70)
)
OR NOT EXISTS (
  -- أيضاً، تعيين false للدروس التي ليس لها نتائج اختبار على الإطلاق
  SELECT 1 
  FROM quiz_results qr
  WHERE qr.user_id = sp.user_id 
    AND qr.day_number = sp.day_number
);

-- تعليق: هذا سيضمن أن جميع الدروس المكتملة فقط هي التي حققت نجاحاً فعلياً في الاختبار