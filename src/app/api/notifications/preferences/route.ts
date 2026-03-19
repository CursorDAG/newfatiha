import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ValidationError } from "@/lib/errors";

/**
 * GET /api/notifications/preferences
 * Получить настройки уведомлений пользователя
 */
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Unauthorized");
  }

  // Get or create preferences
  let preferences = await prisma.notificationPreference.findUnique({
    where: { userId: session.user.id },
  });

  if (!preferences) {
    // Create default preferences
    preferences = await prisma.notificationPreference.create({
      data: {
        userId: session.user.id,
      },
    });
  }

  return NextResponse.json(preferences);
});

/**
 * PUT /api/notifications/preferences
 * Обновить настройки уведомлений пользователя
 */
export const PUT = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Unauthorized");
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    throw new ValidationError("Invalid request body");
  }

  // Validate emailDigestTime (should be 0-1439 minutes)
  if (body.emailDigestTime !== undefined) {
    const time = parseInt(body.emailDigestTime, 10);
    if (isNaN(time) || time < 0 || time >= 1440) {
      throw new ValidationError("emailDigestTime must be between 0 and 1439", {
        emailDigestTime: "Время должно быть от 00:00 до 23:59",
      });
    }
  }

  // Update or create preferences
  const preferences = await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    update: {
      emailNewLesson: body.emailNewLesson,
      emailHomeworkAssigned: body.emailHomeworkAssigned,
      emailHomeworkChecked: body.emailHomeworkChecked,
      emailQuizChecked: body.emailQuizChecked,
      emailAnnouncement: body.emailAnnouncement,
      emailHomeworkSubmitted: body.emailHomeworkSubmitted,
      emailQuizSubmitted: body.emailQuizSubmitted,
      emailStudentJoined: body.emailStudentJoined,
      emailDigestEnabled: body.emailDigestEnabled,
      emailDigestTime: body.emailDigestTime,
      soundEnabled: body.soundEnabled,
    },
    create: {
      userId: session.user.id,
      emailNewLesson: body.emailNewLesson ?? true,
      emailHomeworkAssigned: body.emailHomeworkAssigned ?? true,
      emailHomeworkChecked: body.emailHomeworkChecked ?? true,
      emailQuizChecked: body.emailQuizChecked ?? true,
      emailAnnouncement: body.emailAnnouncement ?? true,
      emailHomeworkSubmitted: body.emailHomeworkSubmitted ?? true,
      emailQuizSubmitted: body.emailQuizSubmitted ?? true,
      emailStudentJoined: body.emailStudentJoined ?? true,
      emailDigestEnabled: body.emailDigestEnabled ?? false,
      emailDigestTime: body.emailDigestTime ?? 540,
      soundEnabled: body.soundEnabled ?? true,
    },
  });

  return NextResponse.json(preferences);
});
