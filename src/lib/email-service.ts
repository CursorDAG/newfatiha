import { createTransporter, getEmailConfig } from "@/lib/email/config";
import { logger } from "@/lib/logger";
import type { Transporter } from "nodemailer";
import {
  lessonStartingTemplate,
  newLessonTemplate,
  homeworkCheckedTemplate,
  quizCheckedTemplate,
  homeworkDeadlineTemplate,
  newMessageTemplate,
  homeworkSubmittedTemplate,
  quizSubmittedTemplate,
  studentJoinedTemplate,
  type LessonStartingData,
  type NewLessonData,
  type HomeworkCheckedData,
  type QuizCheckedData,
  type HomeworkDeadlineData,
  type NewMessageData,
  type HomeworkSubmittedData,
  type QuizSubmittedData,
  type StudentJoinedData,
} from "@/lib/email/templates";

/**
 * Email service for sending notifications
 * All methods are wrapped in try-catch to prevent email failures from breaking core functionality
 */

export class EmailService {
  private static transporter: Transporter | null = null;

  /**
   * Get or create email transporter
   */
  private static async getTransporter(): Promise<Transporter> {
    if (!this.transporter) {
      this.transporter = await createTransporter();
    }
    return this.transporter;
  }

  /**
   * Send email with template
   */
  private static async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const config = getEmailConfig();

      const info = await transporter.sendMail({
        from: `"${config.from.name}" <${config.from.email}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });

      logger.info({
        messageId: info.messageId,
        to: params.to,
        subject: params.subject,
        previewUrl: info.previewURL,
      }, "Email sent successfully");

      // Log preview URL for Ethereal
      if (info.previewURL) {
        logger.info({ previewUrl: info.previewURL }, "Ethereal preview URL");
      }
    } catch (error) {
      logger.error({
        error,
        to: params.to,
        subject: params.subject,
      }, "Failed to send email");
      // Don't throw - email failures should not break core functionality
    }
  }

  /**
   * Send "lesson starting soon" notification
   */
  static async sendLessonStarting(to: string, data: LessonStartingData): Promise<void> {
    const { subject, html, text } = lessonStartingTemplate(data);
    await this.sendEmail({ to, subject, html, text });
  }

  /**
   * Send "new lesson published" notification
   */
  static async sendNewLesson(to: string, data: NewLessonData): Promise<void> {
    const { subject, html, text } = newLessonTemplate(data);
    await this.sendEmail({ to, subject, html, text });
  }

  /**
   * Send "homework checked" notification
   */
  static async sendHomeworkChecked(to: string, data: HomeworkCheckedData): Promise<void> {
    const { subject, html, text } = homeworkCheckedTemplate(data);
    await this.sendEmail({ to, subject, html, text });
  }

  /**
   * Send "quiz checked" notification
   */
  static async sendQuizChecked(to: string, data: QuizCheckedData): Promise<void> {
    const { subject, html, text } = quizCheckedTemplate(data);
    await this.sendEmail({ to, subject, html, text });
  }

  /**
   * Send "homework deadline approaching" notification
   */
  static async sendHomeworkDeadline(to: string, data: HomeworkDeadlineData): Promise<void> {
    const { subject, html, text } = homeworkDeadlineTemplate(data);
    await this.sendEmail({ to, subject, html, text });
  }

  /**
   * Send "new message" notification
   */
  static async sendNewMessage(to: string, data: NewMessageData): Promise<void> {
    const { subject, html, text } = newMessageTemplate(data);
    await this.sendEmail({ to, subject, html, text });
  }

  /**
   * Send "homework submitted" notification (for teachers)
   */
  static async sendHomeworkSubmitted(to: string, data: HomeworkSubmittedData): Promise<void> {
    const { subject, html, text } = homeworkSubmittedTemplate(data);
    await this.sendEmail({ to, subject, html, text });
  }

  /**
   * Send "quiz submitted" notification (for teachers)
   */
  static async sendQuizSubmitted(to: string, data: QuizSubmittedData): Promise<void> {
    const { subject, html, text } = quizSubmittedTemplate(data);
    await this.sendEmail({ to, subject, html, text });
  }

  /**
   * Send "student joined stream" notification (for teachers)
   */
  static async sendStudentJoined(to: string, data: StudentJoinedData): Promise<void> {
    const { subject, html, text } = studentJoinedTemplate(data);
    await this.sendEmail({ to, subject, html, text });
  }
}
