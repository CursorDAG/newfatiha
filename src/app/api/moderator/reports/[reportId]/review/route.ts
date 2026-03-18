import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, NotFoundError } from "@/lib/errors";
import { validateRequest } from "@/lib/validate-request";
import { reviewReportSchema } from "@/lib/validation";
import { NotificationService } from "@/lib/notification-service";
import { logger } from "@/lib/logger";

// POST: review a content report
export const POST = withErrorHandling(
  async (req: Request, context?: { params: Promise<Record<string, string>> }) => {
    const session = await getServerSession(authOptions);
    if (!session || !["MODERATOR", "ADMIN"].includes(session.user.role)) {
      throw new AuthError("Unauthorized");
    }

    const params = await context?.params;
    const reportId = params?.reportId;

    if (!reportId) {
      throw new NotFoundError("Report");
    }

    const { action, comment } = await validateRequest(req, reviewReportSchema);

    const report = await prisma.contentReport.findUnique({
      where: { id: reportId },
      select: {
        reporterId: true,
        contentType: true,
        contentId: true,
        status: true,
      },
    });

    if (!report) {
      throw new NotFoundError("Report");
    }

    // Update report status
    const updatedReport = await prisma.contentReport.update({
      where: { id: reportId },
      data: {
        status: action === "APPROVE" ? "APPROVED" : "REJECTED",
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    });

    // If approved, mark content as deleted
    if (action === "APPROVE") {
      try {
        switch (report.contentType) {
          case "LESSON":
            await prisma.lesson.update({
              where: { id: report.contentId },
              data: { published: false },
            });
            break;
          case "CHAT_MESSAGE":
            await prisma.chatMessage.update({
              where: { id: report.contentId },
              data: { isDeleted: true, deletedAt: new Date() },
            });
            break;
          // QUIZ and HOMEWORK don't have soft delete fields in schema
          // Could add them or handle differently
          default:
            logger.warn({
              contentType: report.contentType,
              contentId: report.contentId,
            }, "Content type does not support soft delete");
        }
      } catch (error) {
        logger.error({
          error,
          reportId,
          contentType: report.contentType,
          contentId: report.contentId,
        }, "Failed to delete reported content");
      }
    }

    // Notify reporter about the decision
    const statusText = action === "APPROVE" ? "одобрена" : "отклонена";
    await NotificationService.create({
      userId: report.reporterId,
      type: "ANNOUNCEMENT",
      title: "Жалоба рассмотрена",
      message: `Ваша жалоба ${statusText}${comment ? `: ${comment}` : ""}`,
    });

    logger.info({
      reportId,
      moderatorId: session.user.id,
      action,
      contentType: report.contentType,
      contentId: report.contentId,
    }, "Content report reviewed");

    return NextResponse.json({ success: true, report: updatedReport });
  }
);
