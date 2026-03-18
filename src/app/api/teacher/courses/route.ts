import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from "@/lib/prisma";

// GET: fetch teacher's courses
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
}

// POST: create a new course
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, description, capacity, published } = await req.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
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
}
