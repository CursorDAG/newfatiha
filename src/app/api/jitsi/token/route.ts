import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ValidationError } from "@/lib/errors";
import { generateJitsiToken, getJitsiConfig } from "@/lib/jitsi-jwt";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitConfigs } from "@/lib/rate-limit";

/**
 * POST /api/jitsi/token
 * Generate a JWT token for Jitsi Meet authentication
 *
 * Request body:
 * - streamId: string - The stream ID (used as room name)
 *
 * Returns:
 * - token: string - JWT token for Jitsi
 * - domain: string - Jitsi domain to use
 * - enabled: boolean - Whether JWT authentication is enabled
 */
export const POST = withErrorHandling(async (req: Request) => {
  // Apply rate limiting
  const rateLimitResponse = await rateLimit(req, rateLimitConfigs.token);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const session = await getServerSession(authOptions);
  if (!session) {
    throw new AuthError("Необходима авторизация");
  }

  const body = await req.json().catch(() => null);
  if (!body?.streamId) {
    throw new ValidationError("Отсутствует streamId", {
      streamId: "Это поле обязательно",
    });
  }

  const { streamId } = body;

  // Verify user has access to this stream
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: {
      id: true,
      teacherId: true,
      enrollments: {
        where: {
          userId: session.user.id,
          status: "ACTIVE",
        },
        select: { id: true },
      },
    },
  });

  if (!stream) {
    throw new ValidationError("Поток не найден");
  }

  const isTeacher =
    session.user.role === "TEACHER" || session.user.role === "ADMIN";
  const isEnrolled = stream.enrollments.length > 0;

  // Check if user is either the teacher or an enrolled student
  if (!isTeacher && !isEnrolled) {
    throw new AuthError("Нет доступа к этому потоку");
  }

  // If teacher, verify ownership
  if (isTeacher && stream.teacherId !== session.user.id) {
    throw new AuthError("Вы не являетесь преподавателем этого потока");
  }

  // Get Jitsi configuration
  const jitsiConfig = getJitsiConfig();

  // If JWT is not configured, return disabled status
  if (!jitsiConfig) {
    return NextResponse.json({
      enabled: false,
      domain: "meet.jit.si",
      token: null,
    });
  }

  // Generate JWT token
  const token = generateJitsiToken(
    streamId,
    {
      id: session.user.id,
      name: session.user.name || "Unknown",
      email: session.user.email || "",
      role: isTeacher ? "moderator" : "participant",
    },
    jitsiConfig
  );

  return NextResponse.json({
    enabled: true,
    domain: jitsiConfig.domain,
    token,
  });
});
