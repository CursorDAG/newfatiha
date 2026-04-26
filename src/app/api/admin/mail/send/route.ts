import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ValidationError } from "@/lib/errors";
import { createTransporter, getEmailConfig } from "@/lib/email/config";
import { logger } from "@/lib/logger";
import { z } from "zod";

const sendMailSchema = z.object({
  to: z.enum(["all", "students", "teachers", "admins", "custom"]),
  customEmails: z.array(z.string().email()).optional(),
  subject: z.string().min(1, "Тема обязательна").max(200, "Тема слишком длинная"),
  message: z.string().min(1, "Сообщение обязательно").max(50000, "Сообщение слишком длинное"),
  isHtml: z.boolean().default(false),
});

/**
 * POST /api/admin/mail/send
 * Отправка писем от admin@fatiha.ru
 */
export const POST = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    throw new AuthError("Unauthorized");
  }

  const body = await req.json();
  const { to, customEmails, subject, message, isHtml } = sendMailSchema.parse(body);

  // Получить список получателей
  let recipients: string[] = [];

  if (to === "custom") {
    if (!customEmails || customEmails.length === 0) {
      throw new ValidationError("Укажите email получателей");
    }
    recipients = customEmails;
  } else {
    // Получить пользователей по роли
    type WhereClause = { deletedAt: null; role?: "STUDENT" | "TEACHER" | "ADMIN" };
    const where: WhereClause = { deletedAt: null };

    if (to === "students") {
      where.role = "STUDENT";
    } else if (to === "teachers") {
      where.role = "TEACHER";
    } else if (to === "admins") {
      where.role = "ADMIN";
    }
    // Для "all" — без фильтра по роли

    const users = await prisma.user.findMany({
      where,
      select: { email: true },
    });

    recipients = users.map((u) => u.email);
  }

  if (recipients.length === 0) {
    throw new ValidationError("Нет получателей для отправки");
  }

  // Отправить письма
  const transporter = await createTransporter();
  const config = await getEmailConfig();

  const results = {
    total: recipients.length,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const email of recipients) {
    try {
      await transporter.sendMail({
        from: `"Администрация Fatiha.ru" <admin@fatiha.ru>`,
        to: email,
        subject,
        html: isHtml ? message : undefined,
        text: isHtml ? undefined : message,
      });

      results.sent++;
      logger.info({ to: email, subject }, "Admin email sent");
    } catch (error) {
      results.failed++;
      results.errors.push(`${email}: ${error instanceof Error ? error.message : "Unknown error"}`);
      logger.error({ error, to: email }, "Failed to send admin email");
    }
  }

  return NextResponse.json({
    success: true,
    results,
  });
});
