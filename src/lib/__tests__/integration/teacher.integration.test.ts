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
  createMockSession,
} from "./setup";

// Import API route handlers
import { GET as getCourses, POST as createCourse } from "@/app/api/teacher/courses/route";
import { GET as getStreams, POST as createStream } from "@/app/api/teacher/streams/route";
import { POST as createLesson, PATCH as reorderLessons } from "@/app/api/teacher/lessons/route";
import { POST as manageStudent } from "@/app/api/teacher/manage-student/route";
import { GET as getSchedule } from "@/app/api/teacher/schedule/route";
import { GET as validateInvite, POST as joinViaInvite } from "@/app/api/join/[token]/route";

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

describe("Teacher Management API Integration Tests", () => {
  let teacher1: Awaited<ReturnType<typeof createTestUser>>;
  let teacher2: Awaited<ReturnType<typeof createTestUser>>;
  let student1: Awaited<ReturnType<typeof createTestUser>>;
  let student2: Awaited<ReturnType<typeof createTestUser>>;

  beforeAll(async () => {
    // Clean everything first
    await cleanupDatabase();

    // Create test users
    teacher1 = await createTestUser({
      email: "teacher1@test.com",
      name: "Teacher One",
      role: "TEACHER",
    });

    teacher2 = await createTestUser({
      email: "teacher2@test.com",
      name: "Teacher Two",
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
  });

  afterEach(async () => {
    // Clean up test data after each test, but preserve users
    await testPrisma.activitySession.deleteMany();
    await testPrisma.homeworkSubmission.deleteMany();
    await testPrisma.homeworkAssignment.deleteMany();
    await testPrisma.homework.deleteMany();
    await testPrisma.lessonQuizSubmission.deleteMany();
    await testPrisma.lessonQuizOption.deleteMany();
    await testPrisma.lessonQuizQuestion.deleteMany();
    await testPrisma.lessonQuiz.deleteMany();
    await testPrisma.lesson.deleteMany();
    await testPrisma.streamScheduleSlot.deleteMany();
    await testPrisma.inviteToken.deleteMany();
    await testPrisma.enrollment.deleteMany();
    await testPrisma.stream.deleteMany();
    await testPrisma.course.deleteMany();
    // Don't delete users - they're reused across tests
  });

  afterAll(async () => {
    // Clean up everything including users
    await cleanupDatabase();
    await disconnectDatabase();
  });

  describe("Course Management", () => {
    it("should allow teacher to create a course", async () => {
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
      expect(data.course).toBeDefined();
      expect(data.course.title).toBe("Islamic Studies 101");
      expect(data.course.teacherId).toBe(teacher1.id);
    });

    it("should fetch only teacher's own courses", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      // Create courses for both teachers
      const course1 = await createTestCourse({
        teacherId: teacher1.id,
        title: "Teacher 1 Course",
      });

      await createTestCourse({
        teacherId: teacher2.id,
        title: "Teacher 2 Course",
      });

      const request = new Request("http://localhost:3000/api/teacher/courses");
      const response = await getCourses(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.courses).toHaveLength(1);
      expect(data.courses[0].id).toBe(course1.id);
      expect(data.courses[0].title).toBe("Teacher 1 Course");
    });

    it("should reject course creation by student", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(student1));

      const request = new Request("http://localhost:3000/api/teacher/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Unauthorized Course",
          description: "Should fail",
          capacity: 30,
          published: true,
        }),
      });

      const response = await createCourse(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it("should reject course creation without authentication", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/teacher/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Unauthorized Course",
          description: "Should fail",
          capacity: 30,
          published: true,
        }),
      });

      const response = await createCourse(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });
  });

  describe("Stream Management", () => {
    it("should allow teacher to create a stream with schedule slots", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Test Course",
      });

      const request = new Request("http://localhost:3000/api/teacher/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          name: "Morning Group",
          level: "Beginner",
          slots: [
            { dayOfWeek: 1, startMinutes: 540, durationMinutes: 60 }, // Mon 9:00-10:00
            { dayOfWeek: 3, startMinutes: 540, durationMinutes: 60 }, // Wed 9:00-10:00
          ],
          color: "#10b981",
        }),
      });

      const response = await createStream(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stream).toBeDefined();
      expect(data.stream.name).toBe("Morning Group");
      expect(data.stream.teacherId).toBe(teacher1.id);

      // Verify schedule slots were created
      const slots = await testPrisma.streamScheduleSlot.findMany({
        where: { streamId: data.stream.id },
      });
      expect(slots).toHaveLength(2);
      expect(slots[0].dayOfWeek).toBe(1);
      expect(slots[0].startMinutes).toBe(540);
    });

    it("should reject stream creation for another teacher's course", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher2));

      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Teacher 1 Course",
      });

      const request = new Request("http://localhost:3000/api/teacher/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          name: "Unauthorized Stream",
          level: "Beginner",
          slots: [{ dayOfWeek: 1, startMinutes: 540, durationMinutes: 60 }],
        }),
      });

      const response = await createStream(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
    });

    it("should reject overlapping schedule slots for same teacher", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Test Course",
      });

      // Create first stream with a slot
      const stream1 = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Stream 1",
      });

      await testPrisma.streamScheduleSlot.create({
        data: {
          streamId: stream1.id,
          dayOfWeek: 1,
          startMinutes: 540, // Mon 9:00
          durationMinutes: 60,
        },
      });

      // Try to create second stream with overlapping slot
      const request = new Request("http://localhost:3000/api/teacher/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          name: "Stream 2",
          level: "Beginner",
          slots: [
            { dayOfWeek: 1, startMinutes: 570, durationMinutes: 60 }, // Mon 9:30-10:30 (overlaps)
          ],
        }),
      });

      const response = await createStream(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("Конфликт расписания");
    });

    it("should fetch only teacher's own streams", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course1 = await createTestCourse({
        teacherId: teacher1.id,
        title: "Course 1",
      });

      const course2 = await createTestCourse({
        teacherId: teacher2.id,
        title: "Course 2",
      });

      await createTestStream({
        courseId: course1.id,
        teacherId: teacher1.id,
        name: "Teacher 1 Stream",
      });

      await createTestStream({
        courseId: course2.id,
        teacherId: teacher2.id,
        name: "Teacher 2 Stream",
      });

      const request = new Request("http://localhost:3000/api/teacher/streams");
      const response = await getStreams(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.streams).toHaveLength(1);
      expect(data.streams[0].name).toBe("Teacher 1 Stream");
    });

    it("should reject stream creation without schedule slots", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Test Course",
      });

      const request = new Request("http://localhost:3000/api/teacher/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          name: "No Schedule Stream",
          level: "Beginner",
          slots: [],
        }),
      });

      const response = await createStream(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("слот расписания");
    });
  });

  describe("Lesson Management", () => {
    it("should allow teacher to create a lesson", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Test Course",
      });

      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Test Stream",
      });

      const request = new Request("http://localhost:3000/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId: stream.id,
          title: "Introduction to Fatiha",
          type: "TEXT",
          content: "This is the lesson content",
          sortOrder: 1,
        }),
      });

      const response = await createLesson(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.lesson).toBeDefined();
      expect(data.lesson.title).toBe("Introduction to Fatiha");
      expect(data.lesson.streamId).toBe(stream.id);
      expect(data.lesson.sortOrder).toBe(1);
    });

    it("should reject lesson creation for another teacher's stream", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher2));

      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Test Course",
      });

      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Test Stream",
      });

      const request = new Request("http://localhost:3000/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId: stream.id,
          title: "Unauthorized Lesson",
          type: "TEXT",
          content: "Should fail",
        }),
      });

      const response = await createLesson(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
    });

    it("should allow teacher to reorder lessons", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Test Course",
      });

      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Test Stream",
      });

      // Create three lessons
      const lesson1 = await createTestLesson({
        streamId: stream.id,
        title: "Lesson 1",
        sortOrder: 1,
      });

      const lesson2 = await createTestLesson({
        streamId: stream.id,
        title: "Lesson 2",
        sortOrder: 2,
      });

      const lesson3 = await createTestLesson({
        streamId: stream.id,
        title: "Lesson 3",
        sortOrder: 3,
      });

      // Reorder: 3, 1, 2
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

      // Verify new order
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

    it("should reject reordering lessons from another teacher's stream", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher2));

      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Test Course",
      });

      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Test Stream",
      });

      const lesson1 = await createTestLesson({
        streamId: stream.id,
        title: "Lesson 1",
        sortOrder: 1,
      });

      const request = new Request("http://localhost:3000/api/teacher/lessons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId: stream.id,
          lessonIdsInOrder: [lesson1.id],
        }),
      });

      const response = await reorderLessons(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
    });

    it("should auto-assign sortOrder if not provided", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Test Course",
      });

      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Test Stream",
      });

      // Create first lesson without sortOrder
      const request1 = new Request("http://localhost:3000/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId: stream.id,
          title: "First Lesson",
          type: "TEXT",
          content: "Content",
        }),
      });

      const response1 = await createLesson(request1);
      const data1 = await response1.json();

      expect(data1.lesson.sortOrder).toBe(1);

      // Create second lesson without sortOrder
      const request2 = new Request("http://localhost:3000/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId: stream.id,
          title: "Second Lesson",
          type: "TEXT",
          content: "Content",
        }),
      });

      const response2 = await createLesson(request2);
      const data2 = await response2.json();

      expect(data2.lesson.sortOrder).toBe(2);
    });
  });

  describe("Invite Token and Student Enrollment", () => {
    it("should allow teacher to generate invite token", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Test Course",
        capacity: 30,
      });

      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Test Stream",
      });

      const request = new Request("http://localhost:3000/api/teacher/manage-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generateInvite",
          payload: { streamId: stream.id },
        }),
      });

      const response = await manageStudent(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.inviteLink).toBeDefined();
      expect(data.inviteLink).toContain("/join/");

      // Verify token was created in database
      const token = await testPrisma.inviteToken.findUnique({
        where: { streamId: stream.id },
      });
      expect(token).toBeDefined();
      expect(data.inviteLink).toContain(token!.token);
    });

    it("should reject invite generation for another teacher's stream", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher2));

      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Test Course",
      });

      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Test Stream",
      });

      const request = new Request("http://localhost:3000/api/teacher/manage-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generateInvite",
          payload: { streamId: stream.id },
        }),
      });

      const response = await manageStudent(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
    });

    it("should allow student to validate invite token", async () => {
      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Test Course",
        capacity: 30,
      });

      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Test Stream",
      });

      const token = await testPrisma.inviteToken.create({
        data: {
          token: crypto.randomUUID(),
          streamId: stream.id,
        },
      });

      const request = new Request(`http://localhost:3000/api/join/${token.token}`, {
        method: "GET",
      });

      const response = await validateInvite(request, {
        params: Promise.resolve({ token: token.token }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.streamId).toBe(stream.id);
      expect(data.streamName).toBe("Test Stream");
      expect(data.courseName).toBe("Test Course");
      expect(data.remaining).toBe(30);
    });

    it("should allow student to join via invite token", async () => {
      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Test Course",
        capacity: 30,
      });

      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Test Stream",
      });

      const token = await testPrisma.inviteToken.create({
        data: {
          token: crypto.randomUUID(),
          streamId: stream.id,
        },
      });

      const request = new Request(`http://localhost:3000/api/join/${token.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: student1.id }),
      });

      const response = await joinViaInvite(request, {
        params: Promise.resolve({ token: token.token }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.enrollment).toBeDefined();
      expect(data.enrollment.userId).toBe(student1.id);
      expect(data.enrollment.streamId).toBe(stream.id);
      expect(data.enrollment.status).toBe("ACTIVE");
    });

    it("should reject enrollment when stream is at capacity", async () => {
      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Test Course",
        capacity: 1, // Only 1 spot
      });

      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Test Stream",
      });

      // Fill the capacity
      await createTestEnrollment({
        userId: student1.id,
        streamId: stream.id,
        status: "ACTIVE",
      });

      const token = await testPrisma.inviteToken.create({
        data: {
          token: crypto.randomUUID(),
          streamId: stream.id,
        },
      });

      const request = new Request(`http://localhost:3000/api/join/${token.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: student2.id }),
      });

      const response = await joinViaInvite(request, {
        params: Promise.resolve({ token: token.token }),
      });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("full");
    });

    it("should reject enrollment with invalid token", async () => {
      const request = new Request("http://localhost:3000/api/join/invalid-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: student1.id }),
      });

      const response = await joinViaInvite(request, {
        params: Promise.resolve({ token: "invalid-token" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });

  describe("Student Management Operations", () => {
    it("should allow teacher to transfer student between their own streams", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Test Course",
      });

      const stream1 = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Stream 1",
      });

      const stream2 = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Stream 2",
      });

      const enrollment = await createTestEnrollment({
        userId: student1.id,
        streamId: stream1.id,
        status: "ACTIVE",
      });

      const request = new Request("http://localhost:3000/api/teacher/manage-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transferStudent",
          payload: {
            enrollmentId: enrollment.id,
            targetStreamId: stream2.id,
          },
        }),
      });

      const response = await manageStudent(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify old enrollment is marked as TRANSFERRED
      const oldEnrollment = await testPrisma.enrollment.findUnique({
        where: { id: enrollment.id },
      });
      expect(oldEnrollment?.status).toBe("TRANSFERRED");

      // Verify new enrollment is ACTIVE in target stream
      const newEnrollment = await testPrisma.enrollment.findUnique({
        where: {
          userId_streamId: {
            userId: student1.id,
            streamId: stream2.id,
          },
        },
      });
      expect(newEnrollment).toBeDefined();
      expect(newEnrollment?.status).toBe("ACTIVE");
    });

    it("should reject transfer to another teacher's stream", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course1 = await createTestCourse({
        teacherId: teacher1.id,
        title: "Teacher 1 Course",
      });

      const course2 = await createTestCourse({
        teacherId: teacher2.id,
        title: "Teacher 2 Course",
      });

      const stream1 = await createTestStream({
        courseId: course1.id,
        teacherId: teacher1.id,
        name: "Stream 1",
      });

      const stream2 = await createTestStream({
        courseId: course2.id,
        teacherId: teacher2.id,
        name: "Stream 2",
      });

      const enrollment = await createTestEnrollment({
        userId: student1.id,
        streamId: stream1.id,
        status: "ACTIVE",
      });

      const request = new Request("http://localhost:3000/api/teacher/manage-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transferStudent",
          payload: {
            enrollmentId: enrollment.id,
            targetStreamId: stream2.id,
          },
        }),
      });

      const response = await manageStudent(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
    });

    it("should allow teacher to kick student from stream", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Test Course",
      });

      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Test Stream",
      });

      const enrollment = await createTestEnrollment({
        userId: student1.id,
        streamId: stream.id,
        status: "ACTIVE",
      });

      const request = new Request("http://localhost:3000/api/teacher/manage-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "kickStudent",
          payload: { enrollmentId: enrollment.id },
        }),
      });

      const response = await manageStudent(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify enrollment is marked as KICKED
      const updatedEnrollment = await testPrisma.enrollment.findUnique({
        where: { id: enrollment.id },
      });
      expect(updatedEnrollment?.status).toBe("KICKED");
    });

    it("should reject kicking student from another teacher's stream", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher2));

      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Test Course",
      });

      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Test Stream",
      });

      const enrollment = await createTestEnrollment({
        userId: student1.id,
        streamId: stream.id,
        status: "ACTIVE",
      });

      const request = new Request("http://localhost:3000/api/teacher/manage-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "kickStudent",
          payload: { enrollmentId: enrollment.id },
        }),
      });

      const response = await manageStudent(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
    });

    it("should allow teacher to mark student as repeating", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Test Course",
      });

      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Test Stream",
      });

      const enrollment = await createTestEnrollment({
        userId: student1.id,
        streamId: stream.id,
        status: "ACTIVE",
      });

      const request = new Request("http://localhost:3000/api/teacher/manage-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "repeatYear",
          payload: { enrollmentId: enrollment.id },
        }),
      });

      const response = await manageStudent(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify enrollment is marked as REPEATING
      const updatedEnrollment = await testPrisma.enrollment.findUnique({
        where: { id: enrollment.id },
      });
      expect(updatedEnrollment?.status).toBe("REPEATING");
    });

    it("should allow teacher to revoke invite token", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Test Course",
      });

      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Test Stream",
      });

      await testPrisma.inviteToken.create({
        data: {
          token: crypto.randomUUID(),
          streamId: stream.id,
        },
      });

      const request = new Request("http://localhost:3000/api/teacher/manage-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revokeInvite",
          payload: { streamId: stream.id },
        }),
      });

      const response = await manageStudent(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify token was deleted
      const deletedToken = await testPrisma.inviteToken.findUnique({
        where: { streamId: stream.id },
      });
      expect(deletedToken).toBeNull();
    });

    it("should reject unknown action in manage-student endpoint", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const request = new Request("http://localhost:3000/api/teacher/manage-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unknownAction",
          payload: {},
        }),
      });

      const response = await manageStudent(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe("Schedule Management", () => {
    it("should fetch only teacher's own schedule slots", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course1 = await createTestCourse({
        teacherId: teacher1.id,
        title: "Course 1",
      });

      const course2 = await createTestCourse({
        teacherId: teacher2.id,
        title: "Course 2",
      });

      const stream1 = await createTestStream({
        courseId: course1.id,
        teacherId: teacher1.id,
        name: "Teacher 1 Stream",
      });

      const stream2 = await createTestStream({
        courseId: course2.id,
        teacherId: teacher2.id,
        name: "Teacher 2 Stream",
      });

      // Create schedule slots for both teachers
      await testPrisma.streamScheduleSlot.create({
        data: {
          streamId: stream1.id,
          dayOfWeek: 1,
          startMinutes: 540,
          durationMinutes: 60,
        },
      });

      await testPrisma.streamScheduleSlot.create({
        data: {
          streamId: stream2.id,
          dayOfWeek: 1,
          startMinutes: 600,
          durationMinutes: 60,
        },
      });

      const request = new Request("http://localhost:3000/api/teacher/schedule", {
        method: "GET",
      });

      const response = await getSchedule(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.slots).toHaveLength(1);
      expect(data.slots[0].streamId).toBe(stream1.id);
      expect(data.slots[0].streamName).toBe("Teacher 1 Stream");
    });

    it("should filter schedule slots by streamId", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Test Course",
      });

      const stream1 = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Stream 1",
      });

      const stream2 = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Stream 2",
      });

      await testPrisma.streamScheduleSlot.create({
        data: {
          streamId: stream1.id,
          dayOfWeek: 1,
          startMinutes: 540,
          durationMinutes: 60,
        },
      });

      await testPrisma.streamScheduleSlot.create({
        data: {
          streamId: stream2.id,
          dayOfWeek: 2,
          startMinutes: 600,
          durationMinutes: 60,
        },
      });

      const request = new Request(
        `http://localhost:3000/api/teacher/schedule?streamId=${stream1.id}`,
        {
          method: "GET",
        }
      );

      const response = await getSchedule(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.slots).toHaveLength(1);
      expect(data.slots[0].streamId).toBe(stream1.id);
    });

    it("should reject schedule access by student", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(student1));

      const request = new Request("http://localhost:3000/api/teacher/schedule", {
        method: "GET",
      });

      const response = await getSchedule(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });
  });

  describe("Ownership Verification", () => {
    it("should prevent teacher from accessing another teacher's course data", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher2));

      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Teacher 1 Course",
      });

      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Teacher 1 Stream",
      });

      // Try to create a lesson in teacher1's stream as teacher2
      const request = new Request("http://localhost:3000/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId: stream.id,
          title: "Unauthorized Lesson",
          type: "TEXT",
          content: "Should fail",
        }),
      });

      const response = await createLesson(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
    });

    it("should prevent teacher from managing another teacher's students", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher2));

      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Teacher 1 Course",
      });

      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Teacher 1 Stream",
      });

      const enrollment = await createTestEnrollment({
        userId: student1.id,
        streamId: stream.id,
        status: "ACTIVE",
      });

      const request = new Request("http://localhost:3000/api/teacher/manage-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "kickStudent",
          payload: { enrollmentId: enrollment.id },
        }),
      });

      const response = await manageStudent(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
    });

    it("should allow teacher to manage their own resources across multiple courses", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      // Create multiple courses for teacher1
      const course1 = await createTestCourse({
        teacherId: teacher1.id,
        title: "Course 1",
      });

      const course2 = await createTestCourse({
        teacherId: teacher1.id,
        title: "Course 2",
      });

      const stream1 = await createTestStream({
        courseId: course1.id,
        teacherId: teacher1.id,
        name: "Stream 1",
      });

      const stream2 = await createTestStream({
        courseId: course2.id,
        teacherId: teacher1.id,
        name: "Stream 2",
      });

      // Should be able to create lessons in both streams
      const request1 = new Request("http://localhost:3000/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId: stream1.id,
          title: "Lesson in Stream 1",
          type: "TEXT",
          content: "Content",
        }),
      });

      const response1 = await createLesson(request1);
      expect(response1.status).toBe(200);

      const request2 = new Request("http://localhost:3000/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId: stream2.id,
          title: "Lesson in Stream 2",
          type: "TEXT",
          content: "Content",
        }),
      });

      const response2 = await createLesson(request2);
      expect(response2.status).toBe(200);
    });
  });

  describe("Validation and Error Handling", () => {
    it("should reject course creation with missing required fields", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const request = new Request("http://localhost:3000/api/teacher/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Missing title
          description: "Test description",
          capacity: 30,
        }),
      });

      const response = await createCourse(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("should reject stream creation with invalid schedule slots", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Test Course",
      });

      const request = new Request("http://localhost:3000/api/teacher/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          name: "Test Stream",
          level: "Beginner",
          slots: [
            { dayOfWeek: 8, startMinutes: 540, durationMinutes: 60 }, // Invalid day
          ],
        }),
      });

      const response = await createStream(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("should reject lesson creation with invalid type", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Test Course",
      });

      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Test Stream",
      });

      const request = new Request("http://localhost:3000/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId: stream.id,
          title: "Test Lesson",
          type: "INVALID_TYPE",
          content: "Content",
        }),
      });

      const response = await createLesson(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("should reject lesson reordering with lessons from different streams", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const course = await createTestCourse({
        teacherId: teacher1.id,
        title: "Test Course",
      });

      const stream1 = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Stream 1",
      });

      const stream2 = await createTestStream({
        courseId: course.id,
        teacherId: teacher1.id,
        name: "Stream 2",
      });

      const lesson1 = await createTestLesson({
        streamId: stream1.id,
        title: "Lesson 1",
        sortOrder: 1,
      });

      const lesson2 = await createTestLesson({
        streamId: stream2.id,
        title: "Lesson 2",
        sortOrder: 1,
      });

      // Try to reorder lessons from stream1 but include lesson from stream2
      const request = new Request("http://localhost:3000/api/teacher/lessons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId: stream1.id,
          lessonIdsInOrder: [lesson1.id, lesson2.id],
        }),
      });

      const response = await reorderLessons(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("should handle malformed JSON in request body", async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockSession(teacher1));

      const request = new Request("http://localhost:3000/api/teacher/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid json",
      });

      const response = await createCourse(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });
});
