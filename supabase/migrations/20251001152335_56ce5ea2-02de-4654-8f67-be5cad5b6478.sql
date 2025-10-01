-- إضافة أنواع الاختبارات والمسارات
DO $$ BEGIN
  CREATE TYPE test_type AS ENUM ('قدرات', 'تحصيلي');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE academic_track AS ENUM ('عام', 'علمي', 'نظري');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- تحديث جدول daily_content
ALTER TABLE public.daily_content 
ADD COLUMN IF NOT EXISTS test_type test_type DEFAULT 'قدرات',
ADD COLUMN IF NOT EXISTS track academic_track DEFAULT 'عام';

-- تحديث جدول quiz_results
ALTER TABLE public.quiz_results
ADD COLUMN IF NOT EXISTS test_type test_type DEFAULT 'قدرات',
ADD COLUMN IF NOT EXISTS track academic_track DEFAULT 'عام';

-- تحديث enum للمواد لتشمل مواد التحصيلي
ALTER TYPE question_subject ADD VALUE IF NOT EXISTS 'رياضيات';
ALTER TYPE question_subject ADD VALUE IF NOT EXISTS 'فيزياء';
ALTER TYPE question_subject ADD VALUE IF NOT EXISTS 'كيمياء';
ALTER TYPE question_subject ADD VALUE IF NOT EXISTS 'أحياء';
ALTER TYPE question_subject ADD VALUE IF NOT EXISTS 'توحيد';
ALTER TYPE question_subject ADD VALUE IF NOT EXISTS 'فقه';
ALTER TYPE question_subject ADD VALUE IF NOT EXISTS 'حديث';
ALTER TYPE question_subject ADD VALUE IF NOT EXISTS 'نحو';
ALTER TYPE question_subject ADD VALUE IF NOT EXISTS 'بلاغة';
ALTER TYPE question_subject ADD VALUE IF NOT EXISTS 'أدب';
ALTER TYPE question_subject ADD VALUE IF NOT EXISTS 'تاريخ';
ALTER TYPE question_subject ADD VALUE IF NOT EXISTS 'جغرافيا';

-- إضافة تعليق على الجداول
COMMENT ON COLUMN daily_content.test_type IS 'نوع الاختبار: قدرات أو تحصيلي';
COMMENT ON COLUMN daily_content.track IS 'المسار الدراسي: عام (للقدرات)، علمي، أو نظري (للتحصيلي)';
COMMENT ON COLUMN quiz_results.test_type IS 'نوع الاختبار الذي تم إجراؤه';
COMMENT ON COLUMN quiz_results.track IS 'المسار الدراسي للاختبار';