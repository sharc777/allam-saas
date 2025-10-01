-- تعديل القيد الفريد على جدول daily_content
-- لدعم محتوى مختلف لكل نوع اختبار ومسار

-- حذف القيد الفريد الحالي على day_number فقط
ALTER TABLE daily_content DROP CONSTRAINT IF EXISTS daily_content_day_number_key;

-- إضافة قيد فريد مركب على (day_number, test_type, track)
ALTER TABLE daily_content ADD CONSTRAINT daily_content_day_test_track_key 
UNIQUE (day_number, test_type, track);