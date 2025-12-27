/**
 * دالة مقارنة الإجابات الذكية
 * تتعامل مع اختلافات صيغ correct_answer مثل "ج" vs "ج. 25 درجة"
 */

const ARABIC_LETTERS = ['أ', 'ب', 'ج', 'د'];

/**
 * استخراج الحرف الأول من الخيار
 */
function extractOptionLetter(text: string): string | null {
  if (!text || text.length === 0) return null;
  
  const firstChar = text.trim().charAt(0);
  if (ARABIC_LETTERS.includes(firstChar)) {
    return firstChar;
  }
  return null;
}

/**
 * مقارنة ذكية للإجابة
 * تدعم المقارنة بالنص الكامل أو بالحرف فقط
 */
export function isAnswerCorrect(userAnswer: string, correctAnswer: string): boolean {
  // التعامل مع القيم الفارغة
  if (!userAnswer || !correctAnswer) return false;
  
  const userTrimmed = userAnswer.trim();
  const correctTrimmed = correctAnswer.trim();
  
  // 1. مقارنة مباشرة (نفس النص)
  if (userTrimmed === correctTrimmed) return true;
  
  // 2. مقارنة بالحرف الأول (أ، ب، ج، د)
  const userLetter = extractOptionLetter(userTrimmed);
  const correctLetter = extractOptionLetter(correctTrimmed);
  
  if (userLetter && correctLetter && userLetter === correctLetter) {
    return true;
  }
  
  // 3. مقارنة إذا كان أحدهما يبدأ بالآخر (مثل "ج" و "ج. 25")
  if (userTrimmed.startsWith(correctTrimmed + ".") || 
      userTrimmed.startsWith(correctTrimmed + " ") ||
      correctTrimmed.startsWith(userTrimmed + ".") || 
      correctTrimmed.startsWith(userTrimmed + " ")) {
    return true;
  }
  
  // 4. مقارنة بعد إزالة الرقم والنقطة من البداية
  const cleanUser = userTrimmed.replace(/^[أبجد][.\s]+/, '').trim();
  const cleanCorrect = correctTrimmed.replace(/^[أبجد][.\s]+/, '').trim();
  
  if (cleanUser && cleanCorrect && cleanUser === cleanCorrect) {
    return true;
  }
  
  return false;
}

/**
 * تحويل correct_answer من صيغة قصيرة (حرف) إلى الصيغة الكاملة
 */
export function normalizeCorrectAnswer(correctAnswer: string, options: string[]): string {
  if (!correctAnswer || !options || options.length === 0) return correctAnswer;
  
  const trimmedAnswer = correctAnswer.trim();
  
  // إذا كانت الإجابة موجودة في الخيارات، إرجاعها كما هي
  if (options.includes(trimmedAnswer)) return trimmedAnswer;
  
  // إذا كانت الإجابة حرف فقط، البحث عن الخيار المطابق
  const letter = extractOptionLetter(trimmedAnswer);
  if (letter && trimmedAnswer.length <= 2) {
    const matchingOption = options.find(opt => 
      opt.trim().startsWith(letter + ".") || 
      opt.trim().startsWith(letter + " ") ||
      opt.trim().charAt(0) === letter
    );
    if (matchingOption) return matchingOption;
  }
  
  return trimmedAnswer;
}

/**
 * إيجاد الإجابة الصحيحة الكاملة من الخيارات
 */
export function findFullCorrectAnswer(correctAnswerKey: string, options: string[]): string {
  if (!correctAnswerKey || !options || options.length === 0) return correctAnswerKey;
  
  const key = correctAnswerKey.trim();
  
  // إذا كانت الإجابة موجودة بالفعل في الخيارات
  if (options.includes(key)) return key;
  
  // البحث عن الخيار المطابق للحرف
  for (const opt of options) {
    const optLetter = extractOptionLetter(opt);
    if (optLetter && optLetter === key.charAt(0)) {
      return opt;
    }
  }
  
  return correctAnswerKey;
}
