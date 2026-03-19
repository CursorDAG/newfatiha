import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Integration test setup utilities
 *
 * Provides database setup, test data factories, and authentication helpers
 * for integration tests.
 */

// Use a separate Prisma client for tests
// eslint-disable-next-line no-restricted-syntax
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

/**
 * Clean up all test data from the database
 * Call this in afterEach or afterAll hooks
 */
export async function cleanupDatabase() {
  // Delete in order to respect foreign key constraints
  await testPrisma.chatMessage.deleteMany();
  await testPrisma.chatRoom.deleteMany();
  await testPrisma.supportTicketReply.deleteMany();
  await testPrisma.supportTicket.deleteMany();
  await testPrisma.contentReport.deleteMany();
  await testPrisma.notification.deleteMany();
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
  await testPrisma.user.deleteMany();
}

/**
 * Disconnect Prisma client
 * Call this in afterAll hook
 */
export async function disconnectDatabase() {
  await testPrisma.$disconnect();
}

// Test data factories

interface CreateTestUserOptions {
  email?: string;
  password?: string;
  name?: string;
  role?: "STUDENT" | "TEACHER" | "ADMIN" | "MODERATOR";
  gender?: "MALE" | "FEMALE" | "NOT_SPECIFIED";
}

/**
 * Create a test user
 */
export async function createTestUser(options: CreateTestUserOptions = {}) {
  const {
    email = `test-${Date.now()}@example.com`,
    password = "password123",
    name = "Test User",
    role = "STUDENT",
    gender = "MALE", // Default to MALE for tests to pass gender validation
  } = options;

  const hashedPassword = await bcrypt.hash(password, 10);

  return testPrisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role,
      gender,
    },
  });
}

interface CreateTestCourseOptions {
  teacherId: string;
  title?: string;
  description?: string;
  capacity?: number;
  published?: boolean;
}

/**
 * Create a test course
 */
export async function createTestCourse(options: CreateTestCourseOptions) {
  const {
    teacherId,
    title = "Test Course",
    description = "Test course description",
    capacity = 30,
    published = true,
  } = options;

  return testPrisma.course.create({
    data: {
      teacherId,
      title,
      description,
      capacity,
      published,
    },
  });
}

interface CreateTestStreamOptions {
  courseId: string;
  teacherId: string;
  name?: string;
  level?: string;
  schedule?: string;
  color?: string;
  genderType?: "MALE_ONLY" | "FEMALE_ONLY" | "MIXED";
}

/**
 * Create a test stream
 */
export async function createTestStream(options: CreateTestStreamOptions) {
  const {
    courseId,
    teacherId,
    name = "Test Stream",
    level = "Beginner",
    schedule = "Mon/Wed 10:00",
    color = "#10b981",
    genderType = "MIXED", // Default to MIXED for tests
  } = options;

  return testPrisma.stream.create({
    data: {
      courseId,
      teacherId,
      name,
      level,
      schedule,
      color,
      genderType,
    },
  });
}

interface CreateTestLessonOptions {
  streamId: string;
  title?: string;
  type?: "LIVE" | "VIDEO" | "TEXT";
  content?: string;
  sortOrder?: number;
  published?: boolean;
}

/**
 * Create a test lesson
 */
export async function createTestLesson(options: CreateTestLessonOptions) {
  const {
    streamId,
    title = "Test Lesson",
    type = "TEXT",
    content = "Test lesson content",
    sortOrder = 0,
    published = true,
  } = options;

  return testPrisma.lesson.create({
    data: {
      streamId,
      title,
      type,
      content,
      sortOrder,
      published,
    },
  });
}

interface CreateTestEnrollmentOptions {
  userId: string;
  streamId: string;
  status?: "ACTIVE" | "TRANSFERRED" | "REPEATING" | "KICKED";
}

/**
 * Create a test enrollment
 */
export async function createTestEnrollment(options: CreateTestEnrollmentOptions) {
  const { userId, streamId, status = "ACTIVE" } = options;

  return testPrisma.enrollment.create({
    data: {
      userId,
      streamId,
      status,
    },
  });
}

interface CreateTestQuizOptions {
  lessonId: string;
  title?: string;
  type?: "MULTIPLE_CHOICE" | "VOICE";
}

/**
 * Create a test quiz with questions and options
 */
export async function createTestQuiz(options: CreateTestQuizOptions) {
  const { lessonId, title = "Test Quiz", type = "MULTIPLE_CHOICE" } = options;

  const quiz = await testPrisma.lessonQuiz.create({
    data: {
      lessonId,
      title,
      type,
    },
  });

  if (type === "MULTIPLE_CHOICE") {
    const question = await testPrisma.lessonQuizQuestion.create({
      data: {
        quizId: quiz.id,
        prompt: "Test question?",
        sortOrder: 0,
      },
    });

    await testPrisma.lessonQuizOption.createMany({
      data: [
        {
          questionId: question.id,
          text: "Correct answer",
          isCorrect: true,
          sortOrder: 0,
        },
        {
          questionId: question.id,
          text: "Wrong answer 1",
          isCorrect: false,
          sortOrder: 1,
        },
        {
          questionId: question.id,
          text: "Wrong answer 2",
          isCorrect: false,
          sortOrder: 2,
        },
      ],
    });
  }

  // Always return with questions included
  return testPrisma.lessonQuiz.findUnique({
    where: { id: quiz.id },
    include: {
      questions: {
        include: {
          options: true,
        },
      },
    },
  });
}

interface CreateTestHomeworkAssignmentOptions {
  streamId: string;
  lessonId?: string;
  title?: string;
  description?: string;
  type?: "TEXT" | "AUDIO";
  dueAt?: Date;
}

/**
 * Create a test homework assignment
 */
export async function createTestHomeworkAssignment(
  options: CreateTestHomeworkAssignmentOptions
) {
  const {
    streamId,
    lessonId,
    title = "Test Homework",
    description = "Test homework description",
    type = "TEXT",
    dueAt,
  } = options;

  return testPrisma.homeworkAssignment.create({
    data: {
      streamId,
      lessonId,
      title,
      description,
      type,
      dueAt,
    },
  });
}

/**
 * Create a mock NextAuth session for testing
 */
export function createMockSession(user: {
  id: string;
  email: string;
  name: string;
  role: "STUDENT" | "TEACHER" | "ADMIN" | "MODERATOR";
}) {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Generate base64-encoded audio data for testing voice submissions
 */
export function generateTestAudioBase64(sizeInBytes = 1024): string {
  const buffer = Buffer.alloc(sizeInBytes);
  // Fill with random data to simulate audio
  for (let i = 0; i < sizeInBytes; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  return buffer.toString("base64");
}
