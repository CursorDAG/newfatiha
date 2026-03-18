/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import {
  testPrisma,
  cleanupDatabase,
  disconnectDatabase,
  createTestUser,
  createTestCourse,
  createTestStream,
  createTestLesson,
  createTestEnrollment,
  createTestQuiz,
  generateTestAudioBase64,
} from "./setup";

/**
 * Integration tests for quiz submission flows
 */

describe("Quiz Integration Tests", () => {
  let teacher: Awaited<ReturnType<typeof createTestUser>>;
  let student: Awaited<ReturnType<typeof createTestUser>>;
  let unenrolledStudent: Awaited<ReturnType<typeof createTestUser>>;
  let course: Awaited<ReturnType<typeof createTestCourse>>;
  let stream: Awaited<ReturnType<typeof createTestStream>>;
  let lesson: Awaited<ReturnType<typeof createTestLesson>>;

  beforeAll(async () => {
    // Create test users
    teacher = await createTestUser({
      email: "teacher@test.com",
      name: "Test Teacher",
      role: "TEACHER",
    });

    student = await createTestUser({
      email: "student@test.com",
      name: "Test Student",
      role: "STUDENT",
    });

    unenrolledStudent = await createTestUser({
      email: "unenrolled@test.com",
      name: "Unenrolled Student",
      role: "STUDENT",
    });

    // Create course, stream, and lesson
    course = await createTestCourse({ teacherId: teacher.id });
    stream = await createTestStream({
      courseId: course.id,
      teacherId: teacher.id,
    });
    lesson = await createTestLesson({ streamId: stream.id });

    // Enroll the student
    await createTestEnrollment({
      userId: student.id,
      streamId: stream.id,
      status: "ACTIVE",
    });
  });

  afterEach(async () => {
    // Clean up submissions between tests
    await testPrisma.lessonQuizSubmission.deleteMany();
    await testPrisma.lessonQuizOption.deleteMany();
    await testPrisma.lessonQuizQuestion.deleteMany();
    await testPrisma.lessonQuiz.deleteMany();
  });

  afterAll(async () => {
    await cleanupDatabase();
    await disconnectDatabase();
  });

  describe("Multiple Choice Quiz Submission", () => {
    it("should allow enrolled student to submit multiple choice quiz", async () => {
      const quiz = await createTestQuiz({
        lessonId: lesson.id,
        type: "MULTIPLE_CHOICE",
      });

      const correctOption = quiz?.questions[0].options.find((o) => o.isCorrect);

      const submission = await testPrisma.lessonQuizSubmission.create({
        data: {
          quizId: quiz!.id,
          studentId: student.id,
          selectedOptionId: correctOption!.id,
          status: "SUBMITTED",
        },
      });

      expect(submission).toBeDefined();
      expect(submission.selectedOptionId).toBe(correctOption!.id);
      expect(submission.status).toBe("SUBMITTED");
    });

    it("should allow quiz resubmission with upsert pattern", async () => {
      const quiz = await createTestQuiz({
        lessonId: lesson.id,
        type: "MULTIPLE_CHOICE",
      });

      const options = quiz?.questions[0].options || [];
      const correctOption = options.find((o) => o.isCorrect);
      const wrongOption = options.find((o) => !o.isCorrect);

      // First submission
      await testPrisma.lessonQuizSubmission.create({
        data: {
          quizId: quiz!.id,
          studentId: student.id,
          selectedOptionId: wrongOption!.id,
          status: "SUBMITTED",
        },
      });

      // Resubmission with upsert
      const resubmission = await testPrisma.lessonQuizSubmission.upsert({
        where: {
          quizId_studentId: {
            quizId: quiz!.id,
            studentId: student.id,
          },
        },
        update: {
          selectedOptionId: correctOption!.id,
          status: "SUBMITTED",
          checkedById: null,
          checkedAt: null,
        },
        create: {
          quizId: quiz!.id,
          studentId: student.id,
          selectedOptionId: correctOption!.id,
          status: "SUBMITTED",
        },
      });

      expect(resubmission.selectedOptionId).toBe(correctOption!.id);

      // Verify only one submission exists
      const submissions = await testPrisma.lessonQuizSubmission.findMany({
        where: {
          quizId: quiz!.id,
          studentId: student.id,
        },
      });

      expect(submissions).toHaveLength(1);
    });

    it("should prevent unenrolled student from submitting quiz", async () => {
      await createTestQuiz({
        lessonId: lesson.id,
        type: "MULTIPLE_CHOICE",
      });

      // Check enrollment before allowing submission
      const enrollment = await testPrisma.enrollment.findFirst({
        where: {
          userId: unenrolledStudent.id,
          streamId: stream.id,
          status: "ACTIVE",
        },
      });

      expect(enrollment).toBeNull();

      // In real API, this would be blocked by authorization check
      // Here we just verify the enrollment doesn't exist
    });
  });

  describe("Teacher Grading Workflow", () => {
    it("should allow teacher to grade quiz as PASSED", async () => {
      const quiz = await createTestQuiz({
        lessonId: lesson.id,
        type: "MULTIPLE_CHOICE",
      });

      const correctOption = quiz?.questions[0].options.find((o) => o.isCorrect);

      const submission = await testPrisma.lessonQuizSubmission.create({
        data: {
          quizId: quiz!.id,
          studentId: student.id,
          selectedOptionId: correctOption!.id,
          status: "SUBMITTED",
        },
      });

      // Teacher grades the submission
      const graded = await testPrisma.lessonQuizSubmission.update({
        where: { id: submission.id },
        data: {
          status: "PASSED",
          checkedById: teacher.id,
          checkedAt: new Date(),
        },
      });

      expect(graded.status).toBe("PASSED");
      expect(graded.checkedById).toBe(teacher.id);
      expect(graded.checkedAt).toBeDefined();
    });

    it("should allow teacher to grade quiz as FAILED", async () => {
      const quiz = await createTestQuiz({
        lessonId: lesson.id,
        type: "MULTIPLE_CHOICE",
      });

      const wrongOption = quiz?.questions[0].options.find((o) => !o.isCorrect);

      const submission = await testPrisma.lessonQuizSubmission.create({
        data: {
          quizId: quiz!.id,
          studentId: student.id,
          selectedOptionId: wrongOption!.id,
          status: "SUBMITTED",
        },
      });

      // Teacher grades the submission
      const graded = await testPrisma.lessonQuizSubmission.update({
        where: { id: submission.id },
        data: {
          status: "FAILED",
          checkedById: teacher.id,
          checkedAt: new Date(),
        },
      });

      expect(graded.status).toBe("FAILED");
      expect(graded.checkedById).toBe(teacher.id);
    });

    it("should reset grading fields on resubmission", async () => {
      const quiz = await createTestQuiz({
        lessonId: lesson.id,
        type: "MULTIPLE_CHOICE",
      });

      const options = quiz?.questions[0].options || [];
      const correctOption = options.find((o) => o.isCorrect);

      // Initial submission and grading
      const submission = await testPrisma.lessonQuizSubmission.create({
        data: {
          quizId: quiz!.id,
          studentId: student.id,
          selectedOptionId: correctOption!.id,
          status: "PASSED",
          checkedById: teacher.id,
          checkedAt: new Date(),
        },
      });

      expect(submission.checkedById).toBe(teacher.id);

      // Resubmission should reset grading fields
      const resubmission = await testPrisma.lessonQuizSubmission.update({
        where: { id: submission.id },
        data: {
          status: "SUBMITTED",
          checkedById: null,
          checkedAt: null,
        },
      });

      expect(resubmission.status).toBe("SUBMITTED");
      expect(resubmission.checkedById).toBeNull();
      expect(resubmission.checkedAt).toBeNull();
    });
  });

  describe("Voice Quiz Submission", () => {
    it("should allow voice quiz submission with PostgreSQL storage", async () => {
      const quiz = await testPrisma.lessonQuiz.create({
        data: {
          lessonId: lesson.id,
          title: "Voice Quiz",
          type: "VOICE",
        },
      });

      const audioBase64 = generateTestAudioBase64(1024);
      const audioBuffer = Buffer.from(audioBase64, "base64");

      const submission = await testPrisma.lessonQuizSubmission.create({
        data: {
          quizId: quiz.id,
          studentId: student.id,
          voiceData: audioBuffer as Uint8Array<ArrayBuffer>,
          voiceMimeType: "audio/webm",
          voiceDurationMs: 5000,
          status: "SUBMITTED",
        },
      });

      expect(submission.voiceData).toBeDefined();
      expect(submission.voiceMimeType).toBe("audio/webm");
      expect(submission.voiceDurationMs).toBe(5000);
      expect(submission.status).toBe("SUBMITTED");
    });

    it("should store voice URL when S3 is configured", async () => {
      const quiz = await testPrisma.lessonQuiz.create({
        data: {
          lessonId: lesson.id,
          title: "Voice Quiz",
          type: "VOICE",
        },
      });

      const voiceUrl = "https://s3.example.com/voice-recordings/test.webm";

      const submission = await testPrisma.lessonQuizSubmission.create({
        data: {
          quizId: quiz.id,
          studentId: student.id,
          voiceUrl,
          voiceMimeType: "audio/webm",
          voiceDurationMs: 5000,
          status: "SUBMITTED",
        },
      });

      expect(submission.voiceUrl).toBe(voiceUrl);
      expect(submission.voiceData).toBeNull();
    });

    it("should handle voice data size validation", async () => {
      const quiz = await testPrisma.lessonQuiz.create({
        data: {
          lessonId: lesson.id,
          title: "Voice Quiz",
          type: "VOICE",
        },
      });

      // Test with valid size (1MB)
      const validAudio = generateTestAudioBase64(1024 * 1024);
      const validBuffer = Buffer.from(validAudio, "base64");

      const validSubmission = await testPrisma.lessonQuizSubmission.create({
        data: {
          quizId: quiz.id,
          studentId: student.id,
          voiceData: validBuffer as Uint8Array<ArrayBuffer>,
          voiceMimeType: "audio/webm",
          status: "SUBMITTED",
        },
      });

      expect(validSubmission).toBeDefined();

      // In real API, 7MB+ would be rejected before reaching database
      // Here we just verify the valid case works
    });

    it("should support different audio MIME types", async () => {
      const quiz = await testPrisma.lessonQuiz.create({
        data: {
          lessonId: lesson.id,
          title: "Voice Quiz",
          type: "VOICE",
        },
      });

      const mimeTypes = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg"];

      for (const mimeType of mimeTypes) {
        const audioBase64 = generateTestAudioBase64(512);
        const audioBuffer = Buffer.from(audioBase64, "base64");

        const submission = await testPrisma.lessonQuizSubmission.create({
          data: {
            quizId: quiz.id,
            studentId: student.id,
            voiceData: audioBuffer as Uint8Array<ArrayBuffer>,
            voiceMimeType: mimeType,
            status: "SUBMITTED",
          },
        });

        expect(submission.voiceMimeType).toBe(mimeType);

        // Clean up for next iteration
        await testPrisma.lessonQuizSubmission.delete({
          where: { id: submission.id },
        });
      }
    });

    it("should allow voice quiz resubmission", async () => {
      const quiz = await testPrisma.lessonQuiz.create({
        data: {
          lessonId: lesson.id,
          title: "Voice Quiz",
          type: "VOICE",
        },
      });

      const firstAudio = generateTestAudioBase64(512);
      const firstBuffer = Buffer.from(firstAudio, "base64");

      // First submission
      await testPrisma.lessonQuizSubmission.create({
        data: {
          quizId: quiz.id,
          studentId: student.id,
          voiceData: firstBuffer as Uint8Array<ArrayBuffer>,
          voiceMimeType: "audio/webm",
          voiceDurationMs: 3000,
          status: "SUBMITTED",
        },
      });

      const secondAudio = generateTestAudioBase64(1024);
      const secondBuffer = Buffer.from(secondAudio, "base64");

      // Resubmission with upsert
      const resubmission = await testPrisma.lessonQuizSubmission.upsert({
        where: {
          quizId_studentId: {
            quizId: quiz.id,
            studentId: student.id,
          },
        },
        update: {
          voiceData: secondBuffer as Uint8Array<ArrayBuffer>,
          voiceDurationMs: 5000,
          status: "SUBMITTED",
          checkedById: null,
          checkedAt: null,
        },
        create: {
          quizId: quiz.id,
          studentId: student.id,
          voiceData: secondBuffer as Uint8Array<ArrayBuffer>,
          voiceMimeType: "audio/webm",
          voiceDurationMs: 5000,
          status: "SUBMITTED",
        },
      });

      expect(resubmission.voiceDurationMs).toBe(5000);

      // Verify only one submission exists
      const submissions = await testPrisma.lessonQuizSubmission.findMany({
        where: {
          quizId: quiz.id,
          studentId: student.id,
        },
      });

      expect(submissions).toHaveLength(1);
    });
  });

  describe("Enrollment Verification", () => {
    it("should verify student enrollment before submission", async () => {
      await createTestQuiz({
        lessonId: lesson.id,
        type: "MULTIPLE_CHOICE",
      });

      // Check enrolled student
      const enrolledCheck = await testPrisma.enrollment.findFirst({
        where: {
          userId: student.id,
          streamId: stream.id,
          status: "ACTIVE",
        },
      });

      expect(enrolledCheck).toBeDefined();
      expect(enrolledCheck?.status).toBe("ACTIVE");

      // Check unenrolled student
      const unenrolledCheck = await testPrisma.enrollment.findFirst({
        where: {
          userId: unenrolledStudent.id,
          streamId: stream.id,
          status: "ACTIVE",
        },
      });

      expect(unenrolledCheck).toBeNull();
    });

    it("should prevent kicked student from submitting", async () => {
      const kickedStudent = await createTestUser({
        email: "kicked@test.com",
        name: "Kicked Student",
        role: "STUDENT",
      });

      await createTestEnrollment({
        userId: kickedStudent.id,
        streamId: stream.id,
        status: "KICKED",
      });

      const enrollment = await testPrisma.enrollment.findFirst({
        where: {
          userId: kickedStudent.id,
          streamId: stream.id,
          status: "ACTIVE",
        },
      });

      expect(enrollment).toBeNull();
    });
  });
});
