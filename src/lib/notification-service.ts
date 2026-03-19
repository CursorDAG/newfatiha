import { prisma } from "@/lib/prisma";
import { NotificationType, NotificationPriority, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { EmailService } from "@/lib/email-service";
import { sendNotificationToUser } from "@/lib/socket-server";

/**
 * Сервис для создания и управления уведомлениями
 * Создает in-app уведомления, отправляет email и real-time через Socket.io
 */

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  priority?: NotificationPriority;
  metadata?: Prisma.InputJsonValue;
  actionUrl?: string;
  actionText?: string;
}

export class NotificationService {
  /**
   * Создать уведомление для пользователя с real-time доставкой
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
          priority: params.priority || "NORMAL",
          metadata: params.metadata || undefined,
          actionUrl: params.actionUrl,
          actionText: params.actionText,
        },
      });

      logger.info({
        notificationId: notification.id,
        userId: params.userId,
        type: params.type,
        priority: notification.priority,
      }, "Notification created");

      // Send via Socket.io for real-time delivery
      await sendNotificationToUser(params.userId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link || undefined,
        priority: notification.priority,
        createdAt: notification.createdAt,
      });

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
      // Create notifications in database
      const createdNotifications = await Promise.all(
        userIds.map((userId) =>
          prisma.notification.create({
            data: {
              userId,
              type: params.type,
              title: params.title,
              message: params.message,
              link: params.link,
              priority: params.priority || "NORMAL",
              metadata: params.metadata || undefined,
              actionUrl: params.actionUrl,
              actionText: params.actionText,
            },
          })
        )
      );

      logger.info({
        count: createdNotifications.length,
        type: params.type,
      }, "Bulk notifications created");

      // Send via Socket.io to all users
      await Promise.all(
        createdNotifications.map((notification) =>
          sendNotificationToUser(notification.userId, {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            link: notification.link || undefined,
            priority: notification.priority,
            createdAt: notification.createdAt,
          })
        )
      );

      return { count: createdNotifications.length };
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
   * Массовая рассылка уведомлений всем пользователям с определенной ролью
   */
  static async broadcast(
    params: {
      role?: "STUDENT" | "TEACHER" | "ADMIN";
      type: NotificationType;
      title: string;
      message: string;
      link?: string;
      priority?: NotificationPriority;
      metadata?: Prisma.InputJsonValue;
      sendEmail?: boolean;
      userIds?: string[]; // Specific users
    }
  ) {
    try {
      let userIds: string[] = [];

      // If specific userIds provided, use them
      if (params.userIds && params.userIds.length > 0) {
        userIds = params.userIds;
      } else {
        // Get all users with specified role (or all if no role specified)
        const users = await prisma.user.findMany({
          where: {
            ...(params.role ? { role: params.role } : {}),
            isBlocked: false,
            deletedAt: null,
          },
          select: { id: true },
        });

        userIds = users.map((u) => u.id);
      }

      if (userIds.length === 0) {
        logger.warn({ role: params.role }, "No users found for broadcast");
        return { count: 0, readCount: 0 };
      }

      logger.info({
        role: params.role,
        userCount: userIds.length,
        type: params.type,
        priority: params.priority,
      }, "Broadcasting notification");

      const result = await this.createMany(userIds, {
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
        priority: params.priority,
        metadata: params.metadata,
      });

      // TODO: Send emails if sendEmail is true
      // This would require extending EmailService with a broadcast method
      if (params.sendEmail) {
        logger.info({ userCount: userIds.length }, "Email broadcast requested but not yet implemented");
      }

      return { count: result.count, readCount: 0 };
    } catch (error) {
      logger.error({ error, role: params.role }, "Failed to broadcast notification");
      throw error;
    }
  }

  /**
   * Проверить настройки пользователя перед отправкой email
   */
  static async shouldSendEmail(userId: string, type: NotificationType): Promise<boolean> {
    try {
      const preferences = await prisma.notificationPreference.findUnique({
        where: { userId },
      });

      // If no preferences set, send email by default
      if (!preferences) {
        return true;
      }

      // Map notification type to preference field
      const typeToPreferenceMap: Record<string, keyof typeof preferences> = {
        NEW_LESSON: "emailNewLesson",
        HOMEWORK_ASSIGNED: "emailHomeworkAssigned",
        HOMEWORK_CHECKED: "emailHomeworkChecked",
        QUIZ_CHECKED: "emailQuizChecked",
        ANNOUNCEMENT: "emailAnnouncement",
        HOMEWORK_SUBMITTED: "emailHomeworkSubmitted",
        QUIZ_SUBMITTED: "emailQuizSubmitted",
        STUDENT_JOINED: "emailStudentJoined",
      };

      const preferenceKey = typeToPreferenceMap[type];
      if (preferenceKey && typeof preferences[preferenceKey] === "boolean") {
        return preferences[preferenceKey] as boolean;
      }

      // Default to true for types not in map
      return true;
    } catch (error) {
      logger.error({ error, userId, type }, "Failed to check email preferences");
      // Default to true on error
      return true;
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
          // Check email preferences
          const shouldSend = await this.shouldSendEmail(enrollment.userId, "NEW_LESSON");
          if (!shouldSend) {
            continue;
          }

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
          // Check email preferences
          const shouldSend = await this.shouldSendEmail(enrollment.userId, "HOMEWORK_ASSIGNED");
          if (!shouldSend) {
            continue;
          }

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
        // Check email preferences
        const shouldSend = await this.shouldSendEmail(user.id, "HOMEWORK_CHECKED");
        if (shouldSend) {
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
        // Check email preferences
        const shouldSend = await this.shouldSendEmail(submission.student.id, "QUIZ_CHECKED");
        if (shouldSend) {
          const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
          await EmailService.sendQuizChecked(submission.student.email, {
            userName: submission.student.name || "Студент",
            lessonTitle: submission.quiz.lesson.title,
            quizTitle: submission.quiz.title,
            status: submission.status as "PASSED" | "FAILED",
            lessonUrl: `${baseUrl}/lesson/${submission.quiz.lesson.id}`,
          });
        }
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
        // Check email preferences
        const shouldSend = await this.shouldSendEmail(teacherId, "HOMEWORK_SUBMITTED");
        if (shouldSend) {
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
        // Check email preferences
        const shouldSend = await this.shouldSendEmail(teacherId, "QUIZ_SUBMITTED");
        if (shouldSend) {
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
        // Check email preferences
        const shouldSend = await this.shouldSendEmail(teacherId, "STUDENT_JOINED");
        if (shouldSend) {
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
      }
    } catch (error) {
      logger.error({ error, enrollmentId }, "Failed to send student joined email");
    }
  }

  /**
   * Уведомить администратора о новой заявке на регистрацию учителя
   */
  static async notifyTeacherApplicationSubmitted(applicationId: string) {
    try {
      // Get all admins
      const admins = await prisma.user.findMany({
        where: {
          role: { in: ["ADMIN", "MODERATOR"] },
          isBlocked: false,
        },
        select: { id: true },
      });

      if (admins.length === 0) {
        logger.warn("No admins found to notify about teacher application");
        return;
      }

      const application = await prisma.teacherProfile.findUnique({
        where: { id: applicationId },
        include: { user: true },
      });

      if (!application) {
        throw new Error("Teacher application not found");
      }

      const adminIds = admins.map((a) => a.id);

      await this.createMany(adminIds, {
        type: "TEACHER_APPLICATION_SUBMITTED",
        title: "Новая заявка на регистрацию учителя",
        message: `${application.user.name || "Пользователь"} подал заявку на регистрацию учителя`,
        link: `/admin/teacher-applications`,
        priority: "HIGH",
      });
    } catch (error) {
      logger.error({ error, applicationId }, "Failed to notify about teacher application");
    }
  }

  /**
   * Уведомить пользователя об одобрении заявки учителя
   */
  static async notifyTeacherApplicationApproved(userId: string) {
    try {
      await this.create({
        userId,
        type: "TEACHER_APPLICATION_APPROVED",
        title: "Заявка одобрена",
        message: "Ваша заявка на регистрацию учителя одобрена. Теперь вы можете создавать курсы.",
        link: "/teacher",
        priority: "HIGH",
      });
    } catch (error) {
      logger.error({ error, userId }, "Failed to notify about teacher application approval");
    }
  }

  /**
   * Уведомить пользователя об отклонении заявки учителя
   */
  static async notifyTeacherApplicationRejected(userId: string, reason?: string) {
    try {
      await this.create({
        userId,
        type: "TEACHER_APPLICATION_REJECTED",
        title: "Заявка отклонена",
        message: reason || "Ваша заявка на регистрацию учителя отклонена.",
        priority: "NORMAL",
        metadata: { reason },
      });
    } catch (error) {
      logger.error({ error, userId }, "Failed to notify about teacher application rejection");
    }
  }

  /**
   * Уведомить администратора о новой регистрации студента
   */
  static async notifyStudentRegistered(userId: string) {
    try {
      // Get all admins
      const admins = await prisma.user.findMany({
        where: {
          role: { in: ["ADMIN", "MODERATOR"] },
          isBlocked: false,
        },
        select: { id: true },
      });

      if (admins.length === 0) {
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });

      if (!user) {
        return;
      }

      const adminIds = admins.map((a) => a.id);

      await this.createMany(adminIds, {
        type: "STUDENT_REGISTERED",
        title: "Новый студент зарегистрировался",
        message: `${user.name || user.email} зарегистрировался в системе`,
        link: `/admin/users`,
        priority: "LOW",
      });
    } catch (error) {
      logger.error({ error, userId }, "Failed to notify about student registration");
    }
  }

  /**
   * Уведомить учителя о новой заявке на зачисление
   */
  static async notifyEnrollmentRequestSubmitted(requestId: string, teacherId: string) {
    try {
      const request = await prisma.enrollmentRequest.findUnique({
        where: { id: requestId },
        include: {
          student: true,
          stream: true,
        },
      });

      if (!request) {
        throw new Error("Enrollment request not found");
      }

      await this.create({
        userId: teacherId,
        type: "ENROLLMENT_REQUEST_SUBMITTED",
        title: "Новая заявка на зачисление",
        message: `${request.student.name || "Студент"} подал заявку на зачисление в поток "${request.stream.name}"`,
        link: `/teacher`,
        priority: "HIGH",
      });
    } catch (error) {
      logger.error({ error, requestId }, "Failed to notify about enrollment request");
    }
  }

  /**
   * Уведомить студента об одобрении заявки на зачисление
   */
  static async notifyEnrollmentRequestApproved(requestId: string) {
    try {
      const request = await prisma.enrollmentRequest.findUnique({
        where: { id: requestId },
        include: {
          student: true,
          stream: true,
        },
      });

      if (!request) {
        throw new Error("Enrollment request not found");
      }

      await this.create({
        userId: request.studentId,
        type: "ENROLLMENT_REQUEST_APPROVED",
        title: "Заявка одобрена",
        message: `Ваша заявка на зачисление в поток "${request.stream.name}" одобрена`,
        link: `/student`,
        priority: "HIGH",
      });
    } catch (error) {
      logger.error({ error, requestId }, "Failed to notify about enrollment approval");
    }
  }

  /**
   * Уведомить студента об отклонении заявки на зачисление
   */
  static async notifyEnrollmentRequestRejected(requestId: string, reason?: string) {
    try {
      const request = await prisma.enrollmentRequest.findUnique({
        where: { id: requestId },
        include: {
          student: true,
          stream: true,
        },
      });

      if (!request) {
        throw new Error("Enrollment request not found");
      }

      await this.create({
        userId: request.studentId,
        type: "ENROLLMENT_REQUEST_REJECTED",
        title: "Заявка отклонена",
        message: reason || `Ваша заявка на зачисление в поток "${request.stream.name}" отклонена`,
        priority: "NORMAL",
        metadata: { reason },
      });
    } catch (error) {
      logger.error({ error, requestId }, "Failed to notify about enrollment rejection");
    }
  }

  /**
   * Уведомить студента о необходимости оплаты
   */
  static async notifyEnrollmentPaymentRequired(requestId: string) {
    try {
      const request = await prisma.enrollmentRequest.findUnique({
        where: { id: requestId },
        include: {
          student: true,
          stream: true,
        },
      });

      if (!request) {
        throw new Error("Enrollment request not found");
      }

      await this.create({
        userId: request.studentId,
        type: "ENROLLMENT_PAYMENT_REQUIRED",
        title: "Требуется оплата",
        message: `Для зачисления в поток "${request.stream.name}" необходимо произвести оплату`,
        link: `/student/enrollment/${requestId}`,
        priority: "HIGH",
        actionUrl: `/student/enrollment/${requestId}/payment`,
        actionText: "Оплатить",
      });
    } catch (error) {
      logger.error({ error, requestId }, "Failed to notify about payment requirement");
    }
  }

  /**
   * Уведомить студента о подтверждении оплаты и зачислении
   */
  static async notifyEnrollmentConfirmed(requestId: string) {
    try {
      const request = await prisma.enrollmentRequest.findUnique({
        where: { id: requestId },
        include: {
          student: true,
          stream: true,
        },
      });

      if (!request) {
        throw new Error("Enrollment request not found");
      }

      await this.create({
        userId: request.studentId,
        type: "ENROLLMENT_CONFIRMED",
        title: "Зачисление подтверждено",
        message: `Вы успешно зачислены в поток "${request.stream.name}". Добро пожаловать!`,
        link: `/student`,
        priority: "HIGH",
      });
    } catch (error) {
      logger.error({ error, requestId }, "Failed to notify about enrollment confirmation");
    }
  }
}
