import { z } from "zod";

// Auth Schemas
export const signUpSchema = z.object({
  email: z.string()
    .email("البريد الإلكتروني غير صالح")
    .min(5, "البريد الإلكتروني قصير جداً")
    .max(255, "البريد الإلكتروني طويل جداً"),
  password: z.string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .max(72, "كلمة المرور طويلة جداً")
    .regex(/[A-Z]/, "يجب أن تحتوي على حرف كبير")
    .regex(/[a-z]/, "يجب أن تحتوي على حرف صغير")
    .regex(/[0-9]/, "يجب أن تحتوي على رقم"),
  fullName: z.string()
    .trim()
    .min(2, "الاسم قصير جداً")
    .max(100, "الاسم طويل جداً")
    .regex(/^[\u0600-\u06FFa-zA-Z\s]+$/, "الاسم يحتوي على أحرف غير صالحة")
});

export const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة")
});

// Custom Test Schemas
export const customTestSchema = z.object({
  topic: z.string()
    .trim()
    .min(3, "الموضوع قصير جداً")
    .max(100, "الموضوع طويل جداً")
    .regex(/^[\u0600-\u06FFa-zA-Z0-9\s\-،]+$/, "الموضوع يحتوي على أحرف غير صالحة"),
  questionCount: z.number()
    .int()
    .min(5, "الحد الأدنى 5 أسئلة")
    .max(20, "الحد الأقصى 20 سؤالاً"),
  difficulty: z.enum(["easy", "medium", "hard"], {
    errorMap: () => ({ message: "مستوى الصعوبة غير صالح" })
  }),
  section: z.enum(["كمي", "لفظي"], {
    errorMap: () => ({ message: "القسم غير صالح" })
  })
});

// AI Tutor Message Schema
export const aiMessageSchema = z.object({
  message: z.string()
    .trim()
    .min(1, "الرسالة فارغة")
    .max(1000, "الرسالة طويلة جداً (حد أقصى 1000 حرف)")
    .refine(
      (val) => !/<script|javascript:|onerror=/i.test(val),
      "الرسالة تحتوي على محتوى غير آمن"
    )
});

// Quiz Answer Schema
export const quizAnswerSchema = z.object({
  questionId: z.string().uuid("معرف السؤال غير صالح"),
  answer: z.string().min(1, "الإجابة مطلوبة").max(500, "الإجابة طويلة جداً"),
  timeTaken: z.number().int().min(0).max(3600, "الوقت غير صالح")
});
