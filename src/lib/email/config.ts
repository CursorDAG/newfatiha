import * as nodemailer from "nodemailer";
import { logger } from "@/lib/logger";

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
 * Get email configuration from environment variables
 */
export function getEmailConfig(): EmailConfig {
  const host = process.env.SMTP_HOST || "smtp.ethereal.email";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.SMTP_FROM || "noreply@fatiha.ru";
  const fromName = process.env.SMTP_FROM_NAME || "Fatiha.ru";

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
  const config = getEmailConfig();

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
