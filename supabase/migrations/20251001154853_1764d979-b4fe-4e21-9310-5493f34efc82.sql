-- إضافة حقول تفضيلات نوع الاختبار والمسار في جدول profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS test_type_preference test_type DEFAULT 'قدرات',
ADD COLUMN IF NOT EXISTS track_preference academic_track DEFAULT 'عام';