import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function JoinPage({ params }: { params: { token: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/join/${params.token}`);
  }

  const invite = await prisma.inviteToken.findUnique({
    where: { token: params.token },
    include: {
      stream: {
        include: {
          course: true,
          _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } },
        },
      },
    },
  });

  if (!invite) {
    return (
      <ErrorLayout title="Ссылка недействительна" message="Эта пригласительная ссылка не найдена или уже истекла." />
    );
  }

  const { stream } = invite;
  const activeCount = stream._count.enrollments;
  const capacity = stream.course.capacity;

  if (activeCount >= capacity) {
    return (
      <ErrorLayout
        title="Группа заполнена"
        message={`В потоке «${stream.name}» нет свободных мест (лимит: ${capacity} студентов). Обратитесь к преподавателю.`}
      />
    );
  }

  // Auto-enroll
  await prisma.enrollment.upsert({
    where: { userId_streamId: { userId: session.user.id, streamId: stream.id } },
    update: { status: 'ACTIVE' },
    create: { userId: session.user.id, streamId: stream.id, status: 'ACTIVE' },
  });

  redirect('/student');
}

function ErrorLayout({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⚠️</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">{title}</h1>
        <p className="text-slate-500">{message}</p>
        <Link href="/" className="inline-block mt-6 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors">
          На главную
        </Link>
      </div>
    </div>
  );
}
