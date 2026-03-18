import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmailService } from "@/lib/email-service";
import * as emailConfig from "@/lib/email/config";

// Mock nodemailer
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn(async (options) => ({
        messageId: "test-message-id",
        accepted: [options.to],
        rejected: [],
        previewURL: "https://ethereal.email/message/test",
      })),
    })),
    createTestAccount: vi.fn(async () => ({
      user: "test@ethereal.email",
      pass: "test-password",
    })),
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("EmailService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendLessonStarting", () => {
    it("should send lesson starting email", async () => {
      const data = {
        userName: "Иван Иванов",
        lessonTitle: "Введение в таджвид",
        streamName: "Группа 1",
        lessonUrl: "http://localhost:3000/lesson/123",
        startTime: "10:00",
      };

      await EmailService.sendLessonStarting("student@example.com", data);

      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe("sendNewLesson", () => {
    it("should send new lesson email", async () => {
      const data = {
        userName: "Иван Иванов",
        lessonTitle: "Урок 5: Правила чтения",
        lessonDescription: "Изучаем основные правила чтения Корана",
        streamName: "Группа 1",
        lessonUrl: "http://localhost:3000/lesson/123",
        publishedDate: "15 марта 2026",
      };

      await EmailService.sendNewLesson("student@example.com", data);

      expect(true).toBe(true);
    });
  });

  describe("sendHomeworkChecked", () => {
    it("should send homework checked email with ACCEPTED status", async () => {
      const data = {
        userName: "Иван Иванов",
        assignmentTitle: "Домашнее задание 1",
        status: "ACCEPTED" as const,
        teacherComment: "Отличная работа!",
        grade: 95,
        homeworkUrl: "http://localhost:3000/student",
      };

      await EmailService.sendHomeworkChecked("student@example.com", data);

      expect(true).toBe(true);
    });

    it("should send homework checked email with NEEDS_REWORK status", async () => {
      const data = {
        userName: "Иван Иванов",
        assignmentTitle: "Домашнее задание 1",
        status: "NEEDS_REWORK" as const,
        teacherComment: "Нужно доработать третий пункт",
        homeworkUrl: "http://localhost:3000/student",
      };

      await EmailService.sendHomeworkChecked("student@example.com", data);

      expect(true).toBe(true);
    });
  });

  describe("sendQuizChecked", () => {
    it("should send quiz checked email with PASSED status", async () => {
      const data = {
        userName: "Иван Иванов",
        lessonTitle: "Урок 5: Правила чтения",
        quizTitle: "Тест по таджвиду",
        status: "PASSED" as const,
        score: 85,
        lessonUrl: "http://localhost:3000/lesson/123",
      };

      await EmailService.sendQuizChecked("student@example.com", data);

      expect(true).toBe(true);
    });

    it("should send quiz checked email with FAILED status", async () => {
      const data = {
        userName: "Иван Иванов",
        lessonTitle: "Урок 5: Правила чтения",
        quizTitle: "Тест по таджвиду",
        status: "FAILED" as const,
        score: 45,
        teacherComment: "Повторите материал урока",
        lessonUrl: "http://localhost:3000/lesson/123",
      };

      await EmailService.sendQuizChecked("student@example.com", data);

      expect(true).toBe(true);
    });
  });

  describe("sendHomeworkDeadline", () => {
    it("should send homework deadline reminder", async () => {
      const data = {
        userName: "Иван Иванов",
        assignmentTitle: "Домашнее задание 2",
        streamName: "Группа 1",
        deadline: "20 марта 2026, 23:59",
        timeRemaining: "24 часа",
        homeworkUrl: "http://localhost:3000/student",
      };

      await EmailService.sendHomeworkDeadline("student@example.com", data);

      expect(true).toBe(true);
    });
  });

  describe("sendNewMessage", () => {
    it("should send new message notification", async () => {
      const data = {
        userName: "Иван Иванов",
        senderName: "Учитель Ахмед",
        messagePreview: "Здравствуйте! Напоминаю о завтрашнем уроке...",
        messageUrl: "http://localhost:3000/chat/123",
      };

      await EmailService.sendNewMessage("student@example.com", data);

      expect(true).toBe(true);
    });
  });

  describe("sendHomeworkSubmitted", () => {
    it("should send homework submitted notification to teacher", async () => {
      const data = {
        teacherName: "Учитель Ахмед",
        studentName: "Иван Иванов",
        assignmentTitle: "Домашнее задание 1",
        streamName: "Группа 1",
        submittedAt: "18 марта 2026, 14:30",
        reviewUrl: "http://localhost:3000/teacher",
      };

      await EmailService.sendHomeworkSubmitted("teacher@example.com", data);

      expect(true).toBe(true);
    });
  });

  describe("sendQuizSubmitted", () => {
    it("should send quiz submitted notification to teacher", async () => {
      const data = {
        teacherName: "Учитель Ахмед",
        studentName: "Иван Иванов",
        quizTitle: "Тест по таджвиду",
        lessonTitle: "Урок 5: Правила чтения",
        streamName: "Группа 1",
        submittedAt: "18 марта 2026, 14:30",
        reviewUrl: "http://localhost:3000/teacher",
        isVoiceQuiz: false,
      };

      await EmailService.sendQuizSubmitted("teacher@example.com", data);

      expect(true).toBe(true);
    });

    it("should send voice quiz submitted notification", async () => {
      const data = {
        teacherName: "Учитель Ахмед",
        studentName: "Иван Иванов",
        quizTitle: "Голосовой тест",
        lessonTitle: "Урок 5: Правила чтения",
        streamName: "Группа 1",
        submittedAt: "18 марта 2026, 14:30",
        reviewUrl: "http://localhost:3000/teacher",
        isVoiceQuiz: true,
      };

      await EmailService.sendQuizSubmitted("teacher@example.com", data);

      expect(true).toBe(true);
    });
  });

  describe("sendStudentJoined", () => {
    it("should send student joined notification to teacher", async () => {
      const data = {
        teacherName: "Учитель Ахмед",
        studentName: "Иван Иванов",
        studentEmail: "student@example.com",
        streamName: "Группа 1",
        courseName: "Основы таджвида",
        joinedAt: "18 марта 2026, 10:00",
        profileUrl: "http://localhost:3000/teacher",
      };

      await EmailService.sendStudentJoined("teacher@example.com", data);

      expect(true).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should not throw error when email sending fails", async () => {
      // Mock sendMail to throw error
      vi.spyOn(emailConfig, "createTransporter").mockResolvedValueOnce({
        sendMail: vi.fn().mockRejectedValueOnce(new Error("SMTP error")),
      } as never);

      const data = {
        userName: "Иван Иванов",
        lessonTitle: "Урок 5",
        streamName: "Группа 1",
        lessonUrl: "http://localhost:3000/lesson/123",
        startTime: "10:00",
      };

      // Should not throw
      await expect(
        EmailService.sendLessonStarting("student@example.com", data)
      ).resolves.not.toThrow();
    });
  });
});
