/**
 * Zod validation schemas for API requests
 * Provides type-safe validation with automatic error messages
 */

import { z } from "zod";
import { LessonType, HomeworkType, HomeworkSubmissionStatus, QuizSubmissionStatus } from "@prisma/client";

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

// Student management schemas
export const transferStudentSchema = z.object({
  enrollmentId: z.string().uuid("Invalid enrollment ID"),
  targetStreamId: z.string().uuid("Invalid target stream ID"),
});

export const kickStudentSchema = z.object({
  enrollmentId: z.string().uuid("Invalid enrollment ID"),
});

// Type exports for use in API routes
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
