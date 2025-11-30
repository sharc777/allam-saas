-- السماح لعمود day_number بقبول القيم الفارغة للاختبارات المخصصة وتمارين الضعف
ALTER TABLE daily_exercises ALTER COLUMN day_number DROP NOT NULL;