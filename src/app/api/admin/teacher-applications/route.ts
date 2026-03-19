import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError } from "@/lib/errors";

/**
 * GET /api/admin/teacher-applications
 * Get list of teacher applications with optional status filter
 */
export const GET = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new AuthError("Доступ запрещен");
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  // Build where clause
  const where = {
    role: "TEACHER" as const,
    emailVerified: true,
    ...(status === "pending" && { status: "PENDING_APPROVAL" as const }),
    ...(status === "approved" && { status: "ACTIVE" as const }),
    ...(status === "rejected" && { status: "REJECTED" as const }),
  };

  const applications = await prisma.user.findMany({
    where,
    include: {
      teacherProfile: {
        include: {
          reviewedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({
    success: true,
    applications: applications.map((app) => ({
      id: app.id,
      name: app.name,
      email: app.email,
      status: app.status,
      createdAt: app.createdAt,
      emailVerifiedAt: app.emailVerifiedAt,
      profile: app.teacherProfile ? {
        bio: app.teacherProfile.bio,
        subjects: app.teacherProfile.subjects,
        experience: app.teacherProfile.experience,
        qualifications: app.teacherProfile.qualifications,
        whatsappPhone: app.teacherProfile.whatsappPhone,
        documentsUrls: app.teacherProfile.documentsUrls,
        videoIntroUrl: app.teacherProfile.videoIntroUrl,
        adminNotes: app.teacherProfile.adminNotes,
        reviewedBy: app.teacherProfile.reviewedBy,
        reviewedAt: app.teacherProfile.reviewedAt,
        rejectionReason: app.teacherProfile.rejectionReason,
      } : null,
    })),
  });
});
