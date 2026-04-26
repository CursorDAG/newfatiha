/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from "vitest";
import { getServerSession } from "next-auth";
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
  createTestHomeworkAssignment,
  createMockSession,
} from "./setup";

// Import API route handlers
import { GET as getCourses, POST as createCourse } from "@/app/api/teacher/courses/route";
import { PATCH as updateCourse, DELETE as deleteCourse } from "@/app/api/teacher/courses/[courseId]/route";
import { GET as getStreams, POST as createStream } from "@/app/api/teacher/streams/route";
import { PATCH as updateStream, DELETE as deleteStream } from "@/app/api/teacher/streams/[streamId]/route";
import { POST as createLesson, PATCH as reorderLessons } from "@/app/api/teacher/lessons/route";
import { PATCH as updateLesson, DELETE as deleteLesson } from "@/app/api/teacher/lessons/[lessonId]/route";
import { POST as createHomework, GET as getHomeworkAssignments } from "@/app/api/teacher/homework/route";
import { GET as getHomeworkSubmissions } from "@/app/api/teacher/homework/[assignmentId]/submissions/route";
import { POST as gradeHomeworkSubmission } from "@/app/api/teacher/homework/submissions/[id]/check/route";
import { POST as createQuiz } from "@/app/api/teacher/quizzes/route";
import { POST as addQuizQuestion } from "@/app/api/teacher/quizzes/[quizId]/questions/route";
import { POST as gradeQuizSubmission } from "@/app/api/teacher/quiz-submissions/[submissionId]/check/route";
import { POST as reviewEnrollmentRequest } from "@/app/api/teacher/enrollment-requests/[id]/review/route";
import { POST as confirmPayment } from "@/app/api/teacher/enrollment-requests/[id]/confirm-payment/route";
import { GET as getAnalytics } from "@/app/api/teacher/analytics/route";
import { POST as createTeacherProfile, PATCH as updateTeacherProfile } from "@/app/api/teacher/profile/route";

// Mock NextAuth
vi.mock("next-auth", () => ({
  default: vi.fn(() => vi.fn()),
  getServerSession: vi.fn(),
}));

// Mock rate limiting to avoid delays in tests
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(() => Promise.resolve(null)),
  rateLimitConfigs: {
    general: {},
  },
}));

// Mock email/notification services
vi.mock("@/lib/email-service", () => ({
  EmailService: {
    sendStudentJoinedNotification: vi.fn(() => Promise.resolve()),
    sendLessonStartingNotification: vi.fn(() => Promise.resolve()),
    sendNewLessonNotification: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("@/lib/notification-service", () => ({
  NotificationService: {
    notifyNewLesson: vi.fn(() => Promise.resolve()),
    notifyHomeworkAssigned: vi.fn(() => Promise.resolve()),
    notifyHomeworkChecked: vi.fn(() => Promise.resolve()),
    notifyQuizChecked: vi.fn(() => Promise.resolve()),
    create: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/progress", () => ({
  recalculateStudentProgress: vi.fn(() => Promise.resolve()),
}));

describe("Teacher Full Cycle Integration Tests", () => {
  let teacher1: Awaited<ReturnType<typeof createTestUser>>;
  let teacher2: Awaited<ReturnType<typeof createTestUser>>;
  let student1: Awaited<ReturnType<typeof createTestUser>>;
  let student2: Awaited<ReturnType<typeof createTestUser>>;

  beforeAll(async () => {
    await cleanupDatabase();

    teacher1 = await createTestUser({
      email: "teacher1@fullcycle.com",
      name: "Teacher One",
      role: "TEACHER",
    });

    teacher2 = await createTestUser({
      email: "teacher2@fullcycle.com",
      name: "Teacher Two",
      role: "TEACHER",
    });

    student1 = await createTestUser({
      email: "student1@fullcycle.com",
      name: "Student One",
      role: "STUDENT",
    });

    student2 = await createTestUser({
      email: "student2@fullcycle.com",
      name: "Student Two",
      role: "STUDENT",
    });
  });

  afterEach(async () => {
    await testPrisma.activitySession.deleteMany();
    await testPrisma.lessonQuizSubmission.deleteMany();
    await testPrisma.homeworkSubmission.deleteMany();
    await testPrisma.homeworkAssignment.deleteMany();
    await testPrisma.homework.deleteMany();
    await testPrisma.lessonQuizOption.deleteMany();
    await testPrisma.lessonQuizQuestion.deleteMany();
    await testPrisma.lessonQuiz.deleteMany();
    await testPrisma.lesson.deleteMany();
    await testPrisma.streamScheduleSlot.deleteMany();
    await testPrisma.chatRoom.deleteMany();
    await testPrisma.enrollmentRequest.deleteMany();
    await testPrisma.enrollment.deleteMany();
    await testPrisma.stream.deleteMany();
    await testPrisma.course.deleteMany();
    await testPrisma.teacherProfile.deleteMany();
  });

  afterAll(async () => {
    await cleanupDatabase();
    await disconnectDatabase();
  });

  // ============================================================
  // 1. Teacher Course Management
  // ============================================================
  describe("Course Management", () => {
    it("should create a course (POST /api/teacher/courses)", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const request = new Request("http://localhost:3000/api/teacher/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Islamic Studies 101",
          description: "Introduction to Islamic Studies",
          capacity: 30,
          published: true,
        }),
      });

      const response = await createCourse(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.course.title).toBe("Islamic Studies 101");
      expect(data.course.teacherId).toBe(teacher1.id);
    });

    it("should get teacher's courses (GET /api/teacher/courses)", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      await createTestCourse({ teacherId: teacher1.id, title: "Course A" });
      await createTestCourse({ teacherId: teacher1.id, title: "Course B" });
      await createTestCourse({ teacherId: teacher2.id, title: "Other Teacher Course" });

      const request = new Request("http://localhost:3000/api/teacher/courses");
      const response = await getCourses(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.courses).toHaveLength(2);
      expect(data.courses.every((c: { teacherId: string }) => c.teacherId === teacher1.id)).toBe(true);
    });

    it("should update a course (PATCH /api/teacher/courses/[courseId])", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Old Title" });

      const request = new Request(`http://localhost:3000/api/teacher/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Title",
          description: "Updated description",
          capacity: 50,
          published: false,
        }),
      });

      const response = await updateCourse(request, {
        params: Promise.resolve({ courseId: course.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.course.title).toBe("New Title");
      expect(data.course.description).toBe("Updated description");
      expect(data.course.capacity).toBe(50);
      expect(data.course.published).toBe(false);
    });

    it("should delete a course with no active enrollments (DELETE /api/teacher/courses/[courseId])", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Deletable Course" });

      const request = new Request(`http://localhost:3000/api/teacher/courses/${course.id}`, {
        method: "DELETE",
      });

      const response = await deleteCourse(request, {
        params: Promise.resolve({ courseId: course.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const deleted = await testPrisma.course.findUnique({ where: { id: course.id } });
      expect(deleted).toBeNull();
    });

    it("should reject deleting a course with active enrollments", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Protected Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      await createTestEnrollment({ userId: student1.id, streamId: stream.id, status: "ACTIVE" });

      const request = new Request(`http://localhost:3000/api/teacher/courses/${course.id}`, {
        method: "DELETE",
      });

      const response = await deleteCourse(request, {
        params: Promise.resolve({ courseId: course.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("активными студентами");
    });

    it("should reject updating another teacher's course", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher2));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Teacher 1 Course" });

      const request = new Request(`http://localhost:3000/api/teacher/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Hacked Title" }),
      });

      const response = await updateCourse(request, {
        params: Promise.resolve({ courseId: course.id }),
      });
      expect(response.status).toBe(403);
    });

    it("should reject course creation without authentication", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/teacher/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Unauthorized", description: "Test", capacity: 10, published: true }),
      });

      const response = await createCourse(request);
      expect(response.status).toBe(401);
    });

    it("should reject course creation by student", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(student1));

      const request = new Request("http://localhost:3000/api/teacher/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Unauthorized", description: "Test", capacity: 10, published: true }),
      });

      const response = await createCourse(request);
      expect(response.status).toBe(401);
    });

    it("should reject course creation with missing title", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const request = new Request("http://localhost:3000/api/teacher/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "No title", capacity: 10, published: true }),
      });

      const response = await createCourse(request);
      expect(response.status).toBe(400);
    });
  });

  // ============================================================
  // 2. Teacher Stream Management
  // ============================================================
  describe("Stream Management", () => {
    it("should create a stream with schedule slots (POST /api/teacher/streams)", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Stream Course" });

      const request = new Request("http://localhost:3000/api/teacher/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          name: "Morning Group",
          level: "Beginner",
          slots: [
            { dayOfWeek: 1, startMinutes: 540, durationMinutes: 60 },
            { dayOfWeek: 3, startMinutes: 540, durationMinutes: 60 },
          ],
          color: "#10b981",
        }),
      });

      const response = await createStream(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stream.name).toBe("Morning Group");
      expect(data.stream.teacherId).toBe(teacher1.id);

      const slots = await testPrisma.streamScheduleSlot.findMany({ where: { streamId: data.stream.id } });
      expect(slots).toHaveLength(2);
    });

    it("should get teacher's streams (GET /api/teacher/streams)", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course1 = await createTestCourse({ teacherId: teacher1.id, title: "Course 1" });
      const course2 = await createTestCourse({ teacherId: teacher2.id, title: "Course 2" });

      await createTestStream({ courseId: course1.id, teacherId: teacher1.id, name: "Teacher 1 Stream" });
      await createTestStream({ courseId: course2.id, teacherId: teacher2.id, name: "Teacher 2 Stream" });

      const request = new Request("http://localhost:3000/api/teacher/streams");
      const response = await getStreams(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.streams).toHaveLength(1);
      expect(data.streams[0].name).toBe("Teacher 1 Stream");
    });

    it("should update a stream (PATCH /api/teacher/streams/[streamId])", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Stream Update Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id, name: "Old Name" });
      await testPrisma.streamScheduleSlot.create({
        data: { streamId: stream.id, dayOfWeek: 1, startMinutes: 540, durationMinutes: 60 },
      });

      const request = new Request(`http://localhost:3000/api/teacher/streams/${stream.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Name",
          level: "Advanced",
          color: "#3b82f6",
          slots: [{ dayOfWeek: 2, startMinutes: 600, durationMinutes: 90 }],
        }),
      });

      const response = await updateStream(request, {
        params: Promise.resolve({ streamId: stream.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stream.name).toBe("New Name");
      expect(data.stream.level).toBe("Advanced");
      expect(data.stream.color).toBe("#3b82f6");

      const slots = await testPrisma.streamScheduleSlot.findMany({ where: { streamId: stream.id } });
      expect(slots).toHaveLength(1);
      expect(slots[0].dayOfWeek).toBe(2);
    });

    it("should delete a stream with no enrollments or lessons", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Delete Stream Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id, name: "Deletable Stream" });
      await testPrisma.streamScheduleSlot.create({
        data: { streamId: stream.id, dayOfWeek: 1, startMinutes: 540, durationMinutes: 60 },
      });

      const request = new Request(`http://localhost:3000/api/teacher/streams/${stream.id}`, {
        method: "DELETE",
      });

      const response = await deleteStream(request, {
        params: Promise.resolve({ streamId: stream.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const deleted = await testPrisma.stream.findUnique({ where: { id: stream.id } });
      expect(deleted).toBeNull();
    });

    it("should reject deleting a stream with enrollments", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Protected Stream Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id, name: "Protected Stream" });
      await createTestEnrollment({ userId: student1.id, streamId: stream.id, status: "ACTIVE" });

      const request = new Request(`http://localhost:3000/api/teacher/streams/${stream.id}`, {
        method: "DELETE",
      });

      const response = await deleteStream(request, {
        params: Promise.resolve({ streamId: stream.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("ученики или уроки");
    });

    it("should reject updating another teacher's stream", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher2));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id, name: "Stream" });
      await testPrisma.streamScheduleSlot.create({
        data: { streamId: stream.id, dayOfWeek: 1, startMinutes: 540, durationMinutes: 60 },
      });

      const request = new Request(`http://localhost:3000/api/teacher/streams/${stream.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Hacked",
          slots: [{ dayOfWeek: 2, startMinutes: 600, durationMinutes: 60 }],
        }),
      });

      const response = await updateStream(request, {
        params: Promise.resolve({ streamId: stream.id }),
      });
      expect(response.status).toBe(403);
    });

    it("should reject stream creation with overlapping slots", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream1 = await createTestStream({ courseId: course.id, teacherId: teacher1.id, name: "Stream 1" });
      await testPrisma.streamScheduleSlot.create({
        data: { streamId: stream1.id, dayOfWeek: 1, startMinutes: 540, durationMinutes: 60 },
      });

      const request = new Request("http://localhost:3000/api/teacher/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          name: "Stream 2",
          level: "Beginner",
          slots: [{ dayOfWeek: 1, startMinutes: 570, durationMinutes: 60 }],
        }),
      });

      const response = await createStream(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("Конфликт расписания");
    });
  });

  // ============================================================
  // 3. Teacher Lesson Management
  // ============================================================
  describe("Lesson Management", () => {
    it("should create a lesson (POST /api/teacher/lessons)", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Lesson Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });

      const request = new Request("http://localhost:3000/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId: stream.id,
          title: "Introduction to Fatiha",
          type: "TEXT",
          content: "Lesson content here",
          sortOrder: 1,
        }),
      });

      const response = await createLesson(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.lesson.title).toBe("Introduction to Fatiha");
      expect(data.lesson.streamId).toBe(stream.id);
      expect(data.lesson.sortOrder).toBe(1);
    });

    it("should auto-assign sortOrder if not provided", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });

      await createTestLesson({ streamId: stream.id, title: "Lesson 1", sortOrder: 1 });
      await createTestLesson({ streamId: stream.id, title: "Lesson 2", sortOrder: 2 });

      const request = new Request("http://localhost:3000/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId: stream.id,
          title: "Lesson 3",
          type: "TEXT",
          content: "Content",
        }),
      });

      const response = await createLesson(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.lesson.sortOrder).toBe(3);
    });

    it("should update a lesson (PATCH /api/teacher/lessons/[lessonId])", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      const lesson = await createTestLesson({ streamId: stream.id, title: "Old Title", published: false });

      const request = new Request(`http://localhost:3000/api/teacher/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Title",
          content: "Updated content",
          published: true,
          teacherNotes: "Teacher notes here",
        }),
      });

      const response = await updateLesson(request, {
        params: Promise.resolve({ lessonId: lesson.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.lesson.title).toBe("New Title");
      expect(data.lesson.content).toBe("Updated content");
      expect(data.lesson.published).toBe(true);
      expect(data.lesson.teacherNotes).toBe("Teacher notes here");
    });

    it("should publish/unpublish a lesson", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      const lesson = await createTestLesson({ streamId: stream.id, published: false });

      // Publish
      const publishRequest = new Request(`http://localhost:3000/api/teacher/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: true }),
      });

      const publishResponse = await updateLesson(publishRequest, {
        params: Promise.resolve({ lessonId: lesson.id }),
      });
      const publishData = await publishResponse.json();

      expect(publishResponse.status).toBe(200);
      expect(publishData.lesson.published).toBe(true);

      // Unpublish
      const unpublishRequest = new Request(`http://localhost:3000/api/teacher/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: false }),
      });

      const unpublishResponse = await updateLesson(unpublishRequest, {
        params: Promise.resolve({ lessonId: lesson.id }),
      });
      const unpublishData = await unpublishResponse.json();

      expect(unpublishResponse.status).toBe(200);
      expect(unpublishData.lesson.published).toBe(false);
    });

    it("should delete a lesson (DELETE /api/teacher/lessons/[lessonId])", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      const lesson = await createTestLesson({ streamId: stream.id, title: "Deletable Lesson" });

      const request = new Request(`http://localhost:3000/api/teacher/lessons/${lesson.id}`, {
        method: "DELETE",
      });

      const response = await deleteLesson(request, {
        params: Promise.resolve({ lessonId: lesson.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const deleted = await testPrisma.lesson.findUnique({ where: { id: lesson.id } });
      expect(deleted).toBeNull();
    });

    it("should reorder lessons (PATCH /api/teacher/lessons)", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });

      const lesson1 = await createTestLesson({ streamId: stream.id, title: "Lesson 1", sortOrder: 1 });
      const lesson2 = await createTestLesson({ streamId: stream.id, title: "Lesson 2", sortOrder: 2 });
      const lesson3 = await createTestLesson({ streamId: stream.id, title: "Lesson 3", sortOrder: 3 });

      const request = new Request("http://localhost:3000/api/teacher/lessons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId: stream.id,
          lessonIdsInOrder: [lesson3.id, lesson1.id, lesson2.id],
        }),
      });

      const response = await reorderLessons(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const updatedLessons = await testPrisma.lesson.findMany({
        where: { streamId: stream.id },
        orderBy: { sortOrder: "asc" },
      });

      expect(updatedLessons[0].id).toBe(lesson3.id);
      expect(updatedLessons[0].sortOrder).toBe(1);
      expect(updatedLessons[1].id).toBe(lesson1.id);
      expect(updatedLessons[1].sortOrder).toBe(2);
      expect(updatedLessons[2].id).toBe(lesson2.id);
      expect(updatedLessons[2].sortOrder).toBe(3);
    });

    it("should reject lesson creation for another teacher's stream", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher2));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });

      const request = new Request("http://localhost:3000/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId: stream.id,
          title: "Unauthorized Lesson",
          type: "TEXT",
          content: "Content",
        }),
      });

      const response = await createLesson(request);
      expect(response.status).toBe(403);
    });

    it("should reject lesson creation with invalid type", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });

      const request = new Request("http://localhost:3000/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId: stream.id,
          title: "Bad Lesson",
          type: "INVALID_TYPE",
          content: "Content",
        }),
      });

      const response = await createLesson(request);
      expect(response.status).toBe(400);
    });

    it("should reject reordering lessons from different streams", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream1 = await createTestStream({ courseId: course.id, teacherId: teacher1.id, name: "Stream 1" });
      const stream2 = await createTestStream({ courseId: course.id, teacherId: teacher1.id, name: "Stream 2" });

      const lesson1 = await createTestLesson({ streamId: stream1.id, sortOrder: 1 });
      const lesson2 = await createTestLesson({ streamId: stream2.id, sortOrder: 1 });

      const request = new Request("http://localhost:3000/api/teacher/lessons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId: stream1.id,
          lessonIdsInOrder: [lesson1.id, lesson2.id],
        }),
      });

      const response = await reorderLessons(request);
      expect(response.status).toBe(400);
    });

    it("should reject updating another teacher's lesson", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher2));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      const lesson = await createTestLesson({ streamId: stream.id, title: "Lesson" });

      const request = new Request(`http://localhost:3000/api/teacher/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Hacked" }),
      });

      const response = await updateLesson(request, {
        params: Promise.resolve({ lessonId: lesson.id }),
      });
      expect(response.status).toBe(403);
    });
  });

  // ============================================================
  // 4. Teacher Homework Management
  // ============================================================
  describe("Homework Management", () => {
    it("should create homework assignment (POST /api/teacher/homework)", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });

      const request = new Request("http://localhost:3000/api/teacher/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId: stream.id,
          title: "Test Homework",
          description: "Complete the assignment",
          type: "TEXT",
          dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });

      const response = await createHomework(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.assignment.title).toBe("Test Homework");
      expect(data.assignment.streamId).toBe(stream.id);
      expect(data.assignment.type).toBe("TEXT");
    });

    it("should create AUDIO type homework", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });

      const request = new Request("http://localhost:3000/api/teacher/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId: stream.id,
          title: "Audio Homework",
          type: "AUDIO",
        }),
      });

      const response = await createHomework(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.assignment.type).toBe("AUDIO");
    });

    it("should get homework assignments for stream (GET /api/teacher/homework)", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });

      await createTestHomeworkAssignment({ streamId: stream.id, title: "HW 1" });
      await createTestHomeworkAssignment({ streamId: stream.id, title: "HW 2" });

      const request = new Request(`http://localhost:3000/api/teacher/homework?streamId=${stream.id}`);
      const response = await getHomeworkAssignments(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.assignments).toHaveLength(2);
    });

    it("should get homework submissions (GET /api/teacher/homework/[id]/submissions)", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      const enrollment = await createTestEnrollment({ userId: student1.id, streamId: stream.id });
      const assignment = await createTestHomeworkAssignment({ streamId: stream.id, title: "HW" });

      await testPrisma.homeworkSubmission.create({
        data: {
          assignmentId: assignment.id,
          enrollmentId: enrollment.id,
          contentText: "Student submission",
          status: "SUBMITTED",
        },
      });

      const request = new Request(`http://localhost:3000/api/teacher/homework/${assignment.id}/submissions`);
      const response = await getHomeworkSubmissions(request, {
        params: Promise.resolve({ assignmentId: assignment.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.submissions).toHaveLength(1);
      expect(data.submissions[0].contentText).toBe("Student submission");
      expect(data.submissions[0].student.userId).toBe(student1.id);
    });

    it("should grade homework submission (POST /api/teacher/homework/submissions/[id]/check)", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      const enrollment = await createTestEnrollment({ userId: student1.id, streamId: stream.id });
      const assignment = await createTestHomeworkAssignment({ streamId: stream.id, title: "HW" });

      const submission = await testPrisma.homeworkSubmission.create({
        data: {
          assignmentId: assignment.id,
          enrollmentId: enrollment.id,
          contentText: "Student work",
          status: "SUBMITTED",
        },
      });

      const request = new Request(`http://localhost:3000/api/teacher/homework/submissions/${submission.id}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ACCEPTED",
          grade: 95,
          teacherComment: "Отличная работа!",
        }),
      });

      const response = await gradeHomeworkSubmission(request, {
        params: Promise.resolve({ id: submission.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.status).toBe("ACCEPTED");

      const graded = await testPrisma.homeworkSubmission.findUnique({ where: { id: submission.id } });
      expect(graded?.grade).toBe(95);
      expect(graded?.teacherComment).toBe("Отличная работа!");
      expect(graded?.checkedAt).toBeDefined();
    });

    it("should grade homework as NEEDS_REWORK", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      const enrollment = await createTestEnrollment({ userId: student1.id, streamId: stream.id });
      const assignment = await createTestHomeworkAssignment({ streamId: stream.id, title: "HW" });

      const submission = await testPrisma.homeworkSubmission.create({
        data: {
          assignmentId: assignment.id,
          enrollmentId: enrollment.id,
          contentText: "Incomplete work",
          status: "SUBMITTED",
        },
      });

      const request = new Request(`http://localhost:3000/api/teacher/homework/submissions/${submission.id}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "NEEDS_REWORK",
          grade: 60,
          teacherComment: "Нужно доработать",
        }),
      });

      const response = await gradeHomeworkSubmission(request, {
        params: Promise.resolve({ id: submission.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("NEEDS_REWORK");
    });

    it("should reject grading with invalid status", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      const enrollment = await createTestEnrollment({ userId: student1.id, streamId: stream.id });
      const assignment = await createTestHomeworkAssignment({ streamId: stream.id, title: "HW" });

      const submission = await testPrisma.homeworkSubmission.create({
        data: {
          assignmentId: assignment.id,
          enrollmentId: enrollment.id,
          contentText: "Work",
          status: "SUBMITTED",
        },
      });

      const request = new Request(`http://localhost:3000/api/teacher/homework/submissions/${submission.id}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "INVALID_STATUS" }),
      });

      const response = await gradeHomeworkSubmission(request, {
        params: Promise.resolve({ id: submission.id }),
      });
      expect(response.status).toBe(400);
    });

    it("should reject another teacher grading a submission", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher2));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      const enrollment = await createTestEnrollment({ userId: student1.id, streamId: stream.id });
      const assignment = await createTestHomeworkAssignment({ streamId: stream.id, title: "HW" });

      const submission = await testPrisma.homeworkSubmission.create({
        data: {
          assignmentId: assignment.id,
          enrollmentId: enrollment.id,
          contentText: "Work",
          status: "SUBMITTED",
        },
      });

      const request = new Request(`http://localhost:3000/api/teacher/homework/submissions/${submission.id}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACCEPTED", grade: 90 }),
      });

      const response = await gradeHomeworkSubmission(request, {
        params: Promise.resolve({ id: submission.id }),
      });
      expect(response.status).toBe(403);
    });

    it("should reject homework creation for another teacher's stream", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher2));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });

      const request = new Request("http://localhost:3000/api/teacher/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId: stream.id, title: "Unauthorized HW" }),
      });

      const response = await createHomework(request);
      expect(response.status).toBe(403);
    });

    it("should reject homework creation without required fields", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const request = new Request("http://localhost:3000/api/teacher/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "No stream or title" }),
      });

      const response = await createHomework(request);
      expect(response.status).toBe(400);
    });
  });

  // ============================================================
  // 5. Teacher Quiz Management
  // ============================================================
  describe("Quiz Management", () => {
    it("should create a quiz with questions (POST /api/teacher/quizzes)", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      const lesson = await createTestLesson({ streamId: stream.id, title: "Lesson" });

      const request = new Request("http://localhost:3000/api/teacher/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lesson.id,
          title: "Test Quiz",
          questions: [
            {
              prompt: "What is the first surah?",
              type: "MULTIPLE_CHOICE",
              options: ["Al-Fatiha", "Al-Baqarah", "Al-Ikhlas", "An-Nas"],
              correctOptionIndex: 0,
            },
            {
              prompt: "How many verses in Al-Fatiha?",
              type: "MULTIPLE_CHOICE",
              options: ["5", "7", "9", "11"],
              correctOptionIndex: 1,
            },
          ],
        }),
      });

      const response = await createQuiz(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.quizId).toBeDefined();

      const quiz = await testPrisma.lessonQuiz.findUnique({
        where: { id: data.quizId },
        include: { questions: { include: { options: true } } },
      });
      expect(quiz).toBeDefined();
      expect(quiz?.title).toBe("Test Quiz");
      expect(quiz?.questions).toHaveLength(2);
      expect(quiz?.questions[0].options).toHaveLength(4);
    });

    it("should create a VOICE type quiz", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      const lesson = await createTestLesson({ streamId: stream.id, title: "Lesson" });

      const request = new Request("http://localhost:3000/api/teacher/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lesson.id,
          title: "Voice Quiz",
          questions: [
            {
              prompt: "Recite Al-Fatiha",
              type: "VOICE",
            },
          ],
        }),
      });

      const response = await createQuiz(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const quiz = await testPrisma.lessonQuiz.findUnique({
        where: { id: data.quizId },
      });
      expect(quiz?.type).toBe("VOICE");
    });

    it("should add questions to existing quiz (POST /api/teacher/quizzes/[quizId]/questions)", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      const lesson = await createTestLesson({ streamId: stream.id, title: "Lesson" });
      const quiz = await createTestQuiz({ lessonId: lesson.id, title: "Quiz" });

      const request = new Request(`http://localhost:3000/api/teacher/quizzes/${quiz!.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Additional question?",
          type: "MULTIPLE_CHOICE",
          options: ["Option A", "Option B", "Option C"],
          correctOptionIndex: 0,
        }),
      });

      const response = await addQuizQuestion(request, {
        params: Promise.resolve({ quizId: quiz!.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.questionId).toBeDefined();

      const questions = await testPrisma.lessonQuizQuestion.findMany({
        where: { quizId: quiz!.id },
      });
      expect(questions).toHaveLength(2);
    });

    it("should add TEXT type question to quiz", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      const lesson = await createTestLesson({ streamId: stream.id, title: "Lesson" });
      const quiz = await createTestQuiz({ lessonId: lesson.id, title: "Quiz" });

      const request = new Request(`http://localhost:3000/api/teacher/quizzes/${quiz!.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Explain the meaning",
          type: "TEXT",
        }),
      });

      const response = await addQuizQuestion(request, {
        params: Promise.resolve({ quizId: quiz!.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should grade quiz submission (POST /api/teacher/quiz-submissions/[id]/check)", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      const lesson = await createTestLesson({ streamId: stream.id, title: "Lesson" });
      const quiz = await createTestQuiz({ lessonId: lesson.id, title: "Quiz" });

      const submission = await testPrisma.lessonQuizSubmission.create({
        data: {
          quizId: quiz!.id,
          studentId: student1.id,
          status: "SUBMITTED",
          answers: { 0: 0 },
        },
      });

      const request = new Request(`http://localhost:3000/api/teacher/quiz-submissions/${submission.id}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PASSED" }),
      });

      const response = await gradeQuizSubmission(request, {
        params: Promise.resolve({ submissionId: submission.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.status).toBe("PASSED");

      const graded = await testPrisma.lessonQuizSubmission.findUnique({ where: { id: submission.id } });
      expect(graded?.status).toBe("PASSED");
      expect(graded?.checkedById).toBe(teacher1.id);
      expect(graded?.checkedAt).toBeDefined();
    });

    it("should grade quiz submission as FAILED", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      const lesson = await createTestLesson({ streamId: stream.id, title: "Lesson" });
      const quiz = await createTestQuiz({ lessonId: lesson.id, title: "Quiz" });

      const submission = await testPrisma.lessonQuizSubmission.create({
        data: {
          quizId: quiz!.id,
          studentId: student1.id,
          status: "SUBMITTED",
          answers: { 0: 1 },
        },
      });

      const request = new Request(`http://localhost:3000/api/teacher/quiz-submissions/${submission.id}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "FAILED" }),
      });

      const response = await gradeQuizSubmission(request, {
        params: Promise.resolve({ submissionId: submission.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("FAILED");
    });

    it("should reject quiz creation for another teacher's lesson", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher2));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      const lesson = await createTestLesson({ streamId: stream.id, title: "Lesson" });

      const request = new Request("http://localhost:3000/api/teacher/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lesson.id,
          title: "Unauthorized Quiz",
          questions: [{ prompt: "Q?", type: "MULTIPLE_CHOICE", options: ["A", "B"], correctOptionIndex: 0 }],
        }),
      });

      const response = await createQuiz(request);
      expect(response.status).toBe(403);
    });

    it("should reject quiz creation without questions", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      const lesson = await createTestLesson({ streamId: stream.id, title: "Lesson" });

      const request = new Request("http://localhost:3000/api/teacher/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lesson.id,
          title: "Empty Quiz",
          questions: [],
        }),
      });

      const response = await createQuiz(request);
      expect(response.status).toBe(400);
    });

    it("should reject adding question with invalid multiple choice data", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      const lesson = await createTestLesson({ streamId: stream.id, title: "Lesson" });
      const quiz = await createTestQuiz({ lessonId: lesson.id, title: "Quiz" });

      const request = new Request(`http://localhost:3000/api/teacher/quizzes/${quiz!.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Bad question",
          type: "MULTIPLE_CHOICE",
          options: ["Only one option"],
          correctOptionIndex: 0,
        }),
      });

      const response = await addQuizQuestion(request, {
        params: Promise.resolve({ quizId: quiz!.id }),
      });
      expect(response.status).toBe(400);
    });

    it("should reject grading quiz with SUBMITTED status", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      const lesson = await createTestLesson({ streamId: stream.id, title: "Lesson" });
      const quiz = await createTestQuiz({ lessonId: lesson.id, title: "Quiz" });

      const submission = await testPrisma.lessonQuizSubmission.create({
        data: {
          quizId: quiz!.id,
          studentId: student1.id,
          status: "SUBMITTED",
          answers: {},
        },
      });

      const request = new Request(`http://localhost:3000/api/teacher/quiz-submissions/${submission.id}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SUBMITTED" }),
      });

      const response = await gradeQuizSubmission(request, {
        params: Promise.resolve({ submissionId: submission.id }),
      });
      expect(response.status).toBe(400);
    });

    it("should reject another teacher grading quiz submission", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher2));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      const lesson = await createTestLesson({ streamId: stream.id, title: "Lesson" });
      const quiz = await createTestQuiz({ lessonId: lesson.id, title: "Quiz" });

      const submission = await testPrisma.lessonQuizSubmission.create({
        data: {
          quizId: quiz!.id,
          studentId: student1.id,
          status: "SUBMITTED",
          answers: {},
        },
      });

      const request = new Request(`http://localhost:3000/api/teacher/quiz-submissions/${submission.id}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PASSED" }),
      });

      const response = await gradeQuizSubmission(request, {
        params: Promise.resolve({ submissionId: submission.id }),
      });
      expect(response.status).toBe(403);
    });
  });

  // ============================================================
  // 6. Teacher Enrollment Management
  // ============================================================
  describe("Enrollment Request Management", () => {
    it("should approve enrollment request (POST /api/teacher/enrollment-requests/[id]/review)", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course", capacity: 30 });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id, name: "Stream" });

      const enrollmentRequest = await testPrisma.enrollmentRequest.create({
        data: {
          studentId: student1.id,
          streamId: stream.id,
          status: "PENDING_REVIEW",
          message: "I want to join",
        },
      });

      const request = new Request(
        `http://localhost:3000/api/teacher/enrollment-requests/${enrollmentRequest.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "APPROVE" }),
        }
      );

      const response = await reviewEnrollmentRequest(request, {
        params: Promise.resolve({ id: enrollmentRequest.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("одобрена");

      const updated = await testPrisma.enrollmentRequest.findUnique({
        where: { id: enrollmentRequest.id },
      });
      expect(updated?.status).toBe("ACTIVE");
    });

    it("should approve enrollment with payment required", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course", capacity: 30 });
      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Stream",
      });
      await testPrisma.stream.update({
        where: { id: stream.id },
        data: { price: 1000 },
      });

      const enrollmentRequest = await testPrisma.enrollmentRequest.create({
        data: {
          studentId: student1.id,
          streamId: stream.id,
          status: "PENDING_REVIEW",
          message: "I want to join",
        },
      });

      const request = new Request(
        `http://localhost:3000/api/teacher/enrollment-requests/${enrollmentRequest.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "APPROVE" }),
        }
      );

      const response = await reviewEnrollmentRequest(request, {
        params: Promise.resolve({ id: enrollmentRequest.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const updated = await testPrisma.enrollmentRequest.findUnique({
        where: { id: enrollmentRequest.id },
      });
      expect(updated?.status).toBe("APPROVED_PENDING_PAYMENT");
    });

    it("should reject enrollment request (POST /api/teacher/enrollment-requests/[id]/review)", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course", capacity: 30 });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id, name: "Stream" });

      const enrollmentRequest = await testPrisma.enrollmentRequest.create({
        data: {
          studentId: student1.id,
          streamId: stream.id,
          status: "PENDING_REVIEW",
          message: "I want to join",
        },
      });

      const request = new Request(
        `http://localhost:3000/api/teacher/enrollment-requests/${enrollmentRequest.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "REJECT", rejectionReason: "Недостаточно мест" }),
        }
      );

      const response = await reviewEnrollmentRequest(request, {
        params: Promise.resolve({ id: enrollmentRequest.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("отклонена");

      const updated = await testPrisma.enrollmentRequest.findUnique({
        where: { id: enrollmentRequest.id },
      });
      expect(updated?.status).toBe("REJECTED");
      expect(updated?.rejectionReason).toBe("Недостаточно мест");
    });

    it("should confirm payment and create enrollment (POST /api/teacher/enrollment-requests/[id]/confirm-payment)", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course", capacity: 30 });
      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Stream",
      });
      await testPrisma.stream.update({
        where: { id: stream.id },
        data: { price: 1000 },
      });

      const enrollmentRequest = await testPrisma.enrollmentRequest.create({
        data: {
          studentId: student1.id,
          streamId: stream.id,
          status: "APPROVED_PENDING_PAYMENT",
          message: "I want to join",
        },
      });

      const request = new Request(
        `http://localhost:3000/api/teacher/enrollment-requests/${enrollmentRequest.id}/confirm-payment`,
        {
          method: "POST",
        }
      );

      const response = await confirmPayment(request, {
        params: Promise.resolve({ id: enrollmentRequest.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("Оплата подтверждена");

      const enrollment = await testPrisma.enrollment.findUnique({
        where: {
          userId_streamId: {
            userId: student1.id,
            streamId: stream.id,
          },
        },
      });
      expect(enrollment).toBeDefined();
      expect(enrollment?.status).toBe("ACTIVE");

      const updatedRequest = await testPrisma.enrollmentRequest.findUnique({
        where: { id: enrollmentRequest.id },
      });
      expect(updatedRequest?.status).toBe("ACTIVE");
      expect(updatedRequest?.paymentConfirmed).toBe(true);
    });

    it("should reject reviewing another teacher's enrollment request", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher2));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course", capacity: 30 });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id, name: "Stream" });

      const enrollmentRequest = await testPrisma.enrollmentRequest.create({
        data: {
          studentId: student1.id,
          streamId: stream.id,
          status: "PENDING_REVIEW",
          message: "I want to join",
        },
      });

      const request = new Request(
        `http://localhost:3000/api/teacher/enrollment-requests/${enrollmentRequest.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "APPROVE" }),
        }
      );

      const response = await reviewEnrollmentRequest(request, {
        params: Promise.resolve({ id: enrollmentRequest.id }),
      });
      expect(response.status).toBe(403);
    });

    it("should reject confirming payment for another teacher's request", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher2));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course", capacity: 30 });
      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Stream",
      });
      await testPrisma.stream.update({ where: { id: stream.id }, data: { price: 1000 } });

      const enrollmentRequest = await testPrisma.enrollmentRequest.create({
        data: {
          studentId: student1.id,
          streamId: stream.id,
          status: "APPROVED_PENDING_PAYMENT",
          message: "I want to join",
        },
      });

      const request = new Request(
        `http://localhost:3000/api/teacher/enrollment-requests/${enrollmentRequest.id}/confirm-payment`,
        {
          method: "POST",
        }
      );

      const response = await confirmPayment(request, {
        params: Promise.resolve({ id: enrollmentRequest.id }),
      });
      expect(response.status).toBe(403);
    });

    it("should reject approving already reviewed enrollment request", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course", capacity: 30 });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id, name: "Stream" });

      const enrollmentRequest = await testPrisma.enrollmentRequest.create({
        data: {
          studentId: student1.id,
          streamId: stream.id,
          status: "ACTIVE",
          message: "Already enrolled",
        },
      });

      const request = new Request(
        `http://localhost:3000/api/teacher/enrollment-requests/${enrollmentRequest.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "APPROVE" }),
        }
      );

      const response = await reviewEnrollmentRequest(request, {
        params: Promise.resolve({ id: enrollmentRequest.id }),
      });
      expect(response.status).toBe(400);
    });

    it("should reject confirming payment for non-pending request", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course", capacity: 30 });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id, name: "Stream" });

      const enrollmentRequest = await testPrisma.enrollmentRequest.create({
        data: {
          studentId: student1.id,
          streamId: stream.id,
          status: "PENDING_REVIEW",
          message: "Not yet approved",
        },
      });

      const request = new Request(
        `http://localhost:3000/api/teacher/enrollment-requests/${enrollmentRequest.id}/confirm-payment`,
        {
          method: "POST",
        }
      );

      const response = await confirmPayment(request, {
        params: Promise.resolve({ id: enrollmentRequest.id }),
      });
      expect(response.status).toBe(400);
    });
  });

  // ============================================================
  // 7. Teacher Analytics
  // ============================================================
  describe("Teacher Analytics", () => {
    it("should get analytics for teacher's stream (GET /api/teacher/analytics)", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id, name: "Analytics Stream" });
      const enrollment = await createTestEnrollment({ userId: student1.id, streamId: stream.id });

      await testPrisma.activitySession.create({
        data: {
          userId: student1.id,
          streamId: stream.id,
          kind: "LESSON",
          startedAt: new Date(),
          lastSeenAt: new Date(),
        },
      });

      const request = new Request(`http://localhost:3000/api/teacher/analytics?streamId=${stream.id}`);
      const response = await getAnalytics(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stream.id).toBe(stream.id);
      expect(data.stream.name).toBe("Analytics Stream");
      expect(data.stream.courseTitle).toBe("Course");
      expect(data.retentionDays).toBe(30);
      expect(data.students).toHaveLength(1);
      expect(data.students[0].studentId).toBe(student1.id);
      expect(data.students[0].name).toBe("Student One");
      expect(data.students[0].enrollmentId).toBe(enrollment.id);
    });

    it("should reject analytics access for another teacher's stream", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher2));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id, name: "Stream" });

      const request = new Request(`http://localhost:3000/api/teacher/analytics?streamId=${stream.id}`);
      const response = await getAnalytics(request);
      expect(response.status).toBe(403);
    });

    it("should reject analytics without streamId", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const request = new Request("http://localhost:3000/api/teacher/analytics");
      const response = await getAnalytics(request);
      expect(response.status).toBe(400);
    });

    it("should reject analytics access by student", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(student1));

      const request = new Request("http://localhost:3000/api/teacher/analytics?streamId=some-id");
      const response = await getAnalytics(request);
      expect(response.status).toBe(401);
    });
  });

  // ============================================================
  // 8. Teacher Profile
  // ============================================================
  describe("Teacher Profile", () => {
    it("should create teacher profile (POST /api/teacher/profile)", async () => {
      const newTeacher = await createTestUser({
        email: "newteacher@profile.com",
        name: "New Teacher",
        role: "TEACHER",
      });

      await testPrisma.user.update({
        where: { id: newTeacher.id },
        data: { emailVerified: new Date() },
      });

      vi.mocked(getServerSession).mockResolvedValue(createMockSession(newTeacher));

      const request = new Request("http://localhost:3000/api/teacher/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: "Experienced teacher of Quran and Arabic",
          subjects: ["Quran", "Arabic", "Tajweed"],
          experience: 10,
          qualifications: "PhD in Islamic Studies",
          whatsappPhone: "+79001234567",
          documentsUrls: [],
        }),
      });

      const response = await createTeacherProfile(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("Анкета отправлена");

      const profile = await testPrisma.teacherProfile.findUnique({
        where: { userId: newTeacher.id },
      });
      expect(profile).toBeDefined();
      expect(profile?.bio).toBe("Experienced teacher of Quran and Arabic");
      expect(profile?.subjects).toEqual(["Quran", "Arabic", "Tajweed"]);
      expect(profile?.experience).toBe(10);

      const user = await testPrisma.user.findUnique({ where: { id: newTeacher.id } });
      expect(user?.status).toBe("PENDING_APPROVAL");
    });

    it("should update teacher profile (PATCH /api/teacher/profile)", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      await testPrisma.teacherProfile.create({
        data: {
          userId: teacher1.id,
          bio: "Old bio",
          subjects: ["Quran"],
          experience: 5,
          qualifications: "BA",
          whatsappPhone: "+79001234567",
          documentsUrls: [],
        },
      });

      const request = new Request("http://localhost:3000/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Teacher Name",
          bio: "New bio",
          skills: ["Tajweed", "Arabic Grammar"],
          gender: "MALE",
        }),
      });

      const response = await updateTeacherProfile(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const user = await testPrisma.user.findUnique({ where: { id: teacher1.id } });
      expect(user?.name).toBe("Updated Teacher Name");
      expect(user?.gender).toBe("MALE");

      const profile = await testPrisma.teacherProfile.findUnique({
        where: { userId: teacher1.id },
      });
      expect(profile?.bio).toBe("New bio");
      expect(profile?.skills).toEqual(["Tajweed", "Arabic Grammar"]);
    });

    it("should reject creating profile if already exists", async () => {
      const dupTeacher = await createTestUser({
        email: "dupprofile@profile.com",
        name: "Dup Teacher",
        role: "TEACHER",
      });

      await testPrisma.user.update({
        where: { id: dupTeacher.id },
        data: { emailVerified: new Date() },
      });

      await testPrisma.teacherProfile.create({
        data: {
          userId: dupTeacher.id,
          bio: "Existing profile",
          subjects: ["Quran"],
          experience: 5,
          qualifications: "BA",
          whatsappPhone: "+79001234567",
          documentsUrls: [],
        },
      });

      vi.mocked(getServerSession).mockResolvedValue(createMockSession(dupTeacher));

      const request = new Request("http://localhost:3000/api/teacher/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: "New profile",
          subjects: ["Arabic"],
          experience: 3,
          qualifications: "MA",
          whatsappPhone: "+79001234567",
          documentsUrls: [],
        }),
      });

      const response = await createTeacherProfile(request);
      expect(response.status).toBe(400);
    });

    it("should reject creating profile without verified email", async () => {
      const unverifiedTeacher = await createTestUser({
        email: "unverified@profile.com",
        name: "Unverified Teacher",
        role: "TEACHER",
      });

      vi.mocked(getServerSession).mockResolvedValue(createMockSession(unverifiedTeacher));

      const request = new Request("http://localhost:3000/api/teacher/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: "Bio",
          subjects: ["Quran"],
          experience: 5,
          qualifications: "BA",
          whatsappPhone: "+79001234567",
          documentsUrls: [],
        }),
      });

      const response = await createTeacherProfile(request);
      expect(response.status).toBe(403);
    });

    it("should reject profile update with empty name", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const request = new Request("http://localhost:3000/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "   " }),
      });

      const response = await updateTeacherProfile(request);
      expect(response.status).toBe(400);
    });

    it("should reject profile update with no fields", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const request = new Request("http://localhost:3000/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await updateTeacherProfile(request);
      expect(response.status).toBe(400);
    });

    it("should reject profile update with invalid gender", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const request = new Request("http://localhost:3000/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gender: "INVALID" }),
      });

      const response = await updateTeacherProfile(request);
      expect(response.status).toBe(400);
    });

    it("should reject profile update by student", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(student1));

      const request = new Request("http://localhost:3000/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Hacked Name" }),
      });

      const response = await updateTeacherProfile(request);
      expect(response.status).toBe(401);
    });
  });

  // ============================================================
  // 9. Full Teacher Workflow Integration
  // ============================================================
  describe("Full Teacher Workflow Integration", () => {
    it("should complete full course lifecycle: create course -> stream -> lessons -> homework -> quiz -> grade", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      // Step 1: Create course
      const courseRequest = new Request("http://localhost:3000/api/teacher/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Complete Quran Course",
          description: "Full course covering Quran recitation and memorization",
          capacity: 20,
          published: true,
        }),
      });
      const courseResponse = await createCourse(courseRequest);
      const courseData = await courseResponse.json();
      expect(courseResponse.status).toBe(200);
      const courseId = courseData.course.id;

      // Step 2: Create stream
      const streamRequest = new Request("http://localhost:3000/api/teacher/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          name: "Morning Recitation Group",
          level: "Intermediate",
          slots: [
            { dayOfWeek: 1, startMinutes: 540, durationMinutes: 60 },
            { dayOfWeek: 3, startMinutes: 540, durationMinutes: 60 },
          ],
        }),
      });
      const streamResponse = await createStream(streamRequest);
      const streamData = await streamResponse.json();
      expect(streamResponse.status).toBe(200);
      const streamId = streamData.stream.id;

      // Step 3: Create lessons
      const lesson1Request = new Request("http://localhost:3000/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId,
          title: "Lesson 1: Al-Fatiha",
          type: "TEXT",
          content: "Introduction to Al-Fatiha",
          sortOrder: 1,
        }),
      });
      const lesson1Response = await createLesson(lesson1Request);
      const lesson1Data = await lesson1Response.json();
      expect(lesson1Response.status).toBe(200);
      const lesson1Id = lesson1Data.lesson.id;

      const lesson2Request = new Request("http://localhost:3000/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId,
          title: "Lesson 2: Al-Baqarah",
          type: "TEXT",
          content: "Introduction to Al-Baqarah",
          sortOrder: 2,
        }),
      });
      const lesson2Response = await createLesson(lesson2Request);
      expect(lesson2Response.status).toBe(200);

      // Step 4: Create quiz for lesson 1
      const quizRequest = new Request("http://localhost:3000/api/teacher/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lesson1Id,
          title: "Al-Fatiha Quiz",
          questions: [
            {
              prompt: "How many verses in Al-Fatiha?",
              type: "MULTIPLE_CHOICE",
              options: ["5", "7", "9"],
              correctOptionIndex: 1,
            },
          ],
        }),
      });
      const quizResponse = await createQuiz(quizRequest);
      const quizData = await quizResponse.json();
      expect(quizResponse.status).toBe(200);
      const quizId = quizData.quizId;

      // Step 5: Create homework
      const hwRequest = new Request("http://localhost:3000/api/teacher/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId,
          lessonId: lesson1Id,
          title: "Memorize Al-Fatiha",
          description: "Memorize and recite Al-Fatiha",
          type: "AUDIO",
        }),
      });
      const hwResponse = await createHomework(hwRequest);
      const hwData = await hwResponse.json();
      expect(hwResponse.status).toBe(200);
      const hwId = hwData.assignment.id;

      // Step 6: Enroll a student
      const enrollment = await createTestEnrollment({ userId: student1.id, streamId });

      // Step 7: Student submits homework
      const hwSubmission = await testPrisma.homeworkSubmission.create({
        data: {
          assignmentId: hwId,
          enrollmentId: enrollment.id,
          contentText: "I have memorized Al-Fatiha",
          status: "SUBMITTED",
        },
      });

      // Step 8: Teacher grades homework
      const gradeHwRequest = new Request(
        `http://localhost:3000/api/teacher/homework/submissions/${hwSubmission.id}/check`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "ACCEPTED",
            grade: 95,
            teacherComment: "Excellent memorization!",
          }),
        }
      );
      const gradeHwResponse = await gradeHomeworkSubmission(gradeHwRequest, {
        params: Promise.resolve({ id: hwSubmission.id }),
      });
      const gradeHwData = await gradeHwResponse.json();
      expect(gradeHwResponse.status).toBe(200);
      expect(gradeHwData.status).toBe("ACCEPTED");

      // Step 9: Student submits quiz
      const quizSubmission = await testPrisma.lessonQuizSubmission.create({
        data: {
          quizId,
          studentId: student1.id,
          status: "SUBMITTED",
          answers: { 0: 1 },
        },
      });

      // Step 10: Teacher grades quiz
      const gradeQuizRequest = new Request(
        `http://localhost:3000/api/teacher/quiz-submissions/${quizSubmission.id}/check`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "PASSED" }),
        }
      );
      const gradeQuizResponse = await gradeQuizSubmission(gradeQuizRequest, {
        params: Promise.resolve({ submissionId: quizSubmission.id }),
      });
      const gradeQuizData = await gradeQuizResponse.json();
      expect(gradeQuizResponse.status).toBe(200);
      expect(gradeQuizData.status).toBe("PASSED");

      // Step 11: Verify analytics
      const analyticsRequest = new Request(`http://localhost:3000/api/teacher/analytics?streamId=${streamId}`);
      const analyticsResponse = await getAnalytics(analyticsRequest);
      const analyticsData = await analyticsResponse.json();
      expect(analyticsResponse.status).toBe(200);
      expect(analyticsData.students).toHaveLength(1);
      expect(analyticsData.students[0].studentId).toBe(student1.id);

      // Step 12: Verify course has all resources
      const coursesRequest = new Request("http://localhost:3000/api/teacher/courses");
      const coursesResponse = await getCourses(coursesRequest);
      const coursesData = await coursesResponse.json();
      expect(coursesResponse.status).toBe(200);
      expect(coursesData.courses.some((c: { id: string }) => c.id === courseId)).toBe(true);

      // Step 13: Verify stream has all resources
      const streamsRequest = new Request("http://localhost:3000/api/teacher/streams");
      const streamsResponse = await getStreams(streamsRequest);
      const streamsData = await streamsResponse.json();
      expect(streamsResponse.status).toBe(200);
      expect(streamsData.streams.some((s: { id: string }) => s.id === streamId)).toBe(true);
    });

    it("should handle enrollment request workflow: request -> approve -> confirm payment -> enrollment", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      // Setup
      const course = await createTestCourse({ teacherId: teacher1.id, title: "Paid Course", capacity: 30 });
      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Paid Stream",
      });
      await testPrisma.stream.update({ where: { id: stream.id }, data: { price: 5000 } });

      // Student submits enrollment request
      const enrollmentRequest = await testPrisma.enrollmentRequest.create({
        data: {
          studentId: student1.id,
          streamId: stream.id,
          status: "PENDING_REVIEW",
          message: "I want to join this course",
        },
      });

      // Teacher approves (with payment required)
      const approveRequest = new Request(
        `http://localhost:3000/api/teacher/enrollment-requests/${enrollmentRequest.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "APPROVE" }),
        }
      );
      const approveResponse = await reviewEnrollmentRequest(approveRequest, {
        params: Promise.resolve({ id: enrollmentRequest.id }),
      });
      const approveData = await approveResponse.json();
      expect(approveResponse.status).toBe(200);

      const pendingRequest = await testPrisma.enrollmentRequest.findUnique({
        where: { id: enrollmentRequest.id },
      });
      expect(pendingRequest?.status).toBe("APPROVED_PENDING_PAYMENT");

      // Teacher confirms payment
      const confirmRequest = new Request(
        `http://localhost:3000/api/teacher/enrollment-requests/${enrollmentRequest.id}/confirm-payment`,
        { method: "POST" }
      );
      const confirmResponse = await confirmPayment(confirmRequest, {
        params: Promise.resolve({ id: enrollmentRequest.id }),
      });
      const confirmData = await confirmResponse.json();
      expect(confirmResponse.status).toBe(200);

      // Verify enrollment was created
      const enrollment = await testPrisma.enrollment.findUnique({
        where: {
          userId_streamId: {
            userId: student1.id,
            streamId: stream.id,
          },
        },
      });
      expect(enrollment).toBeDefined();
      expect(enrollment?.status).toBe("ACTIVE");
    });
  });

  // ============================================================
  // 10. Edge Cases and Error Handling
  // ============================================================
  describe("Edge Cases and Error Handling", () => {
    it("should handle malformed JSON in request body", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const request = new Request("http://localhost:3000/api/teacher/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid json",
      });

      const response = await createCourse(request);
      expect(response.status).toBe(400);
    });

    it("should handle non-existent resource IDs", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const request = new Request("http://localhost:3000/api/teacher/courses/non-existent-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Title" }),
      });

      const response = await updateCourse(request, {
        params: Promise.resolve({ courseId: "non-existent-id" }),
      });
      expect(response.status).toBe(404);
    });

    it("should handle lesson update with no fields to update", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      const lesson = await createTestLesson({ streamId: stream.id, title: "Lesson" });

      const request = new Request(`http://localhost:3000/api/teacher/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "" }),
      });

      const response = await updateLesson(request, {
        params: Promise.resolve({ lessonId: lesson.id }),
      });
      expect(response.status).toBe(400);
    });

    it("should handle course update with no fields to update", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });

      const request = new Request(`http://localhost:3000/api/teacher/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "" }),
      });

      const response = await updateCourse(request, {
        params: Promise.resolve({ courseId: course.id }),
      });
      expect(response.status).toBe(400);
    });

    it("should handle homework submission grading for non-existent submission", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const request = new Request(
        "http://localhost:3000/api/teacher/homework/submissions/non-existent/check",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ACCEPTED" }),
        }
      );

      const response = await gradeHomeworkSubmission(request, {
        params: Promise.resolve({ id: "non-existent" }),
      });
      expect(response.status).toBe(404);
    });

    it("should handle quiz grading for non-existent submission", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const request = new Request(
        "http://localhost:3000/api/teacher/quiz-submissions/non-existent/check",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "PASSED" }),
        }
      );

      const response = await gradeQuizSubmission(request, {
        params: Promise.resolve({ submissionId: "non-existent" }),
      });
      expect(response.status).toBe(404);
    });

    it("should handle analytics for non-existent stream", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const request = new Request("http://localhost:3000/api/teacher/analytics?streamId=non-existent");
      const response = await getAnalytics(request);
      expect(response.status).toBe(404);
    });

    it("should handle enrollment request review for non-existent request", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const request = new Request(
        "http://localhost:3000/api/teacher/enrollment-requests/non-existent/review",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "APPROVE" }),
        }
      );

      const response = await reviewEnrollmentRequest(request, {
        params: Promise.resolve({ id: "non-existent" }),
      });
      expect(response.status).toBe(404);
    });

    it("should handle stream update with invalid hex color", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({ teacherId: teacher1.id, title: "Course" });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher1.id });
      await testPrisma.streamScheduleSlot.create({
        data: { streamId: stream.id, dayOfWeek: 1, startMinutes: 540, durationMinutes: 60 },
      });

      const request = new Request(`http://localhost:3000/api/teacher/streams/${stream.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Name",
          color: "not-a-color",
          slots: [{ dayOfWeek: 1, startMinutes: 540, durationMinutes: 60 }],
        }),
      });

      const response = await updateStream(request, {
        params: Promise.resolve({ streamId: stream.id }),
      });
      expect(response.status).toBe(400);
    });

    it("should handle profile update with too-long name", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const request = new Request("http://localhost:3000/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "A".repeat(101) }),
      });

      const response = await updateTeacherProfile(request);
      expect(response.status).toBe(400);
    });

    it("should handle profile update with too-long bio", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const request = new Request("http://localhost:3000/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: "A".repeat(1001) }),
      });

      const response = await updateTeacherProfile(request);
      expect(response.status).toBe(400);
    });

    it("should handle profile update with too-long skill tag", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const request = new Request("http://localhost:3000/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills: ["A".repeat(51)] }),
      });

      const response = await updateTeacherProfile(request);
      expect(response.status).toBe(400);
    });
  });
});
