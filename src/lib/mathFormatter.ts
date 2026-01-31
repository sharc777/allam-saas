/**
 * دوال تنسيق الرياضيات العربية
 * تحويل الأسس إلى superscript والمتغيرات إلى عربية
 */

// خريطة تحويل الأسس إلى superscript
const SUPERSCRIPTS: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  'n': 'ⁿ', '+': '⁺', '-': '⁻', '(': '⁽', ')': '⁾'
};

// خريطة تحويل المتغيرات الإنجليزية إلى عربية
const ARABIC_VARIABLES: Record<string, string> = {
  'x': 'س', 'y': 'ص', 'z': 'ع',
  'a': 'أ', 'b': 'ب', 'c': 'ج',
  'n': 'ن', 'm': 'م', 'r': 'ر',
  'k': 'ك', 'p': 'ع', 'q': 'ق'
};

// خريطة الكسور الشائعة
const COMMON_FRACTIONS: Record<string, string> = {
  '1/2': '½', '1/3': '⅓', '2/3': '⅔',
  '1/4': '¼', '3/4': '¾', '1/5': '⅕',
  '2/5': '⅖', '3/5': '⅗', '4/5': '⅘',
  '1/6': '⅙', '5/6': '⅚', '1/8': '⅛',
  '3/8': '⅜', '5/8': '⅝', '7/8': '⅞'
};

/**
 * تحويل الأسس إلى superscript
 * مثال: x^2 → x², 10^3 → 10³
 */
export function formatMathExponents(text: string): string {
  if (!text) return text;
  
  // تحويل ^(...) إلى superscript
  let result = text.replace(/\^([0-9n\+\-\(\)]+)/g, (_, exp: string) => 
    exp.split('').map((c: string) => SUPERSCRIPTS[c] || c).join('')
  );
  
  // تحويل ** إلى superscript (صيغة Python)
  result = result.replace(/\*\*([0-9n\+\-]+)/g, (_, exp: string) => 
    exp.split('').map((c: string) => SUPERSCRIPTS[c] || c).join('')
  );
  
  return result;
}

/**
 * تحويل المتغيرات الإنجليزية المنفردة إلى عربية
 * مثال: x = 5 → س = 5
 * ملاحظة: لا يحول المتغيرات داخل الكلمات
 */
export function arabicVariables(text: string): string {
  if (!text) return text;
  
  // تحويل المتغيرات المنفردة فقط (محاطة بحدود كلمة أو رموز رياضية)
  return text.replace(/(?<![a-zA-Z])([xyzabcnmrk])(?![a-zA-Z])/gi, (match, v: string) => {
    const lower = v.toLowerCase();
    // لا نحول n في كلمات مثل "in", "an", "on"
    if (['in', 'an', 'on', 'no'].some(word => text.includes(word))) {
      // فحص إضافي للسياق
      const index = text.indexOf(match);
      const before = text.substring(Math.max(0, index - 2), index);
      const after = text.substring(index + 1, index + 3);
      if (/[a-zA-Z]/.test(before) || /[a-zA-Z]/.test(after)) {
        return match;
      }
    }
    return ARABIC_VARIABLES[lower] || match;
  });
}

/**
 * تحويل الكسور الشائعة إلى رموز Unicode
 * مثال: 1/2 → ½
 */
export function formatFractions(text: string): string {
  if (!text) return text;
  
  let result = text;
  for (const [fraction, symbol] of Object.entries(COMMON_FRACTIONS)) {
    result = result.replace(new RegExp(fraction.replace('/', '\\/'), 'g'), symbol);
  }
  return result;
}

/**
 * تحويل رموز العمليات الرياضية
 * مثال: * → ×, / → ÷
 */
export function formatMathOperators(text: string): string {
  if (!text) return text;
  
  let result = text;
  
  // تحويل * إلى × (فقط إذا لم يكن جزء من ** للأسس)
  result = result.replace(/(?<!\*)\*(?!\*)/g, '×');
  
  // تحويل / إلى ÷ (فقط للقسمة وليس المسارات أو الروابط)
  result = result.replace(/(?<![a-zA-Z0-9_])\/(?![a-zA-Z0-9_])/g, '÷');
  
  // تحويل sqrt() إلى √
  result = result.replace(/sqrt\s*\(([^)]+)\)/gi, '√($1)');
  result = result.replace(/√\s*\(([^)]+)\)/g, '√$1');
  
  // تحويل <= و >= و != و ==
  result = result.replace(/<=/g, '≤');
  result = result.replace(/>=/g, '≥');
  result = result.replace(/!=/g, '≠');
  result = result.replace(/==/g, '=');
  
  // تحويل +- أو -+ إلى ±
  result = result.replace(/\+-|-\+/g, '±');
  
  // تحويل pi إلى π
  result = result.replace(/\bpi\b/gi, 'π');
  
  // تحويل infinity إلى ∞
  result = result.replace(/\binfinity\b/gi, '∞');
  result = result.replace(/\binf\b/gi, '∞');
  
  return result;
}

/**
 * تحويل الكسور النصية إلى صيغة LaTeX
 * مثال: 2/3 → $\frac{2}{3}$
 * يحافظ على الكسور الموجودة بالفعل في LaTeX
 */
export function formatFractionsToLatex(text: string): string {
  if (!text) return text;
  
  // لا نحول إذا كان النص يحتوي بالفعل على frac (تجنب التحويل المزدوج)
  if (text.includes('\\frac')) return text;
  
  // تحويل الكسور البسيطة مثل 2/3 إلى $\frac{2}{3}$
  // نتجنب تحويل الكسور داخل URLs أو المسارات
  const fractionRegex = /(?<![a-zA-Z0-9_/\\])(\d+)\/(\d+)(?![a-zA-Z0-9_/])/g;
  
  return text.replace(fractionRegex, (match, num, den) => {
    // تجنب الكسور التي قد تكون تواريخ أو أرقام أخرى
    const numVal = parseInt(num);
    const denVal = parseInt(den);
    
    // فقط الكسور المنطقية (البسط أصغر من أو يساوي المقام × 10)
    if (denVal > 0 && denVal <= 100 && numVal <= denVal * 10) {
      return `$\\frac{${num}}{${den}}$`;
    }
    return match;
  });
}

/**
 * تحويل الأعداد الكسرية إلى LaTeX
 * مثال: 2 1/2 → $2\\frac{1}{2}$
 */
export function formatMixedFractionsToLatex(text: string): string {
  if (!text) return text;
  
  // تحويل الأعداد الكسرية مثل "2 1/2" أو "٣ ١/٢"
  const mixedFractionRegex = /(\d+)\s+(\d+)\/(\d+)/g;
  
  return text.replace(mixedFractionRegex, (_, whole, num, den) => {
    return `$${whole}\\frac{${num}}{${den}}$`;
  });
}

/**
 * تنسيق كامل للنص الرياضي
 * يطبق جميع التحويلات بالترتيب الصحيح
 */
export function formatMathText(text: string): string {
  if (!text) return text;
  
  let result = text;
  
  // 1. تحويل الأعداد الكسرية أولاً (قبل الكسور البسيطة)
  result = formatMixedFractionsToLatex(result);
  
  // 2. تحويل الكسور البسيطة إلى LaTeX
  result = formatFractionsToLatex(result);
  
  // 3. تحويل الأسس
  result = formatMathExponents(result);
  
  // 4. تحويل العمليات الرياضية
  result = formatMathOperators(result);
  
  // 5. تحويل الكسور الشائعة (Unicode)
  result = formatFractions(result);
  
  return result;
}

/**
 * تنسيق النص مع تحويل المتغيرات إلى عربية
 * استخدم هذه الدالة عندما تريد تحويل كامل بما في ذلك المتغيرات
 */
export function formatMathTextFull(text: string): string {
  if (!text) return text;
  
  let result = formatMathText(text);
  result = arabicVariables(result);
  
  return result;
}
