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
  emailVerificationTemplate,
  teacherApplicationApprovedTemplate,
  teacherApplicationRejectedTemplate,
  enrollmentRequestApprovedTemplate,
  enrollmentRequestSubmittedTemplate,
  enrollmentRequestRejectedTemplate,
  enrollmentConfirmedTemplate,
  passwordResetTemplate,
  userBlockedTemplate,
  userUnblockedTemplate,
  type LessonStartingData,
  type NewLessonData,
  type HomeworkCheckedData,
  type QuizCheckedData,
  type HomeworkDeadlineData,
  type NewMessageData,
  type HomeworkSubmittedData,
  type QuizSubmittedData,
  type StudentJoinedData,
  type EmailVerificationData,
  type TeacherApplicationApprovedData,
  type TeacherApplicationRejectedData,
  type EnrollmentRequestApprovedData,
  type EnrollmentRequestSubmittedData,
  type EnrollmentRequestRejectedData,
  type EnrollmentConfirmedData,
  type PasswordResetData,
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

  /**
   * Send email verification link
   */
  static async sendEmailVerification(to: string, data: EmailVerificationData): Promise<void> {
    const { subject, html, text } = emailVerificationTemplate(data);
    await this.sendEmail({ to, subject, html, text });
  }

  /**
   * Send teacher application approved notification
   */
  static async sendTeacherApplicationApproved(to: string, data: TeacherApplicationApprovedData): Promise<void> {
    const { subject, html, text } = teacherApplicationApprovedTemplate(data);
    await this.sendEmail({ to, subject, html, text });
  }

  /**
   * Send teacher application rejected notification
   */
  static async sendTeacherApplicationRejected(to: string, data: TeacherApplicationRejectedData): Promise<void> {
    const { subject, html, text } = teacherApplicationRejectedTemplate(data);
    await this.sendEmail({ to, subject, html, text });
  }

  /**
   * Send enrollment request submitted notification (for teachers)
   */
  static async sendEnrollmentRequestSubmitted(to: string, data: EnrollmentRequestSubmittedData): Promise<void> {
    const { subject, html, text } = enrollmentRequestSubmittedTemplate(data);
    await this.sendEmail({ to, subject, html, text });
  }

  /**
   * Send enrollment request approved notification (for students)
   */
  static async sendEnrollmentRequestApproved(to: string, data: EnrollmentRequestApprovedData): Promise<void> {
    const { subject, html, text } = enrollmentRequestApprovedTemplate(data);
    await this.sendEmail({ to, subject, html, text });
  }

  /**
   * Send enrollment request rejected notification (for students)
   */
  static async sendEnrollmentRequestRejected(to: string, data: EnrollmentRequestRejectedData): Promise<void> {
    const { subject, html, text } = enrollmentRequestRejectedTemplate(data);
    await this.sendEmail({ to, subject, html, text });
  }

  /**
   * Send enrollment confirmed notification (for students)
   */
  static async sendEnrollmentConfirmed(to: string, data: EnrollmentConfirmedData): Promise<void> {
    const { subject, html, text } = enrollmentConfirmedTemplate(data);
    await this.sendEmail({ to, subject, html, text });
  }

  /**
   * Send password reset notification with temporary password
   */
  static async sendPasswordReset(to: string, data: PasswordResetData): Promise<void> {
    const { subject, html, text } = passwordResetTemplate(data);
    await this.sendEmail({ to, subject, html, text });
  }
}
