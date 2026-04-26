import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get('q') || '';

  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    // Поиск пользователей
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // Поиск курсов
    const courses = await prisma.course.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 5,
      select: {
        id: true,
        title: true,
        teacher: {
          select: {
            name: true,
          },
        },
      },
    });

    // Поиск заявок учителей
    const applications = await prisma.user.findMany({
      where: {
        role: 'TEACHER',
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        teacherProfile: {
          select: {
            subjects: true,
          },
        },
      },
    });

    // Форматировать результаты
    const results = [
      ...users.map((user) => ({
        id: user.id,
        type: 'user' as const,
        title: user.name,
        subtitle: `${user.email} • ${user.role}`,
        url: `/admin/users`,
      })),
      ...courses.map((course) => ({
        id: course.id,
        type: 'course' as const,
        title: course.title,
        subtitle: `Учитель: ${course.teacher.name}`,
        url: `/admin/courses`,
      })),
      ...applications.map((app) => ({
        id: app.id,
        type: 'application' as const,
        title: app.name,
        subtitle: `${app.email} • ${app.teacherProfile?.subjects.join(', ') || 'Учитель'}`,
        url: `/admin/teacher-applications`,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
