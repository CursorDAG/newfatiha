import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { rateLimit, rateLimitConfigs } from "@/lib/rate-limit";

export const POST = withErrorHandling(async (request: Request) => {
  // Apply rate limiting
  const rateLimitResponse = await rateLimit(request, rateLimitConfigs.general);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new AuthError("Unauthorized");
  }

  const body = await request.json();
  const { action, payload } = body;

  switch (action) {
    case 'generateInvite': {
      const { streamId } = payload;

      const stream = await prisma.stream.findUnique({ where: { id: streamId } });
      if (!stream || stream.teacherId !== session.user.id) {
        throw new ForbiddenError('Stream not found or unauthorized');
      }

      const tokenStr = crypto.randomUUID();

      const inviteToken = await prisma.inviteToken.upsert({
        where: { streamId },
        update: { token: tokenStr },
        create: { token: tokenStr, streamId }
      });

      const inviteLink = `https://fatiha.ru/join/${inviteToken.token}`;
      return NextResponse.json({ success: true, inviteLink });
    }

    case 'transferStudent': {
      const { enrollmentId, targetStreamId } = payload;

      const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: { stream: true }
      });
      if (!enrollment) {
        throw new NotFoundError('Enrollment');
      }
      // Verify teacher owns both streams
      const targetStream = await prisma.stream.findUnique({ where: { id: targetStreamId } });
      if (!targetStream || targetStream.teacherId !== session.user.id) {
        throw new ForbiddenError('Unauthorized target stream');
      }

      // Mark old enrollment as TRANSFERRED
      await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { status: 'TRANSFERRED' }
      });

      // Create new active enrollment in target stream
      await prisma.enrollment.upsert({
        where: { userId_streamId: { userId: enrollment.userId, streamId: targetStreamId } },
        update: { status: 'ACTIVE' },
        create: { userId: enrollment.userId, streamId: targetStreamId, status: 'ACTIVE' }
      });

      return NextResponse.json({ success: true, message: 'Student transferred successfully.' });
    }

    case 'kickStudent': {
      const { enrollmentId } = payload;

      const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: { stream: true }
      });
      if (!enrollment || enrollment.stream.teacherId !== session.user.id) {
        throw new ForbiddenError('Enrollment not found or unauthorized');
      }

      await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { status: 'KICKED' }
      });

      return NextResponse.json({ success: true, message: 'Student has been kicked from the stream.' });
    }

    case 'repeatYear': {
      const { enrollmentId } = payload;

      const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: { stream: true }
      });
      if (!enrollment || enrollment.stream.teacherId !== session.user.id) {
        throw new ForbiddenError('Enrollment not found or unauthorized');
      }

      // Mark current enrollment as REPEATING
      await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { status: 'REPEATING' }
      });

      return NextResponse.json({ success: true, message: 'Student marked as repeating.' });
    }

    case 'revokeInvite': {
      const { streamId } = payload;

      const stream = await prisma.stream.findUnique({ where: { id: streamId } });
      if (!stream || stream.teacherId !== session.user.id) {
        throw new ForbiddenError('Stream not found or unauthorized');
      }

      await prisma.inviteToken.deleteMany({ where: { streamId } });
      return NextResponse.json({ success: true });
    }

    default:
      throw new ValidationError('Unknown action', { action: 'Invalid action type' });
  }
});
