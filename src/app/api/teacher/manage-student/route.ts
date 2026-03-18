import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";


export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, payload } = body;

    switch (action) {
      case 'generateInvite': {
        const { streamId } = payload;

        const stream = await prisma.stream.findUnique({ where: { id: streamId } });
        if (!stream || stream.teacherId !== session.user.id) {
          return NextResponse.json({ success: false, error: 'Stream not found or unauthorized' }, { status: 403 });
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
          return NextResponse.json({ success: false, error: 'Enrollment not found' }, { status: 404 });
        }
        // Verify teacher owns both streams
        const targetStream = await prisma.stream.findUnique({ where: { id: targetStreamId } });
        if (!targetStream || targetStream.teacherId !== session.user.id) {
          return NextResponse.json({ success: false, error: 'Unauthorized target stream' }, { status: 403 });
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
          return NextResponse.json({ success: false, error: 'Enrollment not found or unauthorized' }, { status: 403 });
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
          return NextResponse.json({ success: false, error: 'Enrollment not found or unauthorized' }, { status: 403 });
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
          return NextResponse.json({ success: false, error: 'Stream not found or unauthorized' }, { status: 403 });
        }

        await prisma.inviteToken.deleteMany({ where: { streamId } });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[manage-student]', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
