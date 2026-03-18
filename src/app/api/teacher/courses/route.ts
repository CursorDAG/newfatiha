import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from '@/lib/api-handler';
import { AuthError } from '@/lib/errors';
import { validateRequest } from '@/lib/validate-request';
import { createCourseSchema } from '@/lib/validation';

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

  // Validate request body with Zod
  const { title, description, capacity, published } = await validateRequest(req, createCourseSchema);

  const course = await prisma.course.create({
    data: {
      title,
      description,
      capacity,
      published,
      teacherId: session.user.id,
    }
  });

  return NextResponse.json({ success: true, course });
});
