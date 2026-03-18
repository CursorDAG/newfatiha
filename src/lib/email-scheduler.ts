import cron, { ScheduledTask } from "node-cron";
import { prisma } from "@/lib/prisma";
import { EmailService } from "@/lib/email-service";
import { logger } from "@/lib/logger";

/**
 * Scheduled tasks for email notifications
 * Uses node-cron to run periodic checks
 */

export class EmailScheduler {
  private static lessonReminderJob: ScheduledTask | null = null;
  private static homeworkDeadlineJob: ScheduledTask | null = null;

  /**
   * Start all scheduled tasks
   */
  static start() {
    this.startLessonReminders();
    this.startHomeworkDeadlineReminders();
    logger.info("Email scheduler started");
  }

  /**
   * Stop all scheduled tasks
   */
  static stop() {
    if (this.lessonReminderJob) {
      this.lessonReminderJob.stop();
      this.lessonReminderJob = null;
    }
    if (this.homeworkDeadlineJob) {
      this.homeworkDeadlineJob.stop();
      this.homeworkDeadlineJob = null;
    }
    logger.info("Email scheduler stopped");
  }

  /**
   * Check for lessons starting in 15 minutes and send reminders
   * Runs every 5 minutes
   */
  private static startLessonReminders() {
    // Run every 5 minutes
    this.lessonReminderJob = cron.schedule("*/5 * * * *", async () => {
      try {
        await this.checkUpcomingLessons();
      } catch (error) {
        logger.error({ error }, "Failed to check upcoming lessons");
      }
    });
  }

  /**
   * Check for homework deadlines in 24 hours and send reminders
   * Runs every hour
   */
  private static startHomeworkDeadlineReminders() {
    // Run every hour at minute 0
    this.homeworkDeadlineJob = cron.schedule("0 * * * *", async () => {
      try {
        await this.checkHomeworkDeadlines();
      } catch (error) {
        logger.error({ error }, "Failed to check homework deadlines");
      }
    });
  }

  /**
   * Find lessons starting in 10-20 minutes and send email reminders
   */
  private static async checkUpcomingLessons() {
    const now = new Date();

    // Get current day of week and time
    const dayOfWeek = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Find schedule slots starting in 10-20 minutes
    const upcomingSlots = await prisma.streamScheduleSlot.findMany({
      where: {
        dayOfWeek,
        startMinutes: {
          gte: currentMinutes + 10,
          lte: currentMinutes + 20,
        },
      },
      include: {
        stream: {
          include: {
            enrollments: {
              where: { status: "ACTIVE" },
              include: { user: true },
            },
            lessons: {
              where: { type: "LIVE" },
              orderBy: { sortOrder: "asc" },
              take: 1,
            },
          },
        },
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    for (const slot of upcomingSlots) {
      const stream = slot.stream;
      const lesson = stream.lessons[0];

      if (!lesson) continue;

      const startTime = `${Math.floor(slot.startMinutes / 60).toString().padStart(2, "0")}:${(slot.startMinutes % 60).toString().padStart(2, "0")}`;

      // Send to students
      for (const enrollment of stream.enrollments) {
        if (enrollment.user.email) {
          try {
            await EmailService.sendLessonStarting(enrollment.user.email, {
              userName: enrollment.user.name || "Студент",
              lessonTitle: lesson.title,
              streamName: stream.name,
              lessonUrl: `${baseUrl}/lesson/${lesson.id}`,
              startTime,
            });
          } catch (error) {
            logger.error({
              error,
              userId: enrollment.userId,
              lessonId: lesson.id,
            }, "Failed to send lesson reminder to student");
          }
        }
      }

      // Send to teacher
      const teacher = await prisma.user.findUnique({
        where: { id: stream.teacherId },
        select: { email: true, name: true },
      });

      if (teacher?.email) {
        try {
          await EmailService.sendLessonStarting(teacher.email, {
            userName: teacher.name || "Учитель",
            lessonTitle: lesson.title,
            streamName: stream.name,
            lessonUrl: `${baseUrl}/lesson/${lesson.id}`,
            startTime,
          });
        } catch (error) {
          logger.error({
            error,
            teacherId: stream.teacherId,
            lessonId: lesson.id,
          }, "Failed to send lesson reminder to teacher");
        }
      }

      logger.info({
        streamId: stream.id,
        lessonId: lesson.id,
        startTime,
      }, "Sent lesson starting reminders");
    }
  }

  /**
   * Find homework assignments with deadlines in 20-28 hours and send reminders
   */
  private static async checkHomeworkDeadlines() {
    const now = new Date();
    const in20Hours = new Date(now.getTime() + 20 * 60 * 60 * 1000);
    const in28Hours = new Date(now.getTime() + 28 * 60 * 60 * 1000);

    const upcomingDeadlines = await prisma.homeworkAssignment.findMany({
      where: {
        dueAt: {
          gte: in20Hours,
          lte: in28Hours,
        },
      },
      include: {
        stream: {
          include: {
            enrollments: {
              where: { status: "ACTIVE" },
              include: {
                user: true,
                homeworkSubmissions: {
                  where: {
                    assignmentId: undefined, // Will be set in the loop
                  },
                },
              },
            },
          },
        },
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    for (const assignment of upcomingDeadlines) {
      if (!assignment.dueAt) continue;

      const timeRemaining = this.formatTimeRemaining(
        assignment.dueAt.getTime() - now.getTime()
      );

      // Find students who haven't submitted yet
      const enrollmentsWithoutSubmission = await prisma.enrollment.findMany({
        where: {
          streamId: assignment.streamId,
          status: "ACTIVE",
          homeworkSubmissions: {
            none: {
              assignmentId: assignment.id,
            },
          },
        },
        include: {
          user: true,
        },
      });

      for (const enrollment of enrollmentsWithoutSubmission) {
        if (enrollment.user.email) {
          try {
            await EmailService.sendHomeworkDeadline(enrollment.user.email, {
              userName: enrollment.user.name || "Студент",
              assignmentTitle: assignment.title,
              streamName: assignment.stream.name,
              deadline: assignment.dueAt.toLocaleString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
              timeRemaining,
              homeworkUrl: `${baseUrl}/student`,
            });
          } catch (error) {
            logger.error({
              error,
              userId: enrollment.userId,
              assignmentId: assignment.id,
            }, "Failed to send homework deadline reminder");
          }
        }
      }

      logger.info({
        assignmentId: assignment.id,
        studentsNotified: enrollmentsWithoutSubmission.length,
      }, "Sent homework deadline reminders");
    }
  }

  /**
   * Format milliseconds into human-readable time remaining
   */
  private static formatTimeRemaining(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days} ${days === 1 ? "день" : days < 5 ? "дня" : "дней"}`;
    }

    if (hours > 0) {
      return `${hours} ${hours === 1 ? "час" : hours < 5 ? "часа" : "часов"}`;
    }

    return `${minutes} ${minutes === 1 ? "минута" : minutes < 5 ? "минуты" : "минут"}`;
  }
}
