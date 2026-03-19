/**
 * Zod validation schemas for API requests
 * Provides type-safe validation with automatic error messages
 */

import { z } from "zod";
import { LessonType, HomeworkType, HomeworkSubmissionStatus, QuizSubmissionStatus, Gender, StreamGenderType } from "@prisma/client";

// Course schemas
export const createCourseSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(2000, "Description too long").nullable().optional(),
  capacity: z.number().int().min(1, "Capacity must be at least 1").max(1000, "Capacity too large").default(30),
  published: z.boolean().default(false),
});

export const updateCourseSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long").optional(),
  description: z.string().max(2000, "Description too long").nullable().optional(),
  capacity: z.number().int().min(1, "Capacity must be at least 1").max(1000, "Capacity too large").optional(),
  published: z.boolean().optional(),
});

// Stream schemas
export const createStreamSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  level: z.string().min(1, "Level is required").max(50, "Level too long"),
  scheduleText: z.string().max(500, "Schedule text too long").optional(),
  slots: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startMinutes: z.number().int().min(0).max(1439),
    durationMinutes: z.number().int().min(30).max(480).multipleOf(30),
  })).min(1, "At least one schedule slot is required"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color").optional(),
  genderType: z.nativeEnum(StreamGenderType).default(StreamGenderType.MIXED),
});

// Lesson schemas
export const createLessonSchema = z.object({
  streamId: z.string().uuid("Invalid stream ID"),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  type: z.enum([LessonType.LIVE, LessonType.VIDEO, LessonType.TEXT]),
  content: z.string().max(50000, "Content too long").nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  teacherNotes: z.string().max(10000, "Teacher notes too long").nullable().optional(),
});

export const updateLessonSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long").optional(),
  type: z.enum([LessonType.LIVE, LessonType.VIDEO, LessonType.TEXT]).optional(),
  content: z.string().max(50000, "Content too long").nullable().optional(),
  teacherNotes: z.string().max(10000, "Teacher notes too long").nullable().optional(),
  published: z.boolean().optional(),
});

// Homework schemas
export const createHomeworkSchema = z.object({
  streamId: z.string().uuid("Invalid stream ID"),
  lessonId: z.string().uuid("Invalid lesson ID").nullable().optional(),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(10000, "Description too long").nullable().optional(),
  type: z.enum([HomeworkType.TEXT, HomeworkType.AUDIO]).default(HomeworkType.TEXT),
  dueAt: z.string().datetime().nullable().optional(),
});

export const submitHomeworkSchema = z.object({
  contentText: z.string().max(50000, "Content too long").nullable().optional(),
  contentUrl: z.string().url("Invalid URL").max(2000, "URL too long").nullable().optional(),
}).refine(
  (data) => data.contentText || data.contentUrl,
  { message: "Either contentText or contentUrl must be provided" }
);

export const checkHomeworkSchema = z.object({
  status: z.enum([
    HomeworkSubmissionStatus.SUBMITTED,
    HomeworkSubmissionStatus.ACCEPTED,
    HomeworkSubmissionStatus.NEEDS_REWORK,
    HomeworkSubmissionStatus.REJECTED,
  ]).optional(),
  grade: z.number().int().min(0).max(100).nullable().optional(),
  teacherComment: z.string().max(5000, "Comment too long").nullable().optional(),
});

// Quiz schemas
export const submitQuizSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("MULTIPLE_CHOICE"),
    selectedOptionId: z.string().uuid("Invalid option ID"),
  }),
  z.object({
    type: z.literal("VOICE"),
    voiceBase64: z.string().min(1, "Voice data is required"),
    voiceMimeType: z.string().min(1, "Voice MIME type is required"),
    voiceDurationMs: z.number().int().min(0).optional(),
  }),
]);

export const checkQuizSchema = z.object({
  status: z.enum([QuizSubmissionStatus.PASSED, QuizSubmissionStatus.FAILED]),
});

// Auth schemas
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  gender: z.nativeEnum(Gender).refine((val) => val !== Gender.NOT_SPECIFIED, {
    message: "Gender must be specified",
  }),
});

// Teacher registration schemas
export const registerTeacherStep1Schema = z.object({
  email: z.string().email("Неверный формат email"),
  password: z.string().min(8, "Пароль должен содержать минимум 8 символов"),
  name: z.string().min(1, "Имя обязательно").max(100, "Имя слишком длинное"),
});

export const registerTeacherStep2Schema = z.object({
  bio: z.string().min(50, "Расскажите о себе подробнее (минимум 50 символов)").max(5000, "Текст слишком длинный"),
  subjects: z.array(z.string()).min(1, "Укажите хотя бы один предмет"),
  experience: z.string().min(20, "Опишите ваш опыт подробнее (минимум 20 символов)").max(5000, "Текст слишком длинный"),
  qualifications: z.string().min(20, "Опишите вашу квалификацию подробнее (минимум 20 символов)").max(5000, "Текст слишком длинный"),
  whatsappPhone: z.string().regex(/^\+?\d{10,15}$/, "Неверный формат номера телефона"),
  documentsUrls: z.array(z.string().url("Неверный формат URL")).min(1, "Загрузите хотя бы один документ"),
  videoIntroUrl: z.string().url("Неверный формат URL").optional().nullable(),
});

export const verifyEmailSchema = z.object({
  token: z.string().uuid("Неверный токен"),
});

export const approveTeacherSchema = z.object({
  adminNotes: z.string().max(2000, "Заметки слишком длинные").optional(),
});

export const rejectTeacherSchema = z.object({
  rejectionReason: z.string().min(10, "Укажите причину отклонения (минимум 10 символов)").max(2000, "Текст слишком длинный"),
  adminNotes: z.string().max(2000, "Заметки слишком длинные").optional(),
});

// Student management schemas
export const transferStudentSchema = z.object({
  enrollmentId: z.string().uuid("Invalid enrollment ID"),
  targetStreamId: z.string().uuid("Invalid target stream ID"),
});

export const kickStudentSchema = z.object({
  enrollmentId: z.string().uuid("Invalid enrollment ID"),
});

// Enrollment request schemas
export const createEnrollmentRequestSchema = z.object({
  streamId: z.string().uuid("Invalid stream ID"),
  message: z.string().max(1000, "Message too long").optional(),
});

export const reviewEnrollmentRequestSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().max(1000, "Rejection reason too long").optional(),
});

export const confirmPaymentSchema = z.object({
  requestId: z.string().uuid("Invalid request ID"),
});

// Type exports for use in API routes
// Support ticket schemas
export const createSupportTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200, "Subject too long"),
  description: z.string().min(1, "Description is required").max(10000, "Description too long"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

export const replyToTicketSchema = z.object({
  message: z.string().min(1, "Message is required").max(10000, "Message too long"),
});

export const updateTicketSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

// Content report schemas
export const reviewReportSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  comment: z.string().max(1000, "Comment too long").optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CreateStreamInput = z.infer<typeof createStreamSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type CreateHomeworkInput = z.infer<typeof createHomeworkSchema>;
export type SubmitHomeworkInput = z.infer<typeof submitHomeworkSchema>;
export type CheckHomeworkInput = z.infer<typeof checkHomeworkSchema>;
export type SubmitQuizInput = z.infer<typeof submitQuizSchema>;
export type CheckQuizInput = z.infer<typeof checkQuizSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type TransferStudentInput = z.infer<typeof transferStudentSchema>;
export type KickStudentInput = z.infer<typeof kickStudentSchema>;

// Admin schemas
export const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long").optional(),
  email: z.string().email("Invalid email").optional(),
  role: z.enum(["STUDENT", "TEACHER", "ADMIN", "MODERATOR"]).optional(),
});

export const getUsersQuerySchema = z.object({
  role: z.enum(["STUDENT", "TEACHER", "ADMIN", "MODERATOR"]).optional(),
  isBlocked: z.enum(["true", "false"]).optional(),
  search: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>;
export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;
export type ReplyToTicketInput = z.infer<typeof replyToTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type ReviewReportInput = z.infer<typeof reviewReportSchema>;
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type CreateEnrollmentRequestInput = z.infer<typeof createEnrollmentRequestSchema>;
export type ReviewEnrollmentRequestInput = z.infer<typeof reviewEnrollmentRequestSchema>;
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
export type RegisterTeacherStep1Input = z.infer<typeof registerTeacherStep1Schema>;
export type RegisterTeacherStep2Input = z.infer<typeof registerTeacherStep2Schema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ApproveTeacherInput = z.infer<typeof approveTeacherSchema>;
export type RejectTeacherInput = z.infer<typeof rejectTeacherSchema>;
