-- إزالة القيد القديم وإضافة قيد جديد يسمح بـ NULL
ALTER TABLE daily_exercises DROP CONSTRAINT IF EXISTS daily_exercises_day_number_check;

-- إضافة قيد جديد: NULL أو قيمة بين 1-30
ALTER TABLE daily_exercises ADD CONSTRAINT daily_exercises_day_number_check 
  CHECK (day_number IS NULL OR (day_number >= 1 AND day_number <= 30));

COMMENT ON CONSTRAINT daily_exercises_day_number_check ON daily_exercises IS 'يسمح بـ NULL للاختبارات المخصصة وتمارين الضعف، أو قيم 1-30 للتمارين اليومية';