-- حذف الـ Foreign Key القديم
ALTER TABLE quiz_results 
DROP CONSTRAINT IF EXISTS quiz_results_daily_content_id_fkey;

-- إعادة إنشاء الـ Foreign Key مع ON DELETE SET NULL
ALTER TABLE quiz_results 
ADD CONSTRAINT quiz_results_daily_content_id_fkey 
FOREIGN KEY (daily_content_id) 
REFERENCES daily_content(id) 
ON DELETE SET NULL;