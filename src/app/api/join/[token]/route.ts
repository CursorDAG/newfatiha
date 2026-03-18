import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandling } from '@/lib/api-handler';
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '@/lib/errors';
import { rateLimit, rateLimitConfigs } from '@/lib/rate-limit';
import { canStudentJoinStream } from '@/lib/gender-rules';

// GET /api/join/[token] — validate invite token before student joins
export const GET = withErrorHandling(async (
  _req: Request,
  context?: { params: Promise<Record<string, string>> },
) => {
  const params = await context!.params;
  const token = params.token;

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
    throw new NotFoundError('Invite link is invalid or expired');
  }

  const { stream } = invite;
  const activeCount = stream._count.enrollments;
  const capacity = stream.course.capacity;

  if (activeCount >= capacity) {
    throw new ConflictError('Group is full. Contact your teacher.');
  }

  return NextResponse.json({
    streamId: stream.id,
    streamName: stream.name,
    courseName: stream.course.title,
    level: stream.level,
    schedule: stream.schedule,
    remaining: capacity - activeCount,
    genderType: stream.genderType,
  });
});

// POST /api/join/[token] — enroll authenticated student
export const POST = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<Record<string, string>> },
) => {
  // Apply rate limiting
  const rateLimitResponse = await rateLimit(req, rateLimitConfigs.general);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const params = await context!.params;
  const token = params.token;
  const { userId } = await req.json();
  if (!userId) {
    throw new ValidationError('Missing userId', { userId: 'User ID is required' });
  }

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
    throw new NotFoundError('Invalid invite');
  }

  const { stream } = invite;
  const activeCount = stream._count.enrollments;

  if (activeCount >= stream.course.capacity) {
    throw new ConflictError('Group is full');
  }

  // Get student's gender for validation
  const student = await prisma.user.findUnique({
    where: { id: userId },
    select: { gender: true },
  });

  if (!student) {
    throw new NotFoundError('Студент не найден');
  }

  // Check gender compatibility
  const genderCheck = canStudentJoinStream(student.gender, stream.genderType);

  if (!genderCheck.allowed) {
    throw new ForbiddenError(genderCheck.reason || 'Невозможно записаться в эту группу');
  }

  const enrollment = await prisma.enrollment.upsert({
    where: { userId_streamId: { userId, streamId: stream.id } },
    update: { status: 'ACTIVE' },
    create: { userId, streamId: stream.id, status: 'ACTIVE' }
  });

  return NextResponse.json({ success: true, enrollment });
});
