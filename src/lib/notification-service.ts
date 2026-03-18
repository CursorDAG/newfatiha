import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { logger } from "@/lib/logger";
import { EmailService } from "@/lib/email-service";

/**
 * Сервис для создания и управления уведомлениями
 * Создает in-app уведомления и отправляет email
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
          include: { user: true },
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

    // Create in-app notifications
    await this.createMany(userIds, {
      type: "NEW_LESSON",
      title: "Новый урок",
      message: `Добавлен новый урок: ${lesson.title}`,
      link: `/lesson/${lessonId}`,
    });

    // Send email notifications
    try {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      for (const enrollment of stream.enrollments) {
        if (enrollment.user.email) {
          await EmailService.sendNewLesson(enrollment.user.email, {
            userName: enrollment.user.name || "Студент",
            lessonTitle: lesson.title,
            lessonDescription: lesson.content || undefined,
            streamName: stream.name,
            lessonUrl: `${baseUrl}/lesson/${lessonId}`,
            publishedDate: new Date().toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
          });
        }
      }
    } catch (error) {
      logger.error({ error, streamId, lessonId }, "Failed to send new lesson emails");
      // Don't throw - email failures should not break core functionality
    }
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
          include: { user: true },
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

    // Create in-app notifications
    await this.createMany(userIds, {
      type: "HOMEWORK_ASSIGNED",
      title: "Новое домашнее задание",
      message: `Задание: ${assignment.title}`,
      link: `/student`, // TODO: добавить прямую ссылку на ДЗ
    });

    // Send email notifications
    try {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      for (const enrollment of stream.enrollments) {
        if (enrollment.user.email) {
          await EmailService.sendNewLesson(enrollment.user.email, {
            userName: enrollment.user.name || "Студент",
            lessonTitle: assignment.title,
            lessonDescription: assignment.description || undefined,
            streamName: stream.name,
            lessonUrl: `${baseUrl}/student`,
            publishedDate: new Date().toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
          });
        }
      }
    } catch (error) {
      logger.error({ error, streamId, assignmentId }, "Failed to send homework assigned emails");
    }
  }

  /**
   * Уведомить студента о проверке домашнего задания
   */
  static async notifyHomeworkChecked(submissionId: string) {
    const submission = await prisma.homeworkSubmission.findUnique({
      where: { id: submissionId },
      include: {
        enrollment: {
          include: { user: true },
        },
        assignment: {
          select: { title: true },
        },
      },
    });

    if (!submission) {
      throw new Error("Submission not found");
    }

    // Only notify if status is not SUBMITTED
    if (submission.status === "SUBMITTED") {
      return;
    }

    const statusText =
      submission.status === "ACCEPTED"
        ? "принято"
        : submission.status === "NEEDS_REWORK"
          ? "требует доработки"
          : "отклонено";

    // Create in-app notification
    await this.create({
      userId: submission.enrollment.userId,
      type: "HOMEWORK_CHECKED",
      title: "Домашнее задание проверено",
      message: `Ваша работа "${submission.assignment.title}" ${statusText}`,
      link: `/student`, // TODO: добавить прямую ссылку на результат
    });

    // Send email notification
    try {
      const user = submission.enrollment.user;
      if (user.email) {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        await EmailService.sendHomeworkChecked(user.email, {
          userName: user.name || "Студент",
          assignmentTitle: submission.assignment.title,
          status: submission.status,
          teacherComment: submission.teacherComment || undefined,
          grade: submission.grade || undefined,
          homeworkUrl: `${baseUrl}/student`,
        });
      }
    } catch (error) {
      logger.error({ error, submissionId }, "Failed to send homework checked email");
    }
  }

  /**
   * Уведомить студента о проверке теста
   */
  static async notifyQuizChecked(submissionId: string) {
    const submission = await prisma.lessonQuizSubmission.findUnique({
      where: { id: submissionId },
      include: {
        student: true,
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

    // Create in-app notification
    await this.create({
      userId: submission.student.id,
      type: "QUIZ_CHECKED",
      title: "Тест проверен",
      message: `Тест по уроку "${submission.quiz.lesson.title}" ${statusText}`,
      link: `/lesson/${submission.quiz.lesson.id}`,
    });

    // Send email notification
    try {
      if (submission.student.email && submission.status !== "SUBMITTED") {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        await EmailService.sendQuizChecked(submission.student.email, {
          userName: submission.student.name || "Студент",
          lessonTitle: submission.quiz.lesson.title,
          quizTitle: submission.quiz.title,
          status: submission.status as "PASSED" | "FAILED",
          lessonUrl: `${baseUrl}/lesson/${submission.quiz.lesson.id}`,
        });
      }
    } catch (error) {
      logger.error({ error, submissionId }, "Failed to send quiz checked email");
    }
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

  /**
   * Уведомить учителя о сдаче домашнего задания студентом
   */
  static async notifyHomeworkSubmitted(
    submissionId: string,
    teacherId: string
  ) {
    const submission = await prisma.homeworkSubmission.findUnique({
      where: { id: submissionId },
      include: {
        enrollment: {
          include: {
            user: true,
            stream: true,
          },
        },
        assignment: true,
      },
    });

    if (!submission) {
      throw new Error("Submission not found");
    }

    // Create in-app notification
    await this.create({
      userId: teacherId,
      type: "HOMEWORK_SUBMITTED",
      title: "Студент сдал домашнее задание",
      message: `${submission.enrollment.user.name || "Студент"} сдал "${submission.assignment.title}"`,
      link: `/teacher`,
    });

    // Send email notification
    try {
      const teacher = await prisma.user.findUnique({
        where: { id: teacherId },
        select: { email: true, name: true },
      });

      if (teacher?.email) {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        await EmailService.sendHomeworkSubmitted(teacher.email, {
          teacherName: teacher.name || "Учитель",
          studentName: submission.enrollment.user.name || "Студент",
          assignmentTitle: submission.assignment.title,
          streamName: submission.enrollment.stream.name,
          submittedAt: submission.createdAt.toLocaleString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          reviewUrl: `${baseUrl}/teacher`,
        });
      }
    } catch (error) {
      logger.error({ error, submissionId }, "Failed to send homework submitted email");
    }
  }

  /**
   * Уведомить учителя о сдаче теста студентом
   */
  static async notifyQuizSubmitted(
    submissionId: string,
    teacherId: string
  ) {
    const submission = await prisma.lessonQuizSubmission.findUnique({
      where: { id: submissionId },
      include: {
        student: true,
        quiz: {
          include: {
            lesson: {
              include: {
                stream: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new Error("Submission not found");
    }

    // Create in-app notification
    await this.create({
      userId: teacherId,
      type: "QUIZ_SUBMITTED",
      title: "Студент сдал тест",
      message: `${submission.student.name || "Студент"} сдал "${submission.quiz.title}"`,
      link: `/teacher`,
    });

    // Send email notification
    try {
      const teacher = await prisma.user.findUnique({
        where: { id: teacherId },
        select: { email: true, name: true },
      });

      if (teacher?.email) {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        await EmailService.sendQuizSubmitted(teacher.email, {
          teacherName: teacher.name || "Учитель",
          studentName: submission.student.name || "Студент",
          quizTitle: submission.quiz.title,
          lessonTitle: submission.quiz.lesson.title,
          streamName: submission.quiz.lesson.stream.name,
          submittedAt: submission.createdAt.toLocaleString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          reviewUrl: `${baseUrl}/teacher`,
          isVoiceQuiz: submission.quiz.type === "VOICE",
        });
      }
    } catch (error) {
      logger.error({ error, submissionId }, "Failed to send quiz submitted email");
    }
  }

  /**
   * Уведомить учителя о присоединении нового студента к потоку
   */
  static async notifyStudentJoined(
    enrollmentId: string,
    teacherId: string
  ) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        user: true,
        stream: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new Error("Enrollment not found");
    }

    // Create in-app notification
    await this.create({
      userId: teacherId,
      type: "STUDENT_JOINED",
      title: "Новый студент присоединился",
      message: `${enrollment.user.name || "Студент"} присоединился к потоку "${enrollment.stream.name}"`,
      link: `/teacher`,
    });

    // Send email notification
    try {
      const teacher = await prisma.user.findUnique({
        where: { id: teacherId },
        select: { email: true, name: true },
      });

      if (teacher?.email) {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        await EmailService.sendStudentJoined(teacher.email, {
          teacherName: teacher.name || "Учитель",
          studentName: enrollment.user.name || "Студент",
          studentEmail: enrollment.user.email,
          streamName: enrollment.stream.name,
          courseName: enrollment.stream.course.title,
          joinedAt: enrollment.createdAt.toLocaleString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          profileUrl: `${baseUrl}/teacher`,
        });
      }
    } catch (error) {
      logger.error({ error, enrollmentId }, "Failed to send student joined email");
    }
  }
}
