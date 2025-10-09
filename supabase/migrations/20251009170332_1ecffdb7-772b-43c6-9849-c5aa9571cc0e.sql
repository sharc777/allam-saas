-- Phase 1: إزالة القيد الفريد الذي يمنع حفظ تمارين متعددة في نفس اليوم
ALTER TABLE daily_exercises 
DROP CONSTRAINT IF EXISTS daily_exercises_user_id_day_number_section_type_test_type_key;

-- إضافة index للأداء (بدون UNIQUE)
CREATE INDEX IF NOT EXISTS idx_daily_exercises_user_day_section 
ON daily_exercises(user_id, day_number, section_type, test_type);

-- إضافة index لتحسين أداء استعلامات السجل
CREATE INDEX IF NOT EXISTS idx_daily_exercises_user_completed 
ON daily_exercises(user_id, completed_at DESC);