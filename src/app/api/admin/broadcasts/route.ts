import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, ValidationError } from "@/lib/errors";
import { NotificationService } from "@/lib/notification-service";
import { NotificationType, NotificationPriority, Role } from "@prisma/client";

// POST /api/admin/broadcasts - создать рассылку
export const POST = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);

  if (!session) {
    throw new AuthError("Необходима авторизация");
  }

  if (session.user.role !== "ADMIN") {
    throw new ForbiddenError("Доступ запрещен");
  }

  const body = await req.json().catch(() => null);

  if (!body || !body.title || !body.message) {
    throw new ValidationError("Отсутствуют обязательные поля: title, message");
  }

  const {
    title,
    message,
    targetAudience,
    priority = "NORMAL",
  } = body;

  // Validate targetAudience
  if (!targetAudience || !targetAudience.type) {
    throw new ValidationError("Отсутствует targetAudience.type");
  }

  // Determine recipients based on targetAudience
  let recipients: string[] = [];
  let recipientRole: Role | undefined;

  if (targetAudience.type === "ALL") {
    recipientRole = undefined; // All users
  } else if (targetAudience.type === "STUDENTS") {
    recipientRole = "STUDENT";
  } else if (targetAudience.type === "TEACHERS") {
    recipientRole = "TEACHER";
  } else if (targetAudience.type === "SPECIFIC" && targetAudience.userIds) {
    recipients = targetAudience.userIds;
  } else {
    throw new ValidationError("Неверный тип targetAudience");
  }

  // Get recipients
  if (targetAudience.type !== "SPECIFIC") {
    const users = await prisma.user.findMany({
      where: {
        ...(recipientRole ? { role: recipientRole } : {}),
        isBlocked: false,
        deletedAt: null,
      },
      select: { id: true },
    });
    recipients = users.map((u) => u.id);
  }

  if (recipients.length === 0) {
    throw new ValidationError("Нет получателей для рассылки");
  }

  // Send notifications via NotificationService
  await NotificationService.createMany(recipients, {
    type: "ANNOUNCEMENT" as NotificationType,
    title,
    message,
    priority: priority as NotificationPriority,
    metadata: {
      sentBy: session.user.id,
      targetAudience: targetAudience.type,
    },
  });

  return NextResponse.json({
    success: true,
    recipientCount: recipients.length,
    sentAt: new Date(),
  });
});

// GET /api/admin/broadcasts - получить историю рассылок
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);

  if (!session) {
    throw new AuthError("Необходима авторизация");
  }

  if (session.user.role !== "ADMIN") {
    throw new ForbiddenError("Доступ запрещен");
  }

  // Get recent announcement notifications
  const broadcasts = await prisma.notification.findMany({
    where: {
      type: "ANNOUNCEMENT",
    },
    select: {
      id: true,
      title: true,
      message: true,
      priority: true,
      createdAt: true,
      metadata: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  // Group by title+message to get unique broadcasts
  const uniqueBroadcasts = broadcasts.reduce((acc, notification) => {
    const key = `${notification.title}:${notification.message}`;
    if (!acc.has(key)) {
      acc.set(key, {
        ...notification,
        recipientCount: 1,
      });
    } else {
      const existing = acc.get(key)!;
      existing.recipientCount++;
    }
    return acc;
  }, new Map());

  return NextResponse.json({
    broadcasts: Array.from(uniqueBroadcasts.values())
  });
});
