
# خطة تحسين عرض الرياضيات بالكسور العمودية والرموز العربية

## الهدف
تحويل عرض الكسور من الشكل الأفقي (`2/3`) إلى الشكل العمودي كما في الصورة المرفقة (بسط فوق مقام مع خط أفقي بينهما).

---

## التحليل الحالي

### الوضع الحالي:
- المشروع يستخدم **KaTeX** مع `remarkMath` و `rehypeKatex`
- الكسور تُعرض كـ `2/3` أو `⅔` (Unicode)
- AI لا يكتب بصيغة LaTeX (`$\frac{2}{3}$`)

### المطلوب:
```
    2      11
   ─── + ────
    3       5
```

---

## خطة التنفيذ

### المرحلة 1: تحديث prompts الذكاء الاصطناعي

**الملفات المتأثرة:**
- `supabase/functions/ai-tutor/index.ts`
- `supabase/functions/_shared/advancedPromptBuilder.ts`
- `supabase/functions/generate-quiz/index.ts`

**التغييرات:**
إضافة قواعد كتابة الكسور بصيغة LaTeX:

```typescript
const MATH_FORMATTING_RULES = `
## قواعد الكسور (مهم جداً):
- اكتب الكسور بصيغة LaTeX داخل علامات الدولار
- ❌ خطأ: 2/3, ⅔, 1/2
- ✅ صحيح: $\\frac{2}{3}$, $\\frac{1}{2}$

### أمثلة:
- "اجمع $\\frac{2}{3} + \\frac{11}{5}$"
- "الناتج هو $\\frac{7}{12}$"
- "اضرب $\\frac{3}{4} \\times \\frac{2}{5}$"

### للأعداد الكسرية:
- ❌ خطأ: 2 1/2
- ✅ صحيح: $2\\frac{1}{2}$ أو $\\frac{5}{2}$

### الجذور:
- ❌ خطأ: √4, sqrt(4)
- ✅ صحيح: $\\sqrt{4}$, $\\sqrt[3]{8}$

### الأسس:
- ❌ خطأ: x^2, س²
- ✅ صحيح: $x^2$, $س^2$
`;
```

---

### المرحلة 2: إنشاء مكون Fraction للعرض

**ملف جديد:** `src/components/ui/MathFraction.tsx`

```typescript
interface FractionProps {
  numerator: string | number;   // البسط
  denominator: string | number; // المقام
  className?: string;
}

export function MathFraction({ numerator, denominator, className }: FractionProps) {
  return (
    <span className={`inline-flex flex-col items-center mx-1 ${className}`}>
      <span className="border-b border-current px-1">{numerator}</span>
      <span className="px-1">{denominator}</span>
    </span>
  );
}
```

---

### المرحلة 3: تحديث mathFormatter.ts

**تحويل الكسور النصية إلى LaTeX:**

```typescript
/**
 * تحويل الكسور إلى صيغة LaTeX
 * مثال: 2/3 → $\frac{2}{3}$
 */
export function formatFractionsToLatex(text: string): string {
  if (!text) return text;
  
  // تحويل الكسور البسيطة مثل 2/3
  // (?<!\$) = ليس مسبوق بـ $
  // (?!\}) = ليس متبوع بـ }
  const fractionRegex = /(?<!\$|\\frac\{)(\d+)\/(\d+)(?!\})/g;
  
  return text.replace(fractionRegex, (_, num, den) => {
    return `$\\frac{${num}}{${den}}$`;
  });
}
```

---

### المرحلة 4: تحسين تنسيقات CSS لـ KaTeX

**الملف:** `src/index.css`

```css
/* تحسين عرض الكسور */
.katex .frac-line {
  border-color: currentColor;
  min-width: 0.8em;
}

/* زيادة حجم الكسور للوضوح */
.katex .mfrac .frac-line {
  border-bottom-width: 0.08em;
}

/* تباعد أفضل للبسط والمقام */
.katex .mfrac .numerator {
  padding-bottom: 0.15em;
}

.katex .mfrac .denominator {
  padding-top: 0.15em;
}

/* دعم RTL للمعادلات */
.katex-display,
.katex {
  direction: ltr;
  unicode-bidi: isolate;
}

/* تكبير الخط للمعادلات */
.katex {
  font-size: 1.15em;
}
```

---

### المرحلة 5: تحديث MessageContent.tsx

**إضافة معالجة الكسور قبل العرض:**

```typescript
import { formatFractionsToLatex } from '@/lib/mathFormatter';

const MessageContent = ({ content, role }: MessageContentProps) => {
  const formattedContent = useMemo(() => {
    let result = content;
    
    // تحويل الكسور إلى LaTeX
    result = formatFractionsToLatex(result);
    
    // تحويل الأسس والرموز
    result = formatMathText(result);
    
    return result;
  }, [content]);
  
  // ... باقي الكود
};
```

---

## ملخص الملفات المتأثرة

| الملف | التغيير | الأولوية |
|-------|---------|----------|
| `supabase/functions/ai-tutor/index.ts` | إضافة قواعد LaTeX للكسور | عالية |
| `supabase/functions/_shared/advancedPromptBuilder.ts` | تحديث MATH_FORMATTING_RULES | عالية |
| `supabase/functions/generate-quiz/index.ts` | إضافة قواعد الكسور | عالية |
| `src/lib/mathFormatter.ts` | إضافة `formatFractionsToLatex` | عالية |
| `src/components/MessageContent.tsx` | استخدام formatFractionsToLatex | عالية |
| `src/index.css` | تحسين تنسيقات KaTeX | متوسطة |
| `src/components/ui/MathFraction.tsx` | مكون جديد (اختياري) | منخفضة |

---

## النتيجة المتوقعة

### قبل:
```
اجمع 2/3 + 11/5
الناتج = 43/15
```

### بعد:
```
       2      11
اجمع ─── + ────
       3       5

        43
الناتج = ────
        15
```

---

## الرموز العربية المعتمدة

| الرمز | الاستخدام | LaTeX |
|-------|-----------|-------|
| $\frac{a}{b}$ | الكسور | `$\frac{a}{b}$` |
| $\sqrt{x}$ | الجذر التربيعي | `$\sqrt{x}$` |
| $\sqrt[n]{x}$ | الجذر النوني | `$\sqrt[n]{x}$` |
| $x^2$ | الأُس | `$x^2$` |
| $\times$ | الضرب | `$\times$` |
| $\div$ | القسمة | `$\div$` |
| $\pm$ | زائد أو ناقص | `$\pm$` |
| $\leq$ | أصغر أو يساوي | `$\leq$` |
| $\geq$ | أكبر أو يساوي | `$\geq$` |
| $\neq$ | لا يساوي | `$\neq$` |
| $\pi$ | باي | `$\pi$` |
| $\infty$ | ما لا نهاية | `$\infty$` |

---

## ملاحظات تقنية

1. **KaTeX موجود بالفعل** - المشروع يستخدم `rehype-katex` و `remark-math`
2. **CSS موجود** - يوجد تنسيقات أساسية لـ `.katex-display`
3. **التحويل التلقائي** - الدالة الجديدة ستحول `2/3` إلى `$\frac{2}{3}$` تلقائياً
4. **التوافق** - LaTeX يعمل داخل Markdown بدون مشاكل
