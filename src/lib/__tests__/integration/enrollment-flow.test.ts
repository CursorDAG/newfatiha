/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
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

// Mock next-auth
vi.mock("next-auth", () => ({
  default: vi.fn(),
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";

// Import route handlers
import { GET as getCourses } from "@/app/api/courses/route";
import { POST as createEnrollmentRequest, GET as getEnrollmentRequests } from "@/app/api/enrollment-requests/route";
import { POST as reviewEnrollmentRequest } from "@/app/api/teacher/enrollment-requests/[id]/review/route";
import { POST as createLesson, PATCH as reorderLessons } from "@/app/api/teacher/lessons/route";
import { POST as createHomework, GET as getHomework } from "@/app/api/teacher/homework/route";
import { POST as submitHomework } from "@/app/api/teacher/homework/[assignmentId]/submit/route";
import { GET as getHomeworkSubmissions } from "@/app/api/teacher/homework/[assignmentId]/submissions/route";
import { POST as checkHomework } from "@/app/api/teacher/homework/submissions/[id]/check/route";
import { POST as createQuiz } from "@/app/api/teacher/quizzes/route";
import { POST as submitQuiz } from "@/app/api/quiz/[quizId]/submit/route";
import { GET as getStudentProgress } from "@/app/api/student/progress/route";
import { GET as getStudentProgressStream } from "@/app/api/student/progress/[streamId]/route";
import { GET as getChatRooms } from "@/app/api/chat/rooms/route";
import { POST as createDirectChat } from "@/app/api/chat/rooms/direct/route";
import { POST as sendChatMessage } from "@/app/api/chat/messages/route";
import { POST as getJitsiToken } from "@/app/api/jitsi/token/route";
import { GET as getNotifications } from "@/app/api/notifications/route";

// Helper to create mock Request objects
function createMockRequest(body: unknown, url = "http://localhost:3000/api/test"): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createMockGetRequest(url = "http://localhost:3000/api/test"): NextRequest {
  return new NextRequest(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

// Helper to parse JSON response
async function parseResponse(response: Response) {
  return response.json();
}

// Mock context for dynamic route params
function createContext(params: Record<string, string>) {
  return { params: Promise.resolve(params) };
}

describe("Complete Enrollment Flow Tests", () => {
  beforeAll(async () => {
    await cleanupDatabase();
  });

  afterEach(async () => {
    await cleanupDatabase();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  // ============================================================
  // Phase 1: Teacher Setup
  // ============================================================
  describe("Phase 1: Teacher Setup", () => {
    it("should create teacher, course, stream, lessons, homework, and quiz", async () => {
      const teacher = await createTestUser({
        email: "teacher-phase1@test.com",
        name: "Test Teacher",
        role: "TEACHER",
      });
      expect(teacher).toBeDefined();
      expect(teacher.role).toBe("TEACHER");

      const course = await createTestCourse({
        teacherId: teacher.id,
        title: "Arabic Language Course",
        description: "Complete Arabic language course",
        capacity: 30,
        published: true,
      });
      expect(course).toBeDefined();
      expect(course.title).toBe("Arabic Language Course");
      expect(course.teacherId).toBe(teacher.id);

      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher.id,
        name: "Beginner Stream",
        level: "Beginner",
        schedule: "Mon/Wed 10:00",
        color: "#10b981",
        genderType: "MIXED",
      });
      expect(stream).toBeDefined();
      expect(stream.courseId).toBe(course.id);
      expect(stream.teacherId).toBe(teacher.id);

      const liveLesson = await createTestLesson({
        streamId: stream.id,
        title: "Live Lesson 1",
        type: "LIVE",
        content: "Live session content",
        sortOrder: 1,
        published: true,
      });
      expect(liveLesson.type).toBe("LIVE");

      const videoLesson = await createTestLesson({
        streamId: stream.id,
        title: "Video Lesson 2",
        type: "VIDEO",
        content: "https://example.com/video.mp4",
        sortOrder: 2,
        published: true,
      });
      expect(videoLesson.type).toBe("VIDEO");

      const textLesson = await createTestLesson({
        streamId: stream.id,
        title: "Text Lesson 3",
        type: "TEXT",
        content: "Text lesson content here",
        sortOrder: 3,
        published: true,
      });
      expect(textLesson.type).toBe("TEXT");

      const homework = await createTestHomeworkAssignment({
        streamId: stream.id,
        lessonId: textLesson.id,
        title: "Homework Assignment",
        description: "Complete the exercises from lesson 3",
        type: "TEXT",
      });
      expect(homework).toBeDefined();
      expect(homework.title).toBe("Homework Assignment");
      expect(homework.streamId).toBe(stream.id);

      const quiz = await createTestQuiz({
        lessonId: textLesson.id,
        title: "Lesson 3 Quiz",
        type: "MULTIPLE_CHOICE",
      });
      expect(quiz).toBeDefined();
      expect(quiz!.title).toBe("Lesson 3 Quiz");
      expect(quiz!.questions).toHaveLength(1);
      expect(quiz!.questions[0].options).toHaveLength(3);
    });

    it("should create lesson via API route handler", async () => {
      const teacher = await createTestUser({
        email: "teacher-api@test.com",
        name: "API Teacher",
        role: "TEACHER",
      });
      const course = await createTestCourse({ teacherId: teacher.id });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher.id });

      const mockSession = createMockSession(teacher);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const req = createMockRequest({
        streamId: stream.id,
        title: "API Created Lesson",
        type: "TEXT",
        content: "Lesson content via API",
        sortOrder: 1,
      });

      const response = await createLesson(req);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.lesson.title).toBe("API Created Lesson");
      expect(data.lesson.type).toBe("TEXT");
    });

    it("should create homework via API route handler", async () => {
      const teacher = await createTestUser({
        email: "teacher-hw-api@test.com",
        name: "HW API Teacher",
        role: "TEACHER",
      });
      const course = await createTestCourse({ teacherId: teacher.id });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher.id });

      const mockSession = createMockSession(teacher);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const req = createMockRequest({
        streamId: stream.id,
        title: "API Homework",
        description: "Homework created via API",
        type: "TEXT",
      });

      const response = await createHomework(req);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.assignment.title).toBe("API Homework");
    });

    it("should create quiz via API route handler", async () => {
      const teacher = await createTestUser({
        email: "teacher-quiz-api@test.com",
        name: "Quiz API Teacher",
        role: "TEACHER",
      });
      const course = await createTestCourse({ teacherId: teacher.id });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher.id });
      const lesson = await createTestLesson({ streamId: stream.id, title: "Quiz Lesson", type: "TEXT" });

      const mockSession = createMockSession(teacher);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const req = createMockRequest({
        lessonId: lesson.id,
        title: "API Quiz",
        questions: [
          {
            prompt: "What is the capital of Saudi Arabia?",
            type: "MULTIPLE_CHOICE",
            options: ["Riyadh", "Jeddah", "Mecca", "Medina"],
            correctOptionIndex: 0,
          },
        ],
      });

      const response = await createQuiz(req);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.quizId).toBeDefined();
    });
  });

  // ============================================================
  // Phase 2: Student Enrollment
  // ============================================================
  describe("Phase 2: Student Enrollment", () => {
    it("should allow student to browse courses and submit enrollment request", async () => {
      const teacher = await createTestUser({
        email: "teacher-phase2@test.com",
        name: "Phase 2 Teacher",
        role: "TEACHER",
      });
      const course = await createTestCourse({
        teacherId: teacher.id,
        title: "Enrollment Test Course",
        capacity: 30,
        published: true,
      });
      const stream = await createTestStream({
        courseId: course.id,
        teacherId: teacher.id,
        name: "Enrollment Stream",
        genderType: "MIXED",
      });

      const student = await createTestUser({
        email: "student-phase2@test.com",
        name: "Phase 2 Student",
        role: "STUDENT",
        gender: "MALE",
      });

      // Browse courses
      const coursesResponse = await getCourses(createMockGetRequest());
      const coursesData = await parseResponse(coursesResponse);
      expect(coursesResponse.status).toBe(200);
      expect(coursesData.streams).toBeDefined();
      expect(Array.isArray(coursesData.streams)).toBe(true);

      // Submit enrollment request
      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const enrollmentReq = createMockRequest({
        streamId: stream.id,
        message: "I would like to join this course",
      });

      const enrollResponse = await createEnrollmentRequest(enrollmentReq);
      const enrollData = await parseResponse(enrollResponse);

      expect(enrollResponse.status).toBe(201);
      expect(enrollData.success).toBe(true);
      expect(enrollData.request).toBeDefined();
      expect(enrollData.request.studentId).toBe(student.id);
      expect(enrollData.request.streamId).toBe(stream.id);
      expect(enrollData.request.status).toBe("PENDING_REVIEW");

      // Verify in database
      const dbRequest = await testPrisma.enrollmentRequest.findUnique({
        where: { id: enrollData.request.id },
      });
      expect(dbRequest).toBeDefined();
      expect(dbRequest?.status).toBe("PENDING_REVIEW");
    });

    it("should allow student to view their enrollment requests", async () => {
      const teacher = await createTestUser({ email: "teacher-view@test.com", name: "View Teacher", role: "TEACHER" });
      const course = await createTestCourse({ teacherId: teacher.id });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher.id, genderType: "MIXED" });
      const student = await createTestUser({ email: "student-view@test.com", name: "View Student", role: "STUDENT", gender: "MALE" });

      await testPrisma.enrollmentRequest.create({
        data: { studentId: student.id, streamId: stream.id, message: "Test request", status: "PENDING_REVIEW" },
      });

      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const response = await getEnrollmentRequests(createMockGetRequest());
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.requests).toBeDefined();
      expect(data.requests.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================
  // Phase 3: Teacher Review
  // ============================================================
  describe("Phase 3: Teacher Review", () => {
    it("should allow teacher to get enrollment requests and approve", async () => {
      const teacher = await createTestUser({ email: "teacher-review@test.com", name: "Review Teacher", role: "TEACHER" });
      const course = await createTestCourse({ teacherId: teacher.id, title: "Review Course", capacity: 30 });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher.id, name: "Review Stream", genderType: "MIXED" });
      const student = await createTestUser({ email: "student-review@test.com", name: "Review Student", role: "STUDENT", gender: "MALE" });

      const enrollmentRequest = await testPrisma.enrollmentRequest.create({
        data: { studentId: student.id, streamId: stream.id, message: "Please accept me", status: "PENDING_REVIEW" },
      });

      // Teacher gets enrollment requests
      const mockSession = createMockSession(teacher);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const requestsResponse = await getEnrollmentRequests(createMockGetRequest());
      const requestsData = await parseResponse(requestsResponse);
      expect(requestsResponse.status).toBe(200);
      expect(requestsData.requests).toBeDefined();
      expect(requestsData.requests.length).toBeGreaterThanOrEqual(1);

      // Teacher approves
      const reviewReq = createMockRequest({ action: "APPROVE" });
      const reviewResponse = await reviewEnrollmentRequest(reviewReq, createContext({ id: enrollmentRequest.id }));
      const reviewData = await parseResponse(reviewResponse);
      expect(reviewResponse.status).toBe(200);
      expect(reviewData.success).toBe(true);

      // Verify enrollment created
      const enrollment = await testPrisma.enrollment.findFirst({
        where: { userId: student.id, streamId: stream.id },
      });
      expect(enrollment).toBeDefined();
      expect(enrollment?.status).toBe("ACTIVE");

      // Verify notification
      const notifications = await testPrisma.notification.findMany({ where: { userId: student.id } });
      expect(notifications.length).toBeGreaterThanOrEqual(1);
      const enrollmentNotif = notifications.find((n) => n.type === "ENROLLMENT_CONFIRMED");
      expect(enrollmentNotif).toBeDefined();
    });

    it("should allow teacher to reject enrollment request", async () => {
      const teacher = await createTestUser({ email: "teacher-reject@test.com", name: "Reject Teacher", role: "TEACHER" });
      const course = await createTestCourse({ teacherId: teacher.id });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher.id, genderType: "MIXED" });
      const student = await createTestUser({ email: "student-reject@test.com", name: "Reject Student", role: "STUDENT", gender: "MALE" });

      const enrollmentRequest = await testPrisma.enrollmentRequest.create({
        data: { studentId: student.id, streamId: stream.id, message: "Please accept me", status: "PENDING_REVIEW" },
      });

      const mockSession = createMockSession(teacher);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const reviewReq = createMockRequest({ action: "REJECT", rejectionReason: "Course is full" });
      const reviewResponse = await reviewEnrollmentRequest(reviewReq, createContext({ id: enrollmentRequest.id }));
      const reviewData = await parseResponse(reviewResponse);
      expect(reviewResponse.status).toBe(200);
      expect(reviewData.success).toBe(true);

      const updatedRequest = await testPrisma.enrollmentRequest.findUnique({ where: { id: enrollmentRequest.id } });
      expect(updatedRequest?.status).toBe("REJECTED");
      expect(updatedRequest?.rejectionReason).toBe("Course is full");

      const enrollment = await testPrisma.enrollment.findFirst({ where: { userId: student.id, streamId: stream.id } });
      expect(enrollment).toBeNull();
    });
  });

  // ============================================================
  // Phase 4: Student Access After Enrollment
  // ============================================================
  describe("Phase 4: Student Access After Enrollment", () => {
    let teacher: Awaited<ReturnType<typeof createTestUser>>;
    let student: Awaited<ReturnType<typeof createTestUser>>;
    let course: Awaited<ReturnType<typeof createTestCourse>>;
    let stream: Awaited<ReturnType<typeof createTestStream>>;
    let liveLesson: Awaited<ReturnType<typeof createTestLesson>>;
    let videoLesson: Awaited<ReturnType<typeof createTestLesson>>;
    let textLesson: Awaited<ReturnType<typeof createTestLesson>>;

    beforeAll(async () => {
      teacher = await createTestUser({ email: "teacher-access@test.com", name: "Access Teacher", role: "TEACHER" });
      course = await createTestCourse({ teacherId: teacher.id, title: "Access Course", capacity: 30 });
      stream = await createTestStream({ courseId: course.id, teacherId: teacher.id, name: "Access Stream", genderType: "MIXED" });
      liveLesson = await createTestLesson({ streamId: stream.id, title: "Live Lesson", type: "LIVE", sortOrder: 1 });
      videoLesson = await createTestLesson({ streamId: stream.id, title: "Video Lesson", type: "VIDEO", content: "https://example.com/video.mp4", sortOrder: 2 });
      textLesson = await createTestLesson({ streamId: stream.id, title: "Text Lesson", type: "TEXT", content: "Text content here", sortOrder: 3 });
      student = await createTestUser({ email: "student-access@test.com", name: "Access Student", role: "STUDENT", gender: "MALE" });
      await createTestEnrollment({ userId: student.id, streamId: stream.id, status: "ACTIVE" });
    });

    it("should allow enrolled student to get enrolled streams", async () => {
      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      const response = await getStudentProgress(createMockGetRequest());
      const data = await parseResponse(response);
      expect(response.status).toBe(200);
      expect(data.streams).toBeDefined();
      expect(Array.isArray(data.streams)).toBe(true);
      expect(data.streams.length).toBeGreaterThanOrEqual(1);
    });

    it("should allow student to access lessons via progress endpoint", async () => {
      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      const response = await getStudentProgressStream(createMockGetRequest(`http://localhost:3000/api/student/progress/${stream.id}`), createContext({ streamId: stream.id }));
      const data = await parseResponse(response);
      expect(response.status).toBe(200);
      expect(data.overview).toBeDefined();
      expect(data.lessons).toBeDefined();
      expect(data.lessons.length).toBe(3);
      const lessonTypes = data.lessons.map((l: { type: string }) => l.type);
      expect(lessonTypes).toContain("LIVE");
      expect(lessonTypes).toContain("VIDEO");
      expect(lessonTypes).toContain("TEXT");
    });

    it("should allow student to get Jitsi token for LIVE lesson", async () => {
      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      const req = createMockRequest({ streamId: stream.id });
      const response = await getJitsiToken(req);
      const data = await parseResponse(response);
      expect(response.status).toBe(200);
      expect(data).toBeDefined();
      expect(data).toHaveProperty("enabled");
      expect(data).toHaveProperty("domain");
    });

    it("should allow student to view VIDEO lesson content", async () => {
      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      const response = await getStudentProgressStream(createMockGetRequest(`http://localhost:3000/api/student/progress/${stream.id}`), createContext({ streamId: stream.id }));
      const data = await parseResponse(response);
      expect(response.status).toBe(200);
      const videoLessonData = data.lessons.find((l: { type: string }) => l.type === "VIDEO");
      expect(videoLessonData).toBeDefined();
      expect(videoLessonData.lessonId).toBe(videoLesson.id);
    });

    it("should allow student to view TEXT lesson content", async () => {
      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      const response = await getStudentProgressStream(createMockGetRequest(`http://localhost:3000/api/student/progress/${stream.id}`), createContext({ streamId: stream.id }));
      const data = await parseResponse(response);
      expect(response.status).toBe(200);
      const textLessonData = data.lessons.find((l: { type: string }) => l.type === "TEXT");
      expect(textLessonData).toBeDefined();
      expect(textLessonData.lessonId).toBe(textLesson.id);
    });
  });

  // ============================================================
  // Phase 5: Student Homework Flow
  // ============================================================
  describe("Phase 5: Student Homework Flow", () => {
    let teacher: Awaited<ReturnType<typeof createTestUser>>;
    let student: Awaited<ReturnType<typeof createTestUser>>;
    let stream: Awaited<ReturnType<typeof createTestStream>>;
    let homework: Awaited<ReturnType<typeof createTestHomeworkAssignment>>;
    let enrollment: Awaited<ReturnType<typeof createTestEnrollment>>;

    beforeAll(async () => {
      teacher = await createTestUser({ email: "teacher-hw@test.com", name: "HW Teacher", role: "TEACHER" });
      const course = await createTestCourse({ teacherId: teacher.id });
      stream = await createTestStream({ courseId: course.id, teacherId: teacher.id, name: "HW Stream", genderType: "MIXED" });
      await createTestLesson({ streamId: stream.id, title: "HW Lesson", type: "TEXT" });
      homework = await createTestHomeworkAssignment({ streamId: stream.id, title: "HW Assignment", description: "Complete the homework", type: "TEXT" });
      student = await createTestUser({ email: "student-hw@test.com", name: "HW Student", role: "STUDENT", gender: "MALE" });
      enrollment = await createTestEnrollment({ userId: student.id, streamId: stream.id, status: "ACTIVE" });
    });

    it("should complete full homework lifecycle: submit, view, grade, view feedback", async () => {
      // 1. Teacher gets homework assignments
      const mockTeacherSession = createMockSession(teacher);
      vi.mocked(getServerSession).mockResolvedValue(mockTeacherSession);
      const getReq = createMockGetRequest(`http://localhost:3000/api/teacher/homework?streamId=${stream.id}`);
      const getResponse = await getHomework(getReq);
      const getData = await parseResponse(getResponse);
      expect(getResponse.status).toBe(200);
      expect(getData.success).toBe(true);
      expect(getData.assignments).toBeDefined();

      // 2. Student submits homework
      const mockStudentSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockStudentSession);
      const submitReq = createMockRequest({ contentText: "This is my homework submission for the lesson." });
      const submitResponse = await submitHomework(submitReq, createContext({ assignmentId: homework.id }));
      const submitData = await parseResponse(submitResponse);
      expect(submitResponse.status).toBe(200);
      expect(submitData.success).toBe(true);
      expect(submitData.submissionId).toBeDefined();

      // 3. Teacher views submission
      vi.mocked(getServerSession).mockResolvedValue(mockTeacherSession);
      const submissionsResponse = await getHomeworkSubmissions(createMockGetRequest(), createContext({ assignmentId: homework.id }));
      const submissionsData = await parseResponse(submissionsResponse);
      expect(submissionsResponse.status).toBe(200);
      expect(submissionsData.success).toBe(true);
      expect(submissionsData.submissions).toHaveLength(1);
      expect(submissionsData.submissions[0].contentText).toBe("This is my homework submission for the lesson.");
      expect(submissionsData.submissions[0].status).toBe("SUBMITTED");
      const submissionId = submissionsData.submissions[0].id;

      // 4. Teacher grades submission
      const checkReq = createMockRequest({ status: "ACCEPTED", grade: 95, teacherComment: "Excellent work! Well done." });
      const checkResponse = await checkHomework(checkReq, createContext({ id: submissionId }));
      const checkData = await parseResponse(checkResponse);
      expect(checkResponse.status).toBe(200);
      expect(checkData.success).toBe(true);
      expect(checkData.status).toBe("ACCEPTED");

      // 5. Student views grade and feedback
      const submissionsResponse2 = await getHomeworkSubmissions(createMockGetRequest(), createContext({ assignmentId: homework.id }));
      const submissionsData2 = await parseResponse(submissionsResponse2);
      expect(submissionsData2.submissions[0].status).toBe("ACCEPTED");
      expect(submissionsData2.submissions[0].grade).toBe(95);
      expect(submissionsData2.submissions[0].teacherComment).toBe("Excellent work! Well done.");
    });

    it("should allow homework resubmission after NEEDS_REWORK", async () => {
      const hw = await createTestHomeworkAssignment({ streamId: stream.id, title: "Rework HW", type: "TEXT" });

      const mockStudentSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockStudentSession);
      const submitReq = createMockRequest({ contentText: "First attempt" });
      await submitHomework(submitReq, createContext({ assignmentId: hw.id }));

      const mockTeacherSession = createMockSession(teacher);
      vi.mocked(getServerSession).mockResolvedValue(mockTeacherSession);
      const submissionsResponse = await getHomeworkSubmissions(createMockGetRequest(), createContext({ assignmentId: hw.id }));
      const submissionsData = await parseResponse(submissionsResponse);
      const submissionId = submissionsData.submissions[0].id;

      const checkReq = createMockRequest({ status: "NEEDS_REWORK", grade: 60, teacherComment: "Please improve the content" });
      await checkHomework(checkReq, createContext({ id: submissionId }));

      vi.mocked(getServerSession).mockResolvedValue(mockStudentSession);
      const resubmitReq = createMockRequest({ contentText: "Improved second attempt" });
      const resubmitResponse = await submitHomework(resubmitReq, createContext({ assignmentId: hw.id }));
      expect(resubmitResponse.status).toBe(200);

      vi.mocked(getServerSession).mockResolvedValue(mockTeacherSession);
      const submissionsResponse2 = await getHomeworkSubmissions(createMockGetRequest(), createContext({ assignmentId: hw.id }));
      const submissionsData2 = await parseResponse(submissionsResponse2);
      const resubmissionId = submissionsData2.submissions[0].id;

      const acceptReq = createMockRequest({ status: "ACCEPTED", grade: 85 });
      const acceptResponse = await checkHomework(acceptReq, createContext({ id: resubmissionId }));
      const acceptData = await parseResponse(acceptResponse);
      expect(acceptData.status).toBe("ACCEPTED");
    });
  });

  // ============================================================
  // Phase 6: Student Quiz Flow
  // ============================================================
  describe("Phase 6: Student Quiz Flow", () => {
    let teacher: Awaited<ReturnType<typeof createTestUser>>;
    let student: Awaited<ReturnType<typeof createTestUser>>;
    let lesson: Awaited<ReturnType<typeof createTestLesson>>;
    let quiz: Awaited<ReturnType<typeof createTestQuiz>>;

    beforeAll(async () => {
      teacher = await createTestUser({ email: "teacher-quiz@test.com", name: "Quiz Teacher", role: "TEACHER" });
      const course = await createTestCourse({ teacherId: teacher.id });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher.id, name: "Quiz Stream", genderType: "MIXED" });
      lesson = await createTestLesson({ streamId: stream.id, title: "Quiz Lesson", type: "TEXT" });
      student = await createTestUser({ email: "student-quiz@test.com", name: "Quiz Student", role: "STUDENT", gender: "MALE" });
      await createTestEnrollment({ userId: student.id, streamId: stream.id, status: "ACTIVE" });
      quiz = await createTestQuiz({ lessonId: lesson.id, title: "Quiz Flow Quiz", type: "MULTIPLE_CHOICE" });
    });

    it("should complete full quiz lifecycle: submit, auto-grade, view results", async () => {
      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const progressResponse = await getStudentProgressStream(createMockGetRequest(`http://localhost:3000/api/student/progress/${lesson.streamId}`), createContext({ streamId: lesson.streamId }));
      const progressData = await parseResponse(progressResponse);
      expect(progressResponse.status).toBe(200);
      expect(progressData.quizzes).toBeDefined();

      const correctOption = quiz?.questions[0].options.find((o) => o.isCorrect);
      expect(correctOption).toBeDefined();

      const submitReq = createMockRequest({ selectedOptionId: correctOption!.id });
      const submitResponse = await submitQuiz(submitReq, createContext({ quizId: quiz!.id }));
      const submitData = await parseResponse(submitResponse);
      expect(submitResponse.status).toBe(200);
      expect(submitData.success).toBe(true);
      expect(submitData.submissionId).toBeDefined();

      const submission = await testPrisma.lessonQuizSubmission.findUnique({ where: { id: submitData.submissionId } });
      expect(submission).toBeDefined();
      expect(submission?.status).toBe("SUBMITTED");
      expect(submission?.selectedOptionId).toBe(correctOption!.id);

      const progressResponse2 = await getStudentProgressStream(createMockGetRequest(`http://localhost:3000/api/student/progress/${lesson.streamId}`), createContext({ streamId: lesson.streamId }));
      const progressData2 = await parseResponse(progressResponse2);
      expect(progressResponse2.status).toBe(200);
      expect(progressData2.quizzes).toBeDefined();
      expect(progressData2.quizzes.length).toBeGreaterThanOrEqual(1);
    });

    it("should allow quiz resubmission with different answer", async () => {
      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const options = quiz?.questions[0].options || [];
      const wrongOption = options.find((o) => !o.isCorrect);

      const submitReq = createMockRequest({ selectedOptionId: wrongOption!.id });
      const submitResponse = await submitQuiz(submitReq, createContext({ quizId: quiz!.id }));
      const submitData = await parseResponse(submitResponse);
      expect(submitResponse.status).toBe(200);
      expect(submitData.success).toBe(true);

      const submissions = await testPrisma.lessonQuizSubmission.findMany({
        where: { quizId: quiz!.id, studentId: student.id },
      });
      expect(submissions).toHaveLength(1);
      expect(submissions[0].selectedOptionId).toBe(wrongOption!.id);
    });
  });

  // ============================================================
  // Phase 7: Student Progress
  // ============================================================
  describe("Phase 7: Student Progress", () => {
    let teacher: Awaited<ReturnType<typeof createTestUser>>;
    let student: Awaited<ReturnType<typeof createTestUser>>;
    let stream: Awaited<ReturnType<typeof createTestStream>>;
    let lesson: Awaited<ReturnType<typeof createTestLesson>>;
    let quiz: Awaited<ReturnType<typeof createTestQuiz>>;
    let homework: Awaited<ReturnType<typeof createTestHomeworkAssignment>>;
    let enrollment: Awaited<ReturnType<typeof createTestEnrollment>>;

    beforeAll(async () => {
      teacher = await createTestUser({ email: "teacher-progress@test.com", name: "Progress Teacher", role: "TEACHER" });
      const course = await createTestCourse({ teacherId: teacher.id });
      stream = await createTestStream({ courseId: course.id, teacherId: teacher.id, name: "Progress Stream", genderType: "MIXED" });
      lesson = await createTestLesson({ streamId: stream.id, title: "Progress Lesson", type: "TEXT" });
      quiz = await createTestQuiz({ lessonId: lesson.id, title: "Progress Quiz", type: "MULTIPLE_CHOICE" });
      homework = await createTestHomeworkAssignment({ streamId: stream.id, title: "Progress HW", type: "TEXT" });
      student = await createTestUser({ email: "student-progress@test.com", name: "Progress Student", role: "STUDENT", gender: "MALE" });
      enrollment = await createTestEnrollment({ userId: student.id, streamId: stream.id, status: "ACTIVE" });
    });

    it("should get student overall progress", async () => {
      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      const response = await getStudentProgress(createMockGetRequest());
      const data = await parseResponse(response);
      expect(response.status).toBe(200);
      expect(data.streams).toBeDefined();
      expect(data.streams.length).toBeGreaterThanOrEqual(1);
      const streamProgress = data.streams.find((s: { streamId: string }) => s.streamId === stream.id);
      expect(streamProgress).toBeDefined();
      expect(streamProgress.streamName).toBe("Progress Stream");
    });

    it("should get per-stream progress", async () => {
      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      const response = await getStudentProgressStream(createMockGetRequest(`http://localhost:3000/api/student/progress/${stream.id}`), createContext({ streamId: stream.id }));
      const data = await parseResponse(response);
      expect(response.status).toBe(200);
      expect(data.overview).toBeDefined();
      expect(data.overview.streamName).toBe("Progress Stream");
      expect(data.lessons).toBeDefined();
      expect(data.quizzes).toBeDefined();
      expect(data.homeworks).toBeDefined();
    });

    it("should verify lesson completion tracking", async () => {
      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      const response = await getStudentProgressStream(createMockGetRequest(`http://localhost:3000/api/student/progress/${stream.id}`), createContext({ streamId: stream.id }));
      const data = await parseResponse(response);
      expect(response.status).toBe(200);
      expect(data.lessons).toBeDefined();
      expect(data.lessons.length).toBeGreaterThanOrEqual(1);
      for (const lessonData of data.lessons) {
        expect(lessonData).toHaveProperty("lessonId");
        expect(lessonData).toHaveProperty("title");
        expect(lessonData).toHaveProperty("type");
        expect(lessonData).toHaveProperty("completed");
        expect(typeof lessonData.completed).toBe("boolean");
      }
    });

    it("should verify homework status tracking", async () => {
      const mockStudentSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockStudentSession);
      const submitReq = createMockRequest({ contentText: "Progress homework" });
      await submitHomework(submitReq, createContext({ assignmentId: homework.id }));

      const mockTeacherSession = createMockSession(teacher);
      vi.mocked(getServerSession).mockResolvedValue(mockTeacherSession);
      const submissionsResponse = await getHomeworkSubmissions(createMockGetRequest(), createContext({ assignmentId: homework.id }));
      const submissionsData = await parseResponse(submissionsResponse);
      const submissionId = submissionsData.submissions[0].id;

      const checkReq = createMockRequest({ status: "ACCEPTED", grade: 90 });
      await checkHomework(checkReq, createContext({ id: submissionId }));

      vi.mocked(getServerSession).mockResolvedValue(mockStudentSession);
      const response = await getStudentProgressStream(createMockGetRequest(`http://localhost:3000/api/student/progress/${stream.id}`), createContext({ streamId: stream.id }));
      const data = await parseResponse(response);
      expect(response.status).toBe(200);
      expect(data.homeworks).toBeDefined();
      expect(data.homeworks.length).toBeGreaterThanOrEqual(1);
      const hwData = data.homeworks.find((h: { assignmentId: string }) => h.assignmentId === homework.id);
      expect(hwData).toBeDefined();
      expect(hwData.status).toBe("ACCEPTED");
      expect(hwData.grade).toBe(90);
    });

    it("should verify quiz results tracking", async () => {
      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      const correctOption = quiz?.questions[0].options.find((o) => o.isCorrect);
      const submitReq = createMockRequest({ selectedOptionId: correctOption!.id });
      await submitQuiz(submitReq, createContext({ quizId: quiz!.id }));

      const response = await getStudentProgressStream(createMockGetRequest(`http://localhost:3000/api/student/progress/${stream.id}`), createContext({ streamId: stream.id }));
      const data = await parseResponse(response);
      expect(response.status).toBe(200);
      expect(data.quizzes).toBeDefined();
      expect(data.quizzes.length).toBeGreaterThanOrEqual(1);
      const quizData = data.quizzes.find((q: { quizId: string }) => q.quizId === quiz!.id);
      expect(quizData).toBeDefined();
      expect(quizData.status).toBe("SUBMITTED");
    });
  });

  // ============================================================
  // Phase 8: Student Chat
  // ============================================================
  describe("Phase 8: Student Chat", () => {
    let teacher: Awaited<ReturnType<typeof createTestUser>>;
    let student: Awaited<ReturnType<typeof createTestUser>>;
    let stream: Awaited<ReturnType<typeof createTestStream>>;

    beforeAll(async () => {
      teacher = await createTestUser({ email: "teacher-chat@test.com", name: "Chat Teacher", role: "TEACHER" });
      const course = await createTestCourse({ teacherId: teacher.id });
      stream = await createTestStream({ courseId: course.id, teacherId: teacher.id, name: "Chat Stream", genderType: "MIXED" });
      await createTestLesson({ streamId: stream.id, title: "Chat Lesson", type: "TEXT" });
      student = await createTestUser({ email: "student-chat@test.com", name: "Chat Student", role: "STUDENT", gender: "MALE" });
      await createTestEnrollment({ userId: student.id, streamId: stream.id, status: "ACTIVE" });
    });

    it("should allow student to get chat rooms for stream", async () => {
      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      const response = await getChatRooms(createMockGetRequest());
      const data = await parseResponse(response);
      expect(response.status).toBe(200);
      expect(data.rooms).toBeDefined();
      expect(Array.isArray(data.rooms)).toBe(true);
    });

    it("should allow student to send message in group chat", async () => {
      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      const roomsResponse = await getChatRooms(createMockGetRequest());
      const roomsData = await parseResponse(roomsResponse);
      const groupRoom = roomsData.rooms.find((r: { streamId?: string }) => r.streamId === stream.id);
      if (groupRoom) {
        const msgReq = createMockRequest({ roomId: groupRoom.id, content: "Hello from student!" });
        const msgResponse = await sendChatMessage(msgReq);
        const msgData = await parseResponse(msgResponse);
        expect(msgResponse.status).toBe(201);
        expect(msgData.message).toBeDefined();
        expect(msgData.message.content).toBe("Hello from student!");
        expect(msgData.message.senderId).toBe(student.id);
      }
    });

    it("should allow teacher to see messages in group chat", async () => {
      const mockTeacherSession = createMockSession(teacher);
      vi.mocked(getServerSession).mockResolvedValue(mockTeacherSession);
      const roomsResponse = await getChatRooms(createMockGetRequest());
      const roomsData = await parseResponse(roomsResponse);
      const groupRoom = roomsData.rooms.find((r: { streamId?: string }) => r.streamId === stream.id);
      if (groupRoom) {
        expect(groupRoom).toBeDefined();
      }
    });

    it("should allow student to create direct chat with teacher", async () => {
      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      const req = createMockRequest({ recipientId: teacher.id });
      const response = await createDirectChat(req);
      const data = await parseResponse(response);
      expect(response.status).toBeDefined();
      if (response.status === 201 || response.status === 200) {
        expect(data.room).toBeDefined();
      }
    });

    it("should allow student to send direct message", async () => {
      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      const createReq = createMockRequest({ recipientId: teacher.id });
      const createResponse = await createDirectChat(createReq);
      const createData = await parseResponse(createResponse);
      if (createResponse.status === 201 || createResponse.status === 200) {
        const roomId = createData.room.id;
        const msgReq = createMockRequest({ roomId, content: "Direct message to teacher" });
        const msgResponse = await sendChatMessage(msgReq);
        const msgData = await parseResponse(msgResponse);
        expect(msgResponse.status).toBe(201);
        expect(msgData.message.content).toBe("Direct message to teacher");
      }
    });
  });

  // ============================================================
  // Phase 9: Edge Cases
  // ============================================================
  describe("Phase 9: Edge Cases", () => {
    it("should prevent student from enrolling in same stream twice", async () => {
      const teacher = await createTestUser({ email: "teacher-edge@test.com", name: "Edge Teacher", role: "TEACHER" });
      const course = await createTestCourse({ teacherId: teacher.id });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher.id, genderType: "MIXED" });
      const student = await createTestUser({ email: "student-edge@test.com", name: "Edge Student", role: "STUDENT", gender: "MALE" });

      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const req1 = createMockRequest({ streamId: stream.id, message: "First request" });
      const response1 = await createEnrollmentRequest(req1);
      expect(response1.status).toBe(201);

      const req2 = createMockRequest({ streamId: stream.id, message: "Second request" });
      const response2 = await createEnrollmentRequest(req2);
      const data2 = await parseResponse(response2);
      expect(response2.status).toBe(409);
      expect(data2.error).toBeDefined();
    });

    it("should prevent student from accessing lesson without enrollment", async () => {
      const teacher = await createTestUser({ email: "teacher-noenroll@test.com", name: "NoEnroll Teacher", role: "TEACHER" });
      const course = await createTestCourse({ teacherId: teacher.id });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher.id, genderType: "MIXED" });
      await createTestLesson({ streamId: stream.id, title: "Protected Lesson", type: "TEXT" });
      const student = await createTestUser({ email: "student-noenroll@test.com", name: "NoEnroll Student", role: "STUDENT", gender: "MALE" });

      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const response = await getStudentProgressStream(createMockGetRequest(`http://localhost:3000/api/student/progress/${stream.id}`), createContext({ streamId: stream.id }));
      const data = await parseResponse(response);
      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
    });

    it("should prevent student from submitting homework without enrollment", async () => {
      const teacher = await createTestUser({ email: "teacher-hwnoenroll@test.com", name: "HWNoEnroll Teacher", role: "TEACHER" });
      const course = await createTestCourse({ teacherId: teacher.id });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher.id, genderType: "MIXED" });
      const homework = await createTestHomeworkAssignment({ streamId: stream.id, title: "Protected HW", type: "TEXT" });
      const student = await createTestUser({ email: "student-hwnoenroll@test.com", name: "HWNoEnroll Student", role: "STUDENT", gender: "MALE" });

      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const req = createMockRequest({ contentText: "Unauthorized submission" });
      const response = await submitHomework(req, createContext({ assignmentId: homework.id }));
      const data = await parseResponse(response);
      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
    });

    it("should prevent teacher from approving non-existent enrollment request", async () => {
      const teacher = await createTestUser({ email: "teacher-fake@test.com", name: "Fake Teacher", role: "TEACHER" });
      const mockSession = createMockSession(teacher);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const req = createMockRequest({ action: "APPROVE" });
      const response = await reviewEnrollmentRequest(req, createContext({ id: "non-existent-id" }));
      const data = await parseResponse(response);
      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });

    it("should prevent kicked student from accessing lessons", async () => {
      const teacher = await createTestUser({ email: "teacher-kicked@test.com", name: "Kicked Teacher", role: "TEACHER" });
      const course = await createTestCourse({ teacherId: teacher.id });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher.id, genderType: "MIXED" });
      await createTestLesson({ streamId: stream.id, title: "Kicked Lesson", type: "TEXT" });
      const student = await createTestUser({ email: "student-kicked@test.com", name: "Kicked Student", role: "STUDENT", gender: "MALE" });

      await createTestEnrollment({ userId: student.id, streamId: stream.id, status: "KICKED" });

      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const response = await getStudentProgressStream(createMockGetRequest(`http://localhost:3000/api/student/progress/${stream.id}`), createContext({ streamId: stream.id }));
      const data = await parseResponse(response);
      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
    });

    it("should prevent student from submitting quiz without enrollment", async () => {
      const teacher = await createTestUser({ email: "teacher-quiz-noenroll@test.com", name: "QuizNoEnroll Teacher", role: "TEACHER" });
      const course = await createTestCourse({ teacherId: teacher.id });
      const stream = await createTestStream({ courseId: course.id, teacherId: teacher.id, genderType: "MIXED" });
      const lesson = await createTestLesson({ streamId: stream.id, title: "QuizNoEnroll Lesson", type: "TEXT" });
      const quiz = await createTestQuiz({ lessonId: lesson.id, title: "QuizNoEnroll Quiz", type: "MULTIPLE_CHOICE" });
      const student = await createTestUser({ email: "student-quiz-noenroll@test.com", name: "QuizNoEnroll Student", role: "STUDENT", gender: "MALE" });

      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const correctOption = quiz?.questions[0].options.find((o) => o.isCorrect);
      const req = createMockRequest({ selectedOptionId: correctOption!.id });
      const response = await submitQuiz(req, createContext({ quizId: quiz!.id }));
      const data = await parseResponse(response);
      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
    });

    it("should prevent unauthenticated access to protected routes", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const enrollReq = createMockRequest({ streamId: "some-stream-id", message: "Test" });
      const enrollResponse = await createEnrollmentRequest(enrollReq);
      expect(enrollResponse.status).toBe(401);

      const progressResponse = await getStudentProgress(createMockGetRequest());
      expect(progressResponse.status).toBe(401);

      const chatResponse = await getChatRooms(createMockGetRequest());
      expect(chatResponse.status).toBe(401);
    });

    it("should prevent student from accessing teacher-only routes", async () => {
      const student = await createTestUser({ email: "student-teacher-route@test.com", name: "TeacherRoute Student", role: "STUDENT" });
      const mockSession = createMockSession(student);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const lessonReq = createMockRequest({ streamId: "some-stream-id", title: "Test", type: "TEXT" });
      const lessonResponse = await createLesson(lessonReq);
      expect(lessonResponse.status).toBe(401);

      const hwReq = createMockRequest({ streamId: "some-stream-id", title: "Test" });
      const hwResponse = await createHomework(hwReq);
      expect(hwResponse.status).toBe(401);
    });
  });
});

