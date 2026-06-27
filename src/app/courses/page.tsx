import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCourseRating } from "@/lib/reviews";
import CoursesBrowser, { type CourseCardData } from "./CoursesBrowser";

export const dynamic = "force-dynamic";

async function getOpenCourses() {
  const streams = await prisma.stream.findMany({
    where: {
      isOpenForEnrollment: true,
      OR: [
        { enrollmentDeadline: null },
        { enrollmentDeadline: { gte: new Date() } },
      ],
    },
    include: {
      course: {
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              gender: true,
            },
          },
        },
      },
      scheduleSlots: {
        orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
      },
      _count: {
        select: {
          enrollments: {
            where: { status: "ACTIVE" },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return streams;
}

export default async function CoursesPage() {
  const session = await getServerSession(authOptions);
  const streams = await getOpenCourses();

  // Эффективная выборка рейтингов: одна агрегация на уникальный курс (без N+1 в рендере).
  const uniqueCourseIds = Array.from(new Set(streams.map((s) => s.courseId)));
  const ratingEntries = await Promise.all(
    uniqueCourseIds.map(async (courseId) => {
      const rating = await getCourseRating(courseId);
      return [courseId, rating] as const;
    })
  );
  const ratingByCourse = new Map(ratingEntries);

  // Сериализация для client-компонента (Decimal price → number, Date → ISO string).
  const courses: CourseCardData[] = streams.map((stream) => {
    const rating = ratingByCourse.get(stream.courseId) ?? { average: 0, count: 0 };
    return {
      id: stream.id,
      courseId: stream.courseId,
      courseTitle: stream.course.title,
      courseDescription: stream.course.description,
      streamName: stream.name,
      level: stream.level,
      color: stream.color,
      genderType: stream.genderType,
      capacity: stream.course.capacity,
      activeEnrollments: stream._count.enrollments,
      price: stream.price != null ? Number(stream.price) : null,
      currency: stream.currency,
      enrollmentDeadline: stream.enrollmentDeadline
        ? stream.enrollmentDeadline.toISOString()
        : null,
      createdAt: stream.createdAt.toISOString(),
      teacherId: stream.course.teacher.id,
      teacherName: stream.course.teacher.name,
      scheduleSlots: stream.scheduleSlots.map((slot) => ({
        dayOfWeek: slot.dayOfWeek,
        startMinutes: slot.startMinutes,
        durationMinutes: slot.durationMinutes,
      })),
      ratingAverage: rating.average,
      ratingCount: rating.count,
    };
  });

  const sessionInfo = session
    ? { role: session.user.role as string }
    : null;

  return (
    <div
      className="min-h-screen font-sans text-cream relative overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 50% 0%, #0B1F19 0%, #031410 65%, #010806 100%)",
      }}
    >
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 pattern-islamic opacity-60" />
        <div className="absolute -top-[10%] -right-[10%] h-[600px] w-[600px] rounded-full bg-[#D4AF37]/[0.05] blur-[130px]" />
        <div className="absolute top-[30%] -left-[15%] h-[700px] w-[700px] rounded-full bg-[#06201A]/60 blur-[150px]" />
      </div>

      <div className="relative z-10">
        {/* Navbar */}
        <header className="sticky top-0 z-50 bg-[#031410]/80 backdrop-blur-xl border-b border-gold/15">
          <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <span className="w-9 h-9 bg-gradient-to-br from-gold to-[#8C6D1F] rounded-xl flex items-center justify-center text-[#031410] text-lg font-bold shadow-md shadow-gold/20">
                ف
              </span>
              <span className="text-xl font-extrabold text-cream tracking-tight font-serif">
                Fatiha<span className="text-gold">.ru</span>
              </span>
            </Link>

            <div className="flex items-center gap-3">
              {sessionInfo ? (
                <Link
                  href={sessionInfo.role === "STUDENT" ? "/student" : "/teacher"}
                  className="btn-shimmer px-5 py-2 rounded-xl text-sm transition-all hover:-translate-y-px"
                >
                  Мой кабинет →
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="hidden sm:inline-flex border border-gold/40 text-gold hover:bg-gold/10 hover:border-gold font-bold px-5 py-2 rounded-xl text-sm transition-all"
                  >
                    Войти
                  </Link>
                  <Link
                    href="/auth/register/student"
                    className="btn-shimmer px-5 py-2 rounded-xl text-sm transition-all hover:-translate-y-px"
                  >
                    Регистрация
                  </Link>
                </>
              )}
            </div>
          </nav>
        </header>

        {/* Hero header */}
        <section className="max-w-7xl mx-auto px-6 pt-14 pb-8 text-center">
          <span className="eyebrow mb-4 justify-center">Каталог курсов</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-cream mt-3 mb-4 font-serif">
            Найдите свой курс
          </h1>
          <p className="text-cream/60 text-lg max-w-2xl mx-auto">
            Открытые потоки для записи. Используйте поиск, фильтры и сортировку,
            чтобы выбрать подходящую учебную группу.
          </p>
        </section>

        {/* Browser (search / filters / list) */}
        <section className="max-w-7xl mx-auto px-6 pb-20">
          <CoursesBrowser courses={courses} session={sessionInfo} />
        </section>
      </div>
    </div>
  );
}
