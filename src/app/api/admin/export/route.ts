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
  const type = searchParams.get('type'); // users, courses, applications

  try {
    let data: unknown[][] = [];
    let filename = 'export.csv';

    if (type === 'users') {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          gender: true,
          isBlocked: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      filename = `users_${new Date().toISOString().split('T')[0]}.csv`;

      // Конвертировать в CSV
      const headers = ['ID', 'Email', 'Имя', 'Роль', 'Пол', 'Заблокирован', 'Email подтверждён', 'Дата регистрации'];
      const rows = users.map(u => [
        u.id,
        u.email,
        u.name,
        u.role,
        u.gender || '',
        u.isBlocked ? 'Да' : 'Нет',
        u.emailVerifiedAt ? 'Да' : 'Нет',
        new Date(u.createdAt).toLocaleDateString('ru-RU'),
      ]);

      data = [headers, ...rows];
    } else if (type === 'courses') {
      const courses = await prisma.course.findMany({
        include: {
          teacher: {
            select: {
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              streams: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      filename = `courses_${new Date().toISOString().split('T')[0]}.csv`;

      const headers = ['ID', 'Название', 'Описание', 'Учитель', 'Email учителя', 'Потоков', 'Опубликован', 'Дата создания'];
      const rows = courses.map(c => [
        c.id,
        c.title,
        c.description || '',
        c.teacher.name,
        c.teacher.email,
        c._count.streams.toString(),
        c.published ? 'Да' : 'Нет',
        new Date(c.createdAt).toLocaleDateString('ru-RU'),
      ]);

      data = [headers, ...rows];
    } else if (type === 'applications') {
      const applications = await prisma.user.findMany({
        where: {
          role: 'TEACHER',
        },
        include: {
          teacherProfile: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      filename = `teacher_applications_${new Date().toISOString().split('T')[0]}.csv`;

      const headers = ['ID', 'Имя', 'Email', 'Предметы', 'WhatsApp', 'Опыт', 'Email подтверждён', 'Дата регистрации'];
      const rows = applications.map(a => [
        a.id,
        a.name,
        a.email,
        a.teacherProfile?.subjects.join(', ') || '',
        a.teacherProfile?.whatsappPhone || '',
        a.teacherProfile?.experience || '',
        a.emailVerifiedAt ? 'Да' : 'Нет',
        new Date(a.createdAt).toLocaleDateString('ru-RU'),
      ]);

      data = [headers, ...rows];
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Создать CSV
    const csv = data.map(row =>
      (row as unknown[]).map((cell: unknown) => {
        // Экранировать кавычки и обернуть в кавычки если есть запятые
        const str = String(cell).replace(/"/g, '""');
        return str.includes(',') || str.includes('\n') ? `"${str}"` : str;
      }).join(',')
    ).join('\n');

    // Добавить BOM для корректного отображения кириллицы в Excel
    const bom = '\uFEFF';
    const csvWithBom = bom + csv;

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
