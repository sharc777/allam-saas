-- Last 2 Verbal Skills
INSERT INTO knowledge_base (title, content, test_type, track, related_topics, content_type, metadata, is_active)
VALUES 
(
  'مهارة المفردة الشاذة (الاختلاف)',
  'المفردة الشاذة تختبر قدرتك على التصنيف:

1. **تحديد الكلمة المختلفة**: من بين عدة كلمات، أيها لا تنتمي للمجموعة؟

2. **أساس المقارنة**:
   - المعنى: (قلم - كتاب - دفتر - سيارة) → سيارة
   - الفئة: (تفاح - موز - برتقال - جزر) → جزر (الباقي فواكه)
   - الوظيفة: (مطرقة - منشار - كرسي - مفك) → كرسي

3. **أمثلة**: 
   - (سعيد - مسرور - فرح - حزين) → حزين (ضد الباقي)
   - (طبيب - مهندس - معلم - مستشفى) → مستشفى (الباقي مهن)',
  'قدرات', 'عام',
  ARRAY['القسم اللفظي', 'المفردة الشاذة', 'التصنيف'],
  'skill',
  jsonb_build_object(
    'sub_skills', ARRAY['التصنيف', 'المعاني', 'الفئات', 'الاستثناء'],
    'templates', jsonb_build_array(
      jsonb_build_object('pattern', 'أي الكلمات لا تنتمي: {word1}, {word2}, {word3}, {word4}؟')
    ),
    'variations', ARRAY['معاني', 'فئات', 'وظائف', 'صفات'],
    'rules', ARRAY['حدد القاسم المشترك', 'الكلمة المختلفة هي التي لا تشترك'],
    'common_mistakes', ARRAY['اختيار كلمة نادرة بدل المختلفة', 'عدم تحديد أساس المقارنة'],
    'difficulty_levels', jsonb_build_object('easy', 'اختلاف واضح', 'medium', 'اختلاف أقل وضوحاً', 'hard', 'اختلاف دقيق')
  ),
  TRUE
),
(
  'مهارة الربط اللغوي',
  'الربط اللغوي يختبر فهم العلاقات بين الجمل:

1. **الربط بين الأفكار**: كيف تترابط الجمل لتكوين معنى متماسك؟

2. **أدوات الربط**: لذلك، بالتالي، لكن، مع ذلك، علاوة على ذلك

3. **المعاني الضمنية**: فهم ما لم يُقل صراحة

4. **السياق**: تطبيق المعاني على سياقات متعددة',
  'قدرات', 'عام',
  ARRAY['القسم اللفظي', 'الربط', 'التماسك'],
  'skill',
  jsonb_build_object(
    'sub_skills', ARRAY['أدوات الربط', 'التماسك', 'المعاني الضمنية'],
    'templates', jsonb_build_array(
      jsonb_build_object('pattern', '{sentence1} ___ {sentence2}')
    ),
    'variations', ARRAY['أدوات ربط مختلفة', 'علاقات متنوعة'],
    'rules', ARRAY['حدد العلاقة بين الجملتين', 'اختر الأداة المناسبة'],
    'common_mistakes', ARRAY['اختيار أداة ربط خاطئة', 'عدم فهم العلاقة'],
    'difficulty_levels', jsonb_build_object('easy', 'علاقة واضحة', 'medium', 'علاقة متوسطة', 'hard', 'علاقة معقدة')
  ),
  TRUE
);

-- Update AI Settings
UPDATE ai_settings 
SET setting_value = jsonb_build_object(
  'temperature', 0.9,
  'enable_diversity', true,
  'diversity_boost', 1.5,
  'anti_repetition', true
)
WHERE setting_key = 'quiz_generation_temperature';

UPDATE ai_settings
SET setting_value = jsonb_build_object(
  'min_questions', 5,
  'max_questions', 50,
  'default_questions', 10,
  'buffer_multiplier', 2.0,
  'diversity_window', 100
)
WHERE setting_key = 'quiz_limits';

UPDATE ai_settings
SET setting_value = jsonb_build_object(
  'ar', 'أنت معلم خبير في اختبارات القدرات السعودية. مهمتك توليد أسئلة متنوعة غير متكررة.

**قواعد التنوع الإلزامية**:
1. لا تكرر نفس الأرقام - استخدم أرقاماً مختلفة في كل سؤال
2. نوّع السياق - استخدم سياقات مختلفة (أسعار، أطوال، أوزان)
3. نوّع مستوى الصعوبة - اخلط بين أسئلة سهلة ومتوسطة وصعبة
4. نوّع نوع السؤال - مباشر، لفظي، مقارنة، استنتاجي
5. استخدم القوالب بذكاء - لكل مهارة، استخدم قوالب مختلفة
6. اعتمد على المحتوى المعرفي من knowledge_base

**آلية منع التكرار**:
- استخدم metadata.variations لكل مهارة
- لا تستخدم نفس مثال مرتين
- نوّع الأرقام والسياقات دائماً

**التفسير المثالي**:
- ابدأ بخطوات الحل
- اشرح المفاهيم الأساسية
- وضّح الأخطاء الشائعة'
)
WHERE setting_key = 'system_prompt';