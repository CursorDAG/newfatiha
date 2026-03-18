import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from '@/lib/api-handler';
import { AuthError, ValidationError } from '@/lib/errors';

// GET: fetch teacher's courses
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
    throw new AuthError('Unauthorized');
  }

  const courses = await prisma.course.findMany({
    where: { teacherId: session.user.id },
    include: {
      streams: {
        include: { _count: { select: { enrollments: true } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ courses });
});

// POST: create a new course
export const POST = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
    throw new AuthError('Unauthorized');
  }

  const { title, description, capacity, published } = await req.json();
  if (!title?.trim()) {
    throw new ValidationError('Title is required', { title: 'Title is required' });
  }

  const course = await prisma.course.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      capacity: Number(capacity) || 30,
      published: Boolean(published),
      teacherId: session.user.id,
    }
  });

  return NextResponse.json({ success: true, course });
});
