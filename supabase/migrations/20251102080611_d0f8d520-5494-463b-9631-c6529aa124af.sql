-- ====================================
-- Migration: توحيد الموقع لاختبار القدرات فقط
-- ====================================

-- 1. إزالة track_preference من جدول profiles (خاص بالتحصيلي)
ALTER TABLE profiles DROP COLUMN IF EXISTS track_preference;

-- 2. تحديث test_type_preference ليكون دائماً "قدرات"
UPDATE profiles 
SET test_type_preference = 'قدرات'::test_type
WHERE test_type_preference != 'قدرات'::test_type;

-- 3. تحديث preferred_sections ليكون ثابت على ["كمي", "لفظي"]
UPDATE profiles 
SET preferred_sections = '["كمي", "لفظي"]'::jsonb
WHERE preferred_sections IS NULL 
   OR preferred_sections::text != '["كمي", "لفظي"]';

-- 4. تحديث daily_exercises_count لتبسيط الهيكل
UPDATE profiles 
SET daily_exercises_count = '{"كمي": 0, "لفظي": 0, "last_reset": null}'::jsonb
WHERE daily_exercises_count IS NULL;

-- 5. تحديث جميع التمارين اليومية لتكون قدرات
UPDATE daily_exercises 
SET test_type = 'قدرات'::test_type
WHERE test_type != 'قدرات'::test_type;

-- 6. تحديث أداء الطلاب
UPDATE student_performance 
SET test_type = 'قدرات'::test_type
WHERE test_type != 'قدرات'::test_type;

-- 7. تحديث نتائج الاختبارات
UPDATE quiz_results 
SET test_type = 'قدرات'::test_type
WHERE test_type != 'قدرات'::test_type;

-- 8. تحديث التقييمات الأولية
UPDATE initial_assessments 
SET test_type = 'قدرات'::test_type
WHERE test_type != 'قدرات'::test_type;

-- 9. تحديث كاش الأسئلة
UPDATE questions_cache 
SET test_type = 'قدرات'::test_type
WHERE test_type != 'قدرات'::test_type;

-- 10. تحديث المحتوى اليومي
UPDATE daily_content 
SET test_type = 'قدرات'::test_type
WHERE test_type != 'قدرات'::test_type;

-- 11. تحديث قاعدة المعرفة
UPDATE knowledge_base 
SET test_type = 'قدرات'::test_type
WHERE test_type != 'قدرات'::test_type OR test_type IS NULL;

-- 12. إزالة عمود track من جميع الجداول
ALTER TABLE daily_exercises DROP COLUMN IF EXISTS track;
ALTER TABLE quiz_results DROP COLUMN IF EXISTS track;
ALTER TABLE initial_assessments DROP COLUMN IF EXISTS track;
ALTER TABLE student_performance DROP COLUMN IF EXISTS track;
ALTER TABLE questions_cache DROP COLUMN IF EXISTS track;
ALTER TABLE daily_content DROP COLUMN IF EXISTS track;
ALTER TABLE knowledge_base DROP COLUMN IF EXISTS track;