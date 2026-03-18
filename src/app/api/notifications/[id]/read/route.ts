import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, NotFoundError, ForbiddenError } from "@/lib/errors";

/**
 * POST /api/notifications/[id]/read
 * Пометить уведомление как прочитанное
 */
export const POST = withErrorHandling(
  async (req: Request, context?: { params: Promise<Record<string, string>> }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AuthError("Unauthorized");
    }

    const params = await context!.params;
    const id = params.id;

    // Проверить, что уведомление принадлежит пользователю
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundError("Notification not found");
    }

    if (notification.userId !== session.user.id) {
      throw new ForbiddenError("You can only mark your own notifications as read");
    }

    // Пометить как прочитанное
    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return NextResponse.json(updated);
  }
);
