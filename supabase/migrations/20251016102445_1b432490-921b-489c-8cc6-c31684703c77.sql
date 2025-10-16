-- ============= Phase 1: Create Infrastructure Tables =============

-- Table for skills taxonomy (organizational structure)
CREATE TABLE IF NOT EXISTS skills_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name TEXT NOT NULL,
  skill_name_en TEXT,
  category TEXT NOT NULL CHECK (category IN ('كمي', 'لفظي')),
  test_type test_type NOT NULL,
  parent_skill_id UUID REFERENCES skills_taxonomy(id),
  sub_skills JSONB DEFAULT '[]'::jsonb,
  learning_order INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for AI generation analytics (monitoring)
CREATE TABLE IF NOT EXISTS ai_generation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  skill_id UUID REFERENCES knowledge_base(id),
  questions_generated INTEGER,
  questions_unique INTEGER,
  diversity_score NUMERIC,
  quality_score NUMERIC,
  generation_time_ms INTEGER,
  model_used TEXT,
  temperature NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE skills_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view skills taxonomy"
  ON skills_taxonomy FOR SELECT USING (TRUE);

CREATE POLICY "Only admins can manage skills taxonomy"
  ON skills_taxonomy FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own analytics"
  ON ai_generation_analytics FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all analytics"
  ON ai_generation_analytics FOR SELECT USING (is_admin(auth.uid()));

-- ============= Phase 2: Insert Quantitative Skills (القسم الكمي) =============

-- Skill 1: العمليات الحسابية الأساسية
INSERT INTO knowledge_base (title, content, test_type, track, related_topics, content_type, metadata, is_active)
VALUES (
  'العمليات الحسابية الأساسية',
  'تشمل هذه المهارة الأساسيات الرياضية الضرورية لاختبار القدرات:

1. **الجمع والطرح**: للأعداد الصحيحة والعشرية والكسور
   - مثال: 23.5 + 17.8 = 41.3
   - مثال: 1/2 + 3/4 = 2/4 + 3/4 = 5/4

2. **الضرب والقسمة**: للأعداد الصحيحة والعشرية والكسور
   - مثال: 15 × 0.6 = 9
   - مثال: (2/3) ÷ (4/5) = (2/3) × (5/4) = 10/12 = 5/6

3. **تبسيط الكسور وتحويلها**: بين الصور العادية والعشرية والنسب المئوية
   - مثال: 3/4 = 0.75 = 75%
   - مثال: 60% = 0.6 = 3/5

4. **القوى والجذور**: 
   - مثال: 2³ = 8
   - مثال: √16 = 4
   - مثال: خانة الآحاد في 7⁵ = خانة الآحاد في 7 (النمط: 7،9،3،1 يتكرر)

5. **النسب المئوية**: زيادة، نقصان، مقارنة الأسعار، الربح والخسارة
   - مثال زيادة: إذا زاد السعر 20%، والسعر الأصلي 100 ريال، السعر الجديد = 100 × 1.20 = 120 ريال
   - مثال نقصان: إذا نقص السعر 15%، والسعر الأصلي 200 ريال، السعر الجديد = 200 × 0.85 = 170 ريال
   - مثال ربح: إذا اشترى تاجر سلعة بـ 80 ريال وباعها بـ 100 ريال، نسبة الربح = [(100-80)/80] × 100 = 25%',
  'قدرات',
  'عام',
  ARRAY['القسم الكمي', 'العمليات الحسابية', 'الحساب', 'الكسور', 'النسب المئوية'],
  'skill',
  jsonb_build_object(
    'sub_skills', ARRAY['الجمع والطرح', 'الضرب والقسمة', 'تبسيط الكسور', 'القوى والجذور', 'النسب المئوية'],
    'templates', jsonb_build_array(
      jsonb_build_object('pattern', 'احسب ناتج {operation} للأعداد {numbers}', 'variables', jsonb_build_object('operation', ARRAY['جمع', 'طرح', 'ضرب', 'قسمة'], 'numbers', 'random')),
      jsonb_build_object('pattern', 'إذا {condition}، فما قيمة {target}؟', 'variables', jsonb_build_object('condition', ARRAY['زاد السعر', 'نقص العدد', 'تضاعف الكمية'], 'target', ARRAY['السعر الجديد', 'العدد المتبقي', 'الكمية النهائية'])),
      jsonb_build_object('pattern', 'ما هي نسبة {part} من {whole}؟', 'variables', jsonb_build_object('part', 'random', 'whole', 'random'))
    ),
    'variations', ARRAY['تغيير الأرقام', 'تغيير السياق (ريال/متر/كيلو)', 'عكس السؤال', 'إضافة خطوات متعددة', 'استخدام كسور وأعداد عشرية'],
    'rules', ARRAY[
      'عند جمع الكسور، وحّد المقامات أولاً',
      'النسبة المئوية = (الجزء / الكل) × 100',
      'الزيادة بنسبة x% = الأصل × (1 + x/100)',
      'النقصان بنسبة x% = الأصل × (1 - x/100)',
      'عند ضرب القوى بنفس الأساس: aⁿ × aᵐ = aⁿ⁺ᵐ'
    ],
    'common_mistakes', ARRAY[
      'جمع الكسور دون توحيد المقامات',
      'الخلط بين زيادة ونقصان النسبة',
      'نسيان تبسيط الكسور',
      'حساب نسبة التغيير من القيمة الجديدة بدلاً من القديمة'
    ],
    'difficulty_levels', jsonb_build_object(
      'easy', 'عمليات بسيطة بأعداد صغيرة - مثال: 1/2 + 1/4',
      'medium', 'عمليات متعددة الخطوات - مثال: إذا زاد سعر 120 ريال بنسبة 25% ثم نقص 20%',
      'hard', 'مسائل لفظية معقدة - مثال: تاجر اشترى سلعة وباعها بربح 30%، ثم اشترى أخرى بنفس سعر البيع وباعها بخسارة 20%، ما صافي ربحه؟'
    )
  ),
  TRUE
);

-- Skill 2: مهارات الكسور
INSERT INTO knowledge_base (title, content, test_type, track, related_topics, content_type, metadata, is_active)
VALUES (
  'مهارات الكسور',
  'الكسور من أهم المهارات الرياضية في اختبار القدرات:

1. **جمع وطرح الكسور**:
   - المقامات متساوية: 2/5 + 1/5 = 3/5
   - المقامات مختلفة: 1/3 + 1/4 = 4/12 + 3/12 = 7/12
   - أعداد كسرية: 2(1/2) + 1(3/4) = 2 + 1 + 1/2 + 3/4 = 3 + 2/4 + 3/4 = 4(1/4)

2. **ضرب الكسور**:
   - مباشر: (2/3) × (3/4) = 6/12 = 1/2
   - بالاختصار: (4/9) × (3/8) = (4÷4)/(9÷3) × (3÷3)/(8÷4) = 1/6
   - مع أعداد كسرية: 2(1/2) × 3 = (5/2) × 3 = 15/2 = 7(1/2)

3. **قسمة الكسور**:
   - قلب الكسر الثاني واضرب: (2/3) ÷ (4/5) = (2/3) × (5/4) = 10/12 = 5/6
   - مع أعداد صحيحة: 6 ÷ (2/3) = 6 × (3/2) = 18/2 = 9

4. **تبسيط الكسور**:
   - إيجاد القاسم المشترك الأكبر: 12/18 = (12÷6)/(18÷6) = 2/3
   - تحويل لأعداد كسرية: 17/5 = 3(2/5)

5. **التمثيل على خط الأعداد**:
   - ترتيب الكسور: 1/4 < 1/3 < 1/2 < 2/3 < 3/4
   - المقارنة: أيهما أكبر 2/3 أم 3/5؟ → 10/15 > 9/15 → 2/3 أكبر',
  'قدرات',
  'عام',
  ARRAY['القسم الكمي', 'الكسور', 'العمليات الحسابية'],
  'skill',
  jsonb_build_object(
    'sub_skills', ARRAY['جمع وطرح الكسور', 'ضرب الكسور', 'قسمة الكسور', 'تبسيط الكسور', 'مقارنة الكسور'],
    'templates', jsonb_build_array(
      jsonb_build_object('pattern', 'احسب: {fraction1} {op} {fraction2}', 'variables', jsonb_build_object('op', ARRAY['+', '-', '×', '÷'])),
      jsonb_build_object('pattern', 'قارن بين {fraction1} و {fraction2}، أيهما أكبر؟'),
      jsonb_build_object('pattern', 'بسّط الكسر {fraction}'),
      jsonb_build_object('pattern', 'حوّل {improper_fraction} إلى عدد كسري'),
      jsonb_build_object('pattern', 'إذا أكل شخص {fraction1} من كعكة وآخر {fraction2}، كم تبقى؟')
    ),
    'variations', ARRAY['استخدام مقامات مختلفة', 'أعداد كسرية', 'كسور عشرية', 'مسائل لفظية', 'اختصار قبل الضرب'],
    'rules', ARRAY[
      'لجمع الكسور: وحّد المقامات ثم اجمع البسطات',
      'لضرب الكسور: اضرب البسط في البسط والمقام في المقام',
      'لقسمة الكسور: اقلب الكسر الثاني واضرب',
      'لتبسيط: اقسم البسط والمقام على القاسم المشترك الأكبر',
      'المقام الأكبر يعني كسر أصغر (إذا كان البسط متساوي)'
    ],
    'common_mistakes', ARRAY[
      'جمع الكسور دون توحيد المقامات',
      'ضرب المقامات عند الجمع',
      'نسيان قلب الكسر عند القسمة',
      'عدم تبسيط النتيجة النهائية',
      'الخطأ في تحويل الأعداد الكسرية'
    ],
    'difficulty_levels', jsonb_build_object(
      'easy', 'كسور بمقامات متساوية - 2/5 + 1/5',
      'medium', 'كسور بمقامات مختلفة - 2/3 + 3/4',
      'hard', 'عمليات متعددة مع أعداد كسرية - 2(1/3) × 1(1/2) ÷ 3(1/4)'
    )
  ),
  TRUE
);

-- Skill 3: النسب والتناسب
INSERT INTO knowledge_base (title, content, test_type, track, related_topics, content_type, metadata, is_active)
VALUES (
  'مهارات النسب والتناسب',
  'النسب والتناسب أداة قوية لحل مسائل المقارنات والعلاقات:

1. **النسبة**: مقارنة بين عددين
   - مثال: نسبة الذكور للإناث 3:2 (أو 3/2)
   - يمكن تكبير النسبة: 3:2 = 6:4 = 9:6

2. **التناسب**: تساوي نسبتين
   - مثال: إذا كان 3/4 = x/12، فإن x = 9
   - الضرب التبادلي: a/b = c/d → a×d = b×c

3. **التوزيع بالنسبة**:
   - مثال: وزّع 100 ريال بنسبة 2:3
   - مجموع الأجزاء = 2+3 = 5
   - الجزء الأول = 100 × (2/5) = 40
   - الجزء الثاني = 100 × (3/5) = 60

4. **مسائل المعدل والسرعة**:
   - المعدل = المجموع / العدد
   - السرعة = المسافة / الزمن
   - مثال: إذا قطع قطار 300 كم في 4 ساعات، السرعة = 75 كم/س

5. **مسائل لفظية على النسب**:
   - مثال: إذا كانت نسبة الماء للعصير 2:3 في مشروب حجمه 500 مل، كم كمية الماء؟
   - الحل: مجموع الأجزاء = 5، الماء = 500 × (2/5) = 200 مل',
  'قدرات',
  'عام',
  ARRAY['القسم الكمي', 'النسب', 'التناسب', 'المعدل', 'السرعة'],
  'skill',
  jsonb_build_object(
    'sub_skills', ARRAY['النسب البسيطة', 'التناسب', 'التوزيع بالنسبة', 'المعدل', 'السرعة والزمن'],
    'templates', jsonb_build_array(
      jsonb_build_object('pattern', 'إذا كانت النسبة بين a وb هي {ratio}، وكانت قيمة a = {value}، فما قيمة b؟'),
      jsonb_build_object('pattern', 'وزّع {amount} بنسبة {ratio}'),
      jsonb_build_object('pattern', 'إذا قطع {vehicle} مسافة {distance} في {time}، فما سرعته؟'),
      jsonb_build_object('pattern', 'معدل {quantity} لـ {count} {items} هو {rate}، فكم {quantity} لـ {new_count} {items}؟')
    ),
    'variations', ARRAY['نسب بأكثر من جزأين (2:3:5)', 'نسب مئوية', 'تناسب طردي وعكسي', 'معدلات مركبة', 'مقارنة سرعات'],
    'rules', ARRAY[
      'النسبة = الجزء الأول / الجزء الثاني',
      'في التناسب الطردي: كلما زاد أحدهما زاد الآخر',
      'في التناسب العكسي: كلما زاد أحدهما نقص الآخر',
      'السرعة = المسافة ÷ الزمن',
      'لتوزيع بنسبة: احسب مجموع الأجزاء ثم اضرب كل جزء في (الكل / المجموع)'
    ],
    'common_mistakes', ARRAY[
      'الخلط بين النسبة والتناسب',
      'نسيان جمع أجزاء النسبة عند التوزيع',
      'عدم مراعاة وحدات القياس في السرعة',
      'الخطأ في الضرب التبادلي'
    ],
    'difficulty_levels', jsonb_build_object(
      'easy', 'نسبة بسيطة أو تناسب مباشر',
      'medium', 'توزيع بالنسبة أو حساب معدل',
      'hard', 'مسائل مركبة تجمع عدة مفاهيم - نسب متتالية أو تناسب عكسي'
    )
  ),
  TRUE
);

-- Skill 4: الجبر والمعادلات
INSERT INTO knowledge_base (title, content, test_type, track, related_topics, content_type, metadata, is_active)
VALUES (
  'مهارات الجبر والتعابير والمتباينات',
  'الجبر أداة لحل المسائل باستخدام المتغيرات والمعادلات:

1. **تبسيط التعابير الجبرية**:
   - جمع الحدود المتشابهة: 3x + 5x - 2x = 6x
   - فك الأقواس: 2(x+3) = 2x + 6
   - الضرب: (x+2)(x+3) = x² + 5x + 6

2. **حل المعادلات الخطية**:
   - معادلة بمجهول واحد: 2x + 5 = 13 → 2x = 8 → x = 4
   - معادلة بخطوتين: 3(x-2) = 15 → x-2 = 5 → x = 7
   - معادلتان بمجهولين: x+y=10، x-y=2 → بالجمع: 2x=12 → x=6، y=4

3. **المتباينات**:
   - حل: 2x + 3 < 11 → 2x < 8 → x < 4
   - عند الضرب أو القسمة بعدد سالب، اقلب إشارة المتباينة
   - مثال: -2x > 6 → x < -3
   - التمثيل على خط الأعداد: x < 4 → دائرة مفرغة عند 4 وخط لليسار

4. **المعادلات التربيعية**:
   - الصورة القياسية: ax² + bx + c = 0
   - التحليل: x² - 5x + 6 = 0 → (x-2)(x-3) = 0 → x=2 أو x=3
   - القانون العام: x = [-b ± √(b²-4ac)] / 2a

5. **مسائل لفظية**:
   - مثال: مجموع عددين 20 والفرق بينهما 4، ما العددان؟
   - الحل: x+y=20، x-y=4 → x=12، y=8',
  'قدرات',
  'عام',
  ARRAY['القسم الكمي', 'الجبر', 'المعادلات', 'المتباينات'],
  'skill',
  jsonb_build_object(
    'sub_skills', ARRAY['تبسيط التعابير', 'المعادلات الخطية', 'المتباينات', 'المعادلات التربيعية', 'مسائل لفظية جبرية'],
    'templates', jsonb_build_array(
      jsonb_build_object('pattern', 'بسّط: {expression}'),
      jsonb_build_object('pattern', 'حل المعادلة: {equation} = 0'),
      jsonb_build_object('pattern', 'حل المتباينة: {inequality}'),
      jsonb_build_object('pattern', 'إذا كان {condition1} و {condition2}، فما قيمة {variable}؟'),
      jsonb_build_object('pattern', 'مجموع عددين {sum} والفرق بينهما {diff}، ما العددان؟')
    ),
    'variations', ARRAY['معادلات بكسور', 'معادلات بأقواس متعددة', 'متباينات مركبة', 'معادلات تربيعية', 'أنظمة معادلات'],
    'rules', ARRAY[
      'ما تفعله بطرف افعله بالطرف الآخر',
      'اجمع الحدود المتشابهة فقط',
      'عند ضرب متباينة بعدد سالب، اقلب الإشارة',
      'في المعادلة التربيعية: المجموع = -b/a والضرب = c/a',
      'لحل معادلتين: استخدم الجمع أو الطرح أو التعويض'
    ],
    'common_mistakes', ARRAY[
      'نسيان تطبيق العملية على الطرفين',
      'الخطأ في جمع حدود غير متشابهة',
      'نسيان قلب إشارة المتباينة عند الضرب بسالب',
      'الخطأ في فك الأقواس',
      'نسيان حلول المعادلة التربيعية'
    ],
    'difficulty_levels', jsonb_build_object(
      'easy', 'معادلة خطية بسيطة - x+5=12',
      'medium', 'معادلة بأقواس أو متباينة - 2(x-3)>10',
      'hard', 'معادلة تربيعية أو نظام معادلتين'
    )
  ),
  TRUE
);

-- Skill 5: الهندسة والمجسمات
INSERT INTO knowledge_base (title, content, test_type, track, related_topics, content_type, metadata, is_active)
VALUES (
  'مهارات الهندسة والمجسمات',
  'الهندسة تتعلق بالأشكال والمساحات والحجوم:

1. **المحيط والمساحة**:
   - المربع: محيط = 4×الضلع، مساحة = الضلع²
   - المستطيل: محيط = 2(الطول+العرض)، مساحة = الطول×العرض
   - المثلث: محيط = مجموع الأضلاع، مساحة = ½×القاعدة×الارتفاع
   - الدائرة: محيط = 2πr، مساحة = πr²

2. **حجم المجسمات**:
   - المكعب: حجم = الضلع³، مساحة السطح = 6×الضلع²
   - متوازي المستطيلات: حجم = الطول×العرض×الارتفاع
   - المنشور: حجم = مساحة القاعدة × الارتفاع
   - الأسطوانة: حجم = πr²h

3. **الزوايا**:
   - الزاوية القائمة = 90°
   - الزاوية المستقيمة = 180°
   - الزاوية الحادة < 90°
   - الزاوية المنفرجة > 90° و < 180°
   - مجموع زوايا المثلث = 180°
   - مجموع زوايا المضلع = (n-2)×180° حيث n عدد الأضلاع

4. **خصائص الأشكال**:
   - المثلث متساوي الأضلاع: جميع زواياه 60°
   - المثلث متساوي الساقين: زاويتان متساويتان
   - المثلث القائم: نظرية فيثاغورس a²+b²=c²
   - المربع: جميع أضلاعه متساوية وزواياه قائمة

5. **التحويلات الهندسية**:
   - الانعكاس: مرآة حول محور
   - الدوران: حول نقطة بزاوية محددة
   - الانتقال: تحريك بدون دوران',
  'قدرات',
  'عام',
  ARRAY['القسم الكمي', 'الهندسة', 'المساحة', 'الحجم', 'الزوايا'],
  'skill',
  jsonb_build_object(
    'sub_skills', ARRAY['المحيط والمساحة', 'حجم المجسمات', 'الزوايا', 'خصائص الأشكال', 'التحويلات الهندسية'],
    'templates', jsonb_build_array(
      jsonb_build_object('pattern', 'مربع طول ضلعه {side} سم، ما {question}؟', 'variables', jsonb_build_object('question', ARRAY['محيطه', 'مساحته'])),
      jsonb_build_object('pattern', 'مستطيل طوله {length} وعرضه {width}، ما {question}؟'),
      jsonb_build_object('pattern', 'في مثلث قائم، طولا الضلعين {a} و{b}، ما طول الوتر؟'),
      jsonb_build_object('pattern', 'مكعب حجمه {volume}، ما طول ضلعه؟'),
      jsonb_build_object('pattern', 'في مثلث، زاويتان قياسهما {angle1}° و{angle2}°، ما قياس الزاوية الثالثة؟')
    ),
    'variations', ARRAY['أشكال مركبة', 'مقارنة مساحات', 'نسبة بين محيط ومساحة', 'حجم أشكال غير منتظمة', 'تطبيقات حياتية'],
    'rules', ARRAY[
      'π تقريباً = 3.14 أو 22/7',
      'نظرية فيثاغورس: a²+b²=c² (للمثلث القائم)',
      'مساحة أي مثلث = ½×القاعدة×الارتفاع',
      'حجم أي منشور = مساحة القاعدة × الارتفاع',
      'مجموع زوايا أي مثلث = 180°'
    ],
    'common_mistakes', ARRAY[
      'الخلط بين المحيط والمساحة',
      'نسيان تربيع نصف القطر في مساحة الدائرة',
      'استخدام القطر بدلاً من نصف القطر',
      'الخطأ في تطبيق فيثاغورس',
      'نسيان تحويل الوحدات'
    ],
    'difficulty_levels', jsonb_build_object(
      'easy', 'حساب مباشر للمحيط أو المساحة',
      'medium', 'استخدام نظرية فيثاغورس أو أشكال مركبة',
      'hard', 'مسائل لفظية معقدة أو حجوم مركبة'
    )
  ),
  TRUE
);

-- Continue with remaining skills in next part...
-- (Due to length, I'll add the remaining 2 quantitative and 6 verbal skills in the execution)