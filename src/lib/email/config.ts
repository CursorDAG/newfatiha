import * as nodemailer from "nodemailer";
import { logger } from "@/lib/logger";
import { getSetting } from "@/lib/settings";

/**
 * Email configuration and transporter setup
 */

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    email: string;
    name: string;
  };
}

/**
 * Get email configuration from database settings or environment variables
 */
export async function getEmailConfig(): Promise<EmailConfig> {
  // Try to get from database settings first
  const smtpHost = await getSetting<string>("smtpHost");
  const smtpPort = await getSetting<number>("smtpPort");
  const smtpUser = await getSetting<string>("smtpUser");
  const smtpPassword = await getSetting<string>("smtpPassword");
  const smtpFrom = await getSetting<string>("smtpFrom");
  const smtpFromName = await getSetting<string>("smtpFromName");

  // Fallback to environment variables
  const host = smtpHost || process.env.SMTP_HOST || "smtp.ethereal.email";
  const port = smtpPort || parseInt(process.env.SMTP_PORT || "587", 10);
  const user = smtpUser || process.env.SMTP_USER || "";
  const pass = smtpPassword || process.env.SMTP_PASS || "";
  const from = smtpFrom || process.env.SMTP_FROM || "info@fatiha.ru";
  const fromName = smtpFromName || process.env.SMTP_FROM_NAME || "Fatiha.ru";

  return {
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    from: {
      email: from,
      name: fromName,
    },
  };
}

/**
 * Create nodemailer transporter
 */
export async function createTransporter() {
  const config = await getEmailConfig();

  // If no SMTP credentials, create Ethereal test account
  if (!config.auth.user || !config.auth.pass) {
    logger.warn("No SMTP credentials found, creating Ethereal test account");

    try {
      const testAccount = await nodemailer.createTestAccount();

      logger.info({
        user: testAccount.user,
        previewUrl: "https://ethereal.email/messages",
      }, "Ethereal test account created");

      return nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (error) {
      logger.error({ error }, "Failed to create Ethereal test account");
      throw error;
    }
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });
}
