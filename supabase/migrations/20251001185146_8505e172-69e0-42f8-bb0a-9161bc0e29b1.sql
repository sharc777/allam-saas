-- إضافة أعمدة جديدة لربط الاختبارات بالمحتوى اليومي
ALTER TABLE quiz_results 
ADD COLUMN IF NOT EXISTS daily_content_id UUID REFERENCES daily_content(id),
ADD COLUMN IF NOT EXISTS quiz_mode TEXT DEFAULT 'daily' CHECK (quiz_mode IN ('daily', 'practice', 'topic'));

-- إضافة فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_quiz_results_daily_content 
ON quiz_results(daily_content_id) 
WHERE daily_content_id IS NOT NULL;

-- إضافة فهرس مركب للبحث السريع
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_content 
ON quiz_results(user_id, daily_content_id);