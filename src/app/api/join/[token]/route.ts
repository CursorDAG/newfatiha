import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/join/[token] — validate invite token before student joins
export async function GET(
  _req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    include: {
      stream: {
        include: {
          course: true,
          _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } }
        }
      }
    }
  });

  if (!invite) {
    return NextResponse.json({ error: 'Invite link is invalid or expired.' }, { status: 404 });
  }

  const { stream } = invite;
  const activeCount = stream._count.enrollments;
  const capacity = stream.course.capacity;

  if (activeCount >= capacity) {
    return NextResponse.json({ error: 'Group is full. Contact your teacher.' }, { status: 409 });
  }

  return NextResponse.json({
    streamId: stream.id,
    streamName: stream.name,
    courseName: stream.course.title,
    level: stream.level,
    schedule: stream.schedule,
    remaining: capacity - activeCount,
  });
}

// POST /api/join/[token] — enroll authenticated student
export async function POST(
  req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    include: {
      stream: {
        include: {
          course: true,
          _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } }
        }
      }
    }
  });

  if (!invite) return NextResponse.json({ error: 'Invalid invite.' }, { status: 404 });

  const { stream } = invite;
  const activeCount = stream._count.enrollments;

  if (activeCount >= stream.course.capacity) {
    return NextResponse.json({ error: 'Group is full.' }, { status: 409 });
  }

  const enrollment = await prisma.enrollment.upsert({
    where: { userId_streamId: { userId, streamId: stream.id } },
    update: { status: 'ACTIVE' },
    create: { userId, streamId: stream.id, status: 'ACTIVE' }
  });

  return NextResponse.json({ success: true, enrollment });
}
