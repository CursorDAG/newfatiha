import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { logger } from "@/lib/logger";

/**
 * Сервис для создания и управления уведомлениями
 */

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export class NotificationService {
  /**
   * Создать уведомление для пользователя
   */
  static async create(params: CreateNotificationParams) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          title: params.title,
          message: params.message,
          link: params.link,
        },
      });

      logger.info({
        notificationId: notification.id,
        userId: params.userId,
        type: params.type,
      }, "Notification created");

      return notification;
    } catch (error) {
      logger.error({
        error,
        userId: params.userId,
        type: params.type,
      }, "Failed to create notification");
      throw error;
    }
  }

  /**
   * Создать уведомления для нескольких пользователей
   */
  static async createMany(
    userIds: string[],
    params: Omit<CreateNotificationParams, "userId">
  ) {
    try {
      const notifications = await prisma.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          type: params.type,
          title: params.title,
          message: params.message,
          link: params.link,
        })),
      });

      logger.info({
        count: notifications.count,
        type: params.type,
      }, "Bulk notifications created");

      return notifications;
    } catch (error) {
      logger.error({
        error,
        userCount: userIds.length,
        type: params.type,
      }, "Failed to create bulk notifications");
      throw error;
    }
  }

  /**
   * Уведомить всех студентов потока о новом уроке
   */
  static async notifyNewLesson(streamId: string, lessonId: string) {
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          select: { userId: true },
        },
      },
    });

    if (!stream) {
      throw new Error("Stream not found");
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new Error("Lesson not found");
    }

    const userIds = stream.enrollments.map((e) => e.userId);

    if (userIds.length === 0) {
      return;
    }

    return this.createMany(userIds, {
      type: "NEW_LESSON",
      title: "Новый урок",
      message: `Добавлен новый урок: ${lesson.title}`,
      link: `/lesson/${lessonId}`,
    });
  }

  /**
   * Уведомить всех студентов потока о новом домашнем задании
   */
  static async notifyHomeworkAssigned(
    streamId: string,
    assignmentId: string
  ) {
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          select: { userId: true },
        },
      },
    });

    if (!stream) {
      throw new Error("Stream not found");
    }

    const assignment = await prisma.homeworkAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const userIds = stream.enrollments.map((e) => e.userId);

    if (userIds.length === 0) {
      return;
    }

    return this.createMany(userIds, {
      type: "HOMEWORK_ASSIGNED",
      title: "Новое домашнее задание",
      message: `Задание: ${assignment.title}`,
      link: `/student`, // TODO: добавить прямую ссылку на ДЗ
    });
  }

  /**
   * Уведомить студента о проверке домашнего задания
   */
  static async notifyHomeworkChecked(submissionId: string) {
    const submission = await prisma.homeworkSubmission.findUnique({
      where: { id: submissionId },
      include: {
        enrollment: {
          select: { userId: true },
        },
        assignment: {
          select: { title: true },
        },
      },
    });

    if (!submission) {
      throw new Error("Submission not found");
    }

    const statusText =
      submission.status === "ACCEPTED"
        ? "принято"
        : submission.status === "NEEDS_REWORK"
          ? "требует доработки"
          : "отклонено";

    return this.create({
      userId: submission.enrollment.userId,
      type: "HOMEWORK_CHECKED",
      title: "Домашнее задание проверено",
      message: `Ваша работа "${submission.assignment.title}" ${statusText}`,
      link: `/student`, // TODO: добавить прямую ссылку на результат
    });
  }

  /**
   * Уведомить студента о проверке теста
   */
  static async notifyQuizChecked(submissionId: string) {
    const submission = await prisma.lessonQuizSubmission.findUnique({
      where: { id: submissionId },
      include: {
        student: {
          select: { id: true },
        },
        quiz: {
          include: {
            lesson: {
              select: { id: true, title: true },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new Error("Submission not found");
    }

    const statusText =
      submission.status === "PASSED" ? "пройден" : "не пройден";

    return this.create({
      userId: submission.student.id,
      type: "QUIZ_CHECKED",
      title: "Тест проверен",
      message: `Тест по уроку "${submission.quiz.lesson.title}" ${statusText}`,
      link: `/lesson/${submission.quiz.lesson.id}`,
    });
  }

  /**
   * Создать объявление для всех студентов потока
   */
  static async notifyAnnouncement(
    streamId: string,
    title: string,
    message: string
  ) {
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          select: { userId: true },
        },
      },
    });

    if (!stream) {
      throw new Error("Stream not found");
    }

    const userIds = stream.enrollments.map((e) => e.userId);

    if (userIds.length === 0) {
      return;
    }

    return this.createMany(userIds, {
      type: "ANNOUNCEMENT",
      title,
      message,
    });
  }
}
