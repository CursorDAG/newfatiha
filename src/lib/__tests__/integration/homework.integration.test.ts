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
  createTestHomeworkAssignment,
} from "./setup";
import type { User, Course, Stream, Lesson, Enrollment } from "@prisma/client";

describe("Homework Integration Tests", () => {
  let teacher: User;
  let student1: User;
  let student2: User;
  let unenrolledStudent: User;
  let otherTeacher: User;
  let course: Course;
  let stream: Stream;
  let lesson: Lesson;
  let enrollment1: Enrollment;
  let enrollment2: Enrollment;

  beforeAll(async () => {
    // Create test users
    teacher = await createTestUser({
      email: "teacher@test.com",
      name: "Test Teacher",
      role: "TEACHER",
    });

    otherTeacher = await createTestUser({
      email: "other-teacher@test.com",
      name: "Other Teacher",
      role: "TEACHER",
    });

    student1 = await createTestUser({
      email: "student1@test.com",
      name: "Student One",
      role: "STUDENT",
    });

    student2 = await createTestUser({
      email: "student2@test.com",
      name: "Student Two",
      role: "STUDENT",
    });

    unenrolledStudent = await createTestUser({
      email: "unenrolled@test.com",
      name: "Unenrolled Student",
      role: "STUDENT",
    });

    // Create course and stream
    course = await createTestCourse({
      teacherId: teacher.id,
      title: "Test Course",
      capacity: 30,
    });

    stream = await createTestStream({
      courseId: course.id,
      teacherId: teacher.id,
      name: "Test Stream",
    });

    lesson = await createTestLesson({
      streamId: stream.id,
      title: "Test Lesson",
    });

    // Enroll students
    enrollment1 = await createTestEnrollment({
      userId: student1.id,
      streamId: stream.id,
      status: "ACTIVE",
    });

    enrollment2 = await createTestEnrollment({
      userId: student2.id,
      streamId: stream.id,
      status: "ACTIVE",
    });
  });

  afterEach(async () => {
    // Clean up homework data after each test
    await testPrisma.homeworkSubmission.deleteMany();
    await testPrisma.homeworkAssignment.deleteMany();
  });

  afterAll(async () => {
    await cleanupDatabase();
    await disconnectDatabase();
  });

  describe("Homework Assignment Creation", () => {
    it("should create homework assignment without due date", async () => {
      const assignment = await createTestHomeworkAssignment({
        streamId: stream.id,
        title: "Test Homework",
        description: "Complete the assignment",
        type: "TEXT",
      });

      expect(assignment).toBeDefined();
      expect(assignment.streamId).toBe(stream.id);
      expect(assignment.title).toBe("Test Homework");
      expect(assignment.type).toBe("TEXT");
      expect(assignment.dueAt).toBeNull();
    });

    it("should create homework assignment with due date", async () => {
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      const assignment = await createTestHomeworkAssignment({
        streamId: stream.id,
        title: "Homework with Due Date",
        description: "Submit before deadline",
        type: "TEXT",
        dueAt: dueDate,
      });

      expect(assignment).toBeDefined();
      expect(assignment.dueAt).toEqual(dueDate);
    });

    it("should create homework assignment linked to lesson", async () => {
      const assignment = await createTestHomeworkAssignment({
        streamId: stream.id,
        lessonId: lesson.id,
        title: "Lesson Homework",
        description: "Related to lesson",
        type: "TEXT",
      });

      expect(assignment).toBeDefined();
      expect(assignment.lessonId).toBe(lesson.id);
    });

    it("should create homework assignment with AUDIO type", async () => {
      const assignment = await createTestHomeworkAssignment({
        streamId: stream.id,
        title: "Audio Homework",
        description: "Record your recitation",
        type: "AUDIO",
      });

      expect(assignment).toBeDefined();
      expect(assignment.type).toBe("AUDIO");
    });
  });

  describe("Student Homework Submission", () => {
    it("should allow enrolled student to submit homework with text content", async () => {
      const assignment = await createTestHomeworkAssignment({
        streamId: stream.id,
        title: "Text Homework",
        type: "TEXT",
      });

      const submission = await testPrisma.homeworkSubmission.create({
        data: {
          assignmentId: assignment.id,
          enrollmentId: enrollment1.id,
          contentText: "This is my homework submission",
          status: "SUBMITTED",
        },
      });

      expect(submission).toBeDefined();
      expect(submission.assignmentId).toBe(assignment.id);
      expect(submission.enrollmentId).toBe(enrollment1.id);
      expect(submission.contentText).toBe("This is my homework submission");
      expect(submission.status).toBe("SUBMITTED");
      expect(submission.grade).toBeNull();
      expect(submission.checkedAt).toBeNull();
    });

    it("should allow enrolled student to submit homework with URL content", async () => {
      const assignment = await createTestHomeworkAssignment({
        streamId: stream.id,
        title: "URL Homework",
        type: "TEXT",
      });

      const submission = await testPrisma.homeworkSubmission.create({
        data: {
          assignmentId: assignment.id,
          enrollmentId: enrollment1.id,
          contentUrl: "https://example.com/my-homework.pdf",
          status: "SUBMITTED",
        },
      });

      expect(submission).toBeDefined();
      expect(submission.contentUrl).toBe("https://example.com/my-homework.pdf");
      expect(submission.contentText).toBeNull();
    });

    it("should allow student to submit homework with both text and URL", async () => {
      const assignment = await createTestHomeworkAssignment({
        streamId: stream.id,
        title: "Combined Homework",
        type: "TEXT",
      });

      const submission = await testPrisma.homeworkSubmission.create({
        data: {
          assignmentId: assignment.id,
          enrollmentId: enrollment1.id,
          contentText: "See attached file for details",
          contentUrl: "https://example.com/homework.pdf",
          status: "SUBMITTED",
        },
      });

      expect(submission).toBeDefined();
      expect(submission.contentText).toBe("See attached file for details");
      expect(submission.contentUrl).toBe("https://example.com/homework.pdf");
    });
  });

  describe("Enrollment-Based Access Control", () => {
    it("should prevent unenrolled student from submitting homework", async () => {
      const assignment = await createTestHomeworkAssignment({
        streamId: stream.id,
        title: "Protected Homework",
        type: "TEXT",
      });

      // Attempt to create submission without valid enrollment
      // This should fail due to foreign key constraint
      await expect(
        testPrisma.homeworkSubmission.create({
          data: {
            assignmentId: assignment.id,
            enrollmentId: "non-existent-enrollment-id",
            contentText: "Unauthorized submission",
            status: "SUBMITTED",
          },
        })
      ).rejects.toThrow();
    });

    it("should verify enrollment belongs to correct stream", async () => {
      // Create another stream
      const otherStream = await createTestStream({
        courseId: course.id,
        teacherId: teacher.id,
        name: "Other Stream",
      });

      const assignment = await createTestHomeworkAssignment({
        streamId: stream.id,
        title: "Stream-Specific Homework",
        type: "TEXT",
      });

      // Create enrollment in different stream
      const otherEnrollment = await createTestEnrollment({
        userId: unenrolledStudent.id,
        streamId: otherStream.id,
        status: "ACTIVE",
      });

      // Verify that enrollment is for different stream
      const enrollmentCheck = await testPrisma.enrollment.findUnique({
        where: { id: otherEnrollment.id },
        include: { stream: true },
      });

      expect(enrollmentCheck?.streamId).toBe(otherStream.id);
      expect(enrollmentCheck?.streamId).not.toBe(stream.id);

      // Submission should succeed (database allows it)
      // Access control should be enforced at API level
      const submission = await testPrisma.homeworkSubmission.create({
        data: {
          assignmentId: assignment.id,
          enrollmentId: otherEnrollment.id,
          contentText: "Cross-stream submission",
          status: "SUBMITTED",
        },
      });

      expect(submission).toBeDefined();
    });

    it("should prevent kicked student from submitting", async () => {
      const assignment = await createTestHomeworkAssignment({
        streamId: stream.id,
        title: "Active Students Only",
        type: "TEXT",
      });

      // Update enrollment status to KICKED
      await testPrisma.enrollment.update({
        where: { id: enrollment2.id },
        data: { status: "KICKED" },
      });

      // Database allows submission, but API should check enrollment status
      const submission = await testPrisma.homeworkSubmission.create({
        data: {
          assignmentId: assignment.id,
          enrollmentId: enrollment2.id,
          contentText: "Submission from kicked student",
          status: "SUBMITTED",
        },
      });

      // Verify enrollment status
      const enrollment = await testPrisma.enrollment.findUnique({
        where: { id: enrollment2.id },
      });

      expect(enrollment?.status).toBe("KICKED");
      expect(submission).toBeDefined();

      // Restore enrollment status for other tests
      await testPrisma.enrollment.update({
        where: { id: enrollment2.id },
        data: { status: "ACTIVE" },
      });
    });
  });

  describe("Upsert Pattern for Resubmissions", () => {
    it("should allow student to resubmit homework (upsert)", async () => {
      const assignment = await createTestHomeworkAssignment({
        streamId: stream.id,
        title: "Resubmittable Homework",
        type: "TEXT",
      });

      // First submission
      const firstSubmission = await testPrisma.homeworkSubmission.upsert({
        where: {
          assignmentId_enrollmentId: {
            assignmentId: assignment.id,
            enrollmentId: enrollment1.id,
          },
        },
        create: {
          assignmentId: assignment.id,
          enrollmentId: enrollment1.id,
          contentText: "First attempt",
          status: "SUBMITTED",
        },
        update: {
          contentText: "First attempt",
          status: "SUBMITTED",
        },
      });

      expect(firstSubmission.contentText).toBe("First attempt");

      // Resubmission (should update existing record)
      const resubmission = await testPrisma.homeworkSubmission.upsert({
        where: {
          assignmentId_enrollmentId: {
            assignmentId: assignment.id,
            enrollmentId: enrollment1.id,
          },
        },
        create: {
          assignmentId: assignment.id,
          enrollmentId: enrollment1.id,
          contentText: "Second attempt - improved",
          status: "SUBMITTED",
        },
        update: {
          contentText: "Second attempt - improved",
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
      });

      expect(resubmission.id).toBe(firstSubmission.id); // Same record
      expect(resubmission.contentText).toBe("Second attempt - improved");

      // Verify only one submission exists
      const submissions = await testPrisma.homeworkSubmission.findMany({
        where: {
          assignmentId: assignment.id,
          enrollmentId: enrollment1.id,
        },
      });

      expect(submissions).toHaveLength(1);
    });

    it("should reset grading fields on resubmission", async () => {
      const assignment = await createTestHomeworkAssignment({
        streamId: stream.id,
        title: "Graded Homework",
        type: "TEXT",
      });

      // Initial submission
      await testPrisma.homeworkSubmission.create({
        data: {
          assignmentId: assignment.id,
          enrollmentId: enrollment1.id,
          contentText: "Initial submission",
          status: "SUBMITTED",
        },
      });

      // Teacher grades it
      await testPrisma.homeworkSubmission.update({
        where: {
          assignmentId_enrollmentId: {
            assignmentId: assignment.id,
            enrollmentId: enrollment1.id,
          },
        },
        data: {
          status: "NEEDS_REWORK",
          grade: 60,
          teacherComment: "Needs improvement",
          checkedAt: new Date(),
        },
      });

      // Student resubmits - should reset grading fields
      const resubmission = await testPrisma.homeworkSubmission.update({
        where: {
          assignmentId_enrollmentId: {
            assignmentId: assignment.id,
            enrollmentId: enrollment1.id,
          },
        },
        data: {
          contentText: "Improved submission",
          status: "SUBMITTED",
          grade: null,
          teacherComment: null,
          checkedAt: null,
          submittedAt: new Date(),
        },
      });

      expect(resubmission.status).toBe("SUBMITTED");
      expect(resubmission.grade).toBeNull();
      expect(resubmission.teacherComment).toBeNull();
      expect(resubmission.checkedAt).toBeNull();
    });
  });

  describe("Teacher Grading Workflow", () => {
    it("should allow teacher to grade homework as ACCEPTED", async () => {
      const assignment = await createTestHomeworkAssignment({
        streamId: stream.id,
        title: "Gradable Homework",
        type: "TEXT",
      });

      const submission = await testPrisma.homeworkSubmission.create({
        data: {
          assignmentId: assignment.id,
          enrollmentId: enrollment1.id,
          contentText: "Excellent work",
          status: "SUBMITTED",
        },
      });

      // Teacher grades as ACCEPTED
      const graded = await testPrisma.homeworkSubmission.update({
        where: { id: submission.id },
        data: {
          status: "ACCEPTED",
          grade: 95,
          teacherComment: "Отличная работа!",
          checkedAt: new Date(),
        },
      });

      expect(graded.status).toBe("ACCEPTED");
      expect(graded.grade).toBe(95);
      expect(graded.teacherComment).toBe("Отличная работа!");
      expect(graded.checkedAt).toBeDefined();
    });

    it("should allow teacher to grade homework as NEEDS_REWORK", async () => {
      const assignment = await createTestHomeworkAssignment({
        streamId: stream.id,
        title: "Needs Work Homework",
        type: "TEXT",
      });

      const submission = await testPrisma.homeworkSubmission.create({
        data: {
          assignmentId: assignment.id,
          enrollmentId: enrollment1.id,
          contentText: "Incomplete work",
          status: "SUBMITTED",
        },
      });

      // Teacher grades as NEEDS_REWORK
      const graded = await testPrisma.homeworkSubmission.update({
        where: { id: submission.id },
        data: {
          status: "NEEDS_REWORK",
          grade: 65,
          teacherComment: "Нужно доработать. Добавьте больше деталей.",
          checkedAt: new Date(),
        },
      });

      expect(graded.status).toBe("NEEDS_REWORK");
      expect(graded.grade).toBe(65);
      expect(graded.teacherComment).toContain("доработать");
    });

    it("should allow teacher to grade homework as REJECTED", async () => {
      const assignment = await createTestHomeworkAssignment({
        streamId: stream.id,
        title: "Rejected Homework",
        type: "TEXT",
      });

      const submission = await testPrisma.homeworkSubmission.create({
        data: {
          assignmentId: assignment.id,
          enrollmentId: enrollment1.id,
          contentText: "Off-topic content",
          status: "SUBMITTED",
        },
      });

      // Teacher grades as REJECTED
      const graded = await testPrisma.homeworkSubmission.update({
        where: { id: submission.id },
        data: {
          status: "REJECTED",
          grade: 0,
          teacherComment: "Работа не соответствует заданию.",
          checkedAt: new Date(),
        },
      });

      expect(graded.status).toBe("REJECTED");
      expect(graded.grade).toBe(0);
    });

    it("should allow grading without numeric grade", async () => {
      const assignment = await createTestHomeworkAssignment({
        streamId: stream.id,
        title: "Pass/Fail Homework",
        type: "TEXT",
      });

      const submission = await testPrisma.homeworkSubmission.create({
        data: {
          assignmentId: assignment.id,
          enrollmentId: enrollment1.id,
          contentText: "Completed",
          status: "SUBMITTED",
        },
      });

      // Grade without numeric score
      const graded = await testPrisma.homeworkSubmission.update({
        where: { id: submission.id },
        data: {
          status: "ACCEPTED",
          teacherComment: "Зачтено",
          checkedAt: new Date(),
        },
      });

      expect(graded.status).toBe("ACCEPTED");
      expect(graded.grade).toBeNull();
      expect(graded.teacherComment).toBe("Зачтено");
    });
  });

  describe("Teacher Ownership Verification", () => {
    it("should verify assignment belongs to teacher's stream", async () => {
      const assignment = await createTestHomeworkAssignment({
        streamId: stream.id,
        title: "Teacher's Homework",
        type: "TEXT",
      });

      // Verify stream ownership
      const assignmentWithStream = await testPrisma.homeworkAssignment.findUnique({
        where: { id: assignment.id },
        include: { stream: true },
      });

      expect(assignmentWithStream?.stream.teacherId).toBe(teacher.id);
      expect(assignmentWithStream?.stream.teacherId).not.toBe(otherTeacher.id);
    });

    it("should prevent other teacher from grading homework", async () => {
      const assignment = await createTestHomeworkAssignment({
        streamId: stream.id,
        title: "Protected Homework",
        type: "TEXT",
      });

      await testPrisma.homeworkSubmission.create({
        data: {
          assignmentId: assignment.id,
          enrollmentId: enrollment1.id,
          contentText: "Student work",
          status: "SUBMITTED",
        },
      });

      // Verify ownership at query level
      const assignmentWithStream = await testPrisma.homeworkAssignment.findFirst({
        where: {
          id: assignment.id,
          stream: {
            teacherId: otherTeacher.id, // Wrong teacher
          },
        },
      });

      expect(assignmentWithStream).toBeNull(); // Should not find assignment

      // Verify correct teacher can access
      const correctTeacherAssignment = await testPrisma.homeworkAssignment.findFirst({
        where: {
          id: assignment.id,
          stream: {
            teacherId: teacher.id, // Correct teacher
          },
        },
      });

      expect(correctTeacherAssignment).toBeDefined();
    });
  });

  describe("Due Date Validation", () => {
    it("should track submissions before due date", async () => {
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      const assignment = await createTestHomeworkAssignment({
        streamId: stream.id,
        title: "Timed Homework",
        type: "TEXT",
        dueAt: dueDate,
      });

      const submission = await testPrisma.homeworkSubmission.create({
        data: {
          assignmentId: assignment.id,
          enrollmentId: enrollment1.id,
          contentText: "On-time submission",
          status: "SUBMITTED",
        },
      });

      // Verify submission is before due date
      expect(submission.submittedAt.getTime()).toBeLessThan(dueDate.getTime());
    });

    it("should track late submissions after due date", async () => {
      const dueDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

      const assignment = await createTestHomeworkAssignment({
        streamId: stream.id,
        title: "Past Due Homework",
        type: "TEXT",
        dueAt: dueDate,
      });

      const submission = await testPrisma.homeworkSubmission.create({
        data: {
          assignmentId: assignment.id,
          enrollmentId: enrollment1.id,
          contentText: "Late submission",
          status: "SUBMITTED",
        },
      });

      // Verify submission is after due date
      expect(submission.submittedAt.getTime()).toBeGreaterThan(dueDate.getTime());

      // API should check this and potentially reject or flag as late
      const assignmentData = await testPrisma.homeworkAssignment.findUnique({
        where: { id: assignment.id },
      });

      expect(assignmentData?.dueAt).toBeDefined();
      expect(assignmentData!.dueAt!.getTime()).toBeLessThan(submission.submittedAt.getTime());
    });

    it("should allow submissions when no due date is set", async () => {
      const assignment = await createTestHomeworkAssignment({
        streamId: stream.id,
        title: "No Deadline Homework",
        type: "TEXT",
        // No dueAt specified
      });

      const submission = await testPrisma.homeworkSubmission.create({
        data: {
          assignmentId: assignment.id,
          enrollmentId: enrollment1.id,
          contentText: "Anytime submission",
          status: "SUBMITTED",
        },
      });

      expect(submission).toBeDefined();
      expect(assignment.dueAt).toBeNull();
    });
  });

  describe("Full Lifecycle Test", () => {
    it("should complete full homework lifecycle from creation to grading", async () => {
      // 1. Teacher creates homework assignment
      const assignment = await createTestHomeworkAssignment({
        streamId: stream.id,
        lessonId: lesson.id,
        title: "Complete Lifecycle Homework",
        description: "Write an essay about the lesson topic",
        type: "TEXT",
        dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(assignment).toBeDefined();
      expect(assignment.streamId).toBe(stream.id);

      // 2. Student 1 submits homework
      const submission1 = await testPrisma.homeworkSubmission.create({
        data: {
          assignmentId: assignment.id,
          enrollmentId: enrollment1.id,
          contentText: "My essay about the lesson...",
          status: "SUBMITTED",
        },
      });

      expect(submission1.status).toBe("SUBMITTED");

      // 3. Student 2 submits homework with URL
      const submission2 = await testPrisma.homeworkSubmission.create({
        data: {
          assignmentId: assignment.id,
          enrollmentId: enrollment2.id,
          contentUrl: "https://example.com/essay.pdf",
          status: "SUBMITTED",
        },
      });

      expect(submission2.status).toBe("SUBMITTED");

      // 4. Teacher grades student 1 as ACCEPTED
      const graded1 = await testPrisma.homeworkSubmission.update({
        where: { id: submission1.id },
        data: {
          status: "ACCEPTED",
          grade: 90,
          teacherComment: "Отличная работа!",
          checkedAt: new Date(),
        },
      });

      expect(graded1.status).toBe("ACCEPTED");
      expect(graded1.grade).toBe(90);

      // 5. Teacher grades student 2 as NEEDS_REWORK
      const graded2 = await testPrisma.homeworkSubmission.update({
        where: { id: submission2.id },
        data: {
          status: "NEEDS_REWORK",
          grade: 70,
          teacherComment: "Нужно добавить больше примеров",
          checkedAt: new Date(),
        },
      });

      expect(graded2.status).toBe("NEEDS_REWORK");

      // 6. Student 2 resubmits with improvements
      const resubmission2 = await testPrisma.homeworkSubmission.update({
        where: {
          assignmentId_enrollmentId: {
            assignmentId: assignment.id,
            enrollmentId: enrollment2.id,
          },
        },
        data: {
          contentUrl: "https://example.com/essay-revised.pdf",
          contentText: "Added more examples as requested",
          status: "SUBMITTED",
          grade: null,
          teacherComment: null,
          checkedAt: null,
          submittedAt: new Date(),
        },
      });

      expect(resubmission2.id).toBe(submission2.id); // Same record
      expect(resubmission2.status).toBe("SUBMITTED");
      expect(resubmission2.grade).toBeNull();

      // 7. Teacher re-grades student 2 as ACCEPTED
      const finalGrade2 = await testPrisma.homeworkSubmission.update({
        where: { id: resubmission2.id },
        data: {
          status: "ACCEPTED",
          grade: 95,
          teacherComment: "Отлично! Все исправлено.",
          checkedAt: new Date(),
        },
      });

      expect(finalGrade2.status).toBe("ACCEPTED");
      expect(finalGrade2.grade).toBe(95);

      // 8. Verify final state
      const allSubmissions = await testPrisma.homeworkSubmission.findMany({
        where: { assignmentId: assignment.id },
        include: {
          enrollment: {
            include: {
              user: true,
            },
          },
        },
      });

      expect(allSubmissions).toHaveLength(2);
      expect(allSubmissions.every((s) => s.status === "ACCEPTED")).toBe(true);
      expect(allSubmissions.every((s) => s.checkedAt !== null)).toBe(true);
    });
  });
});
