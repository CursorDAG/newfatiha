import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getStreamGenderTypeLabel, getStreamGenderTypeIcon } from "@/lib/gender-rules";

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

  const formatSchedule = (slots: Array<{ dayOfWeek: number; startMinutes: number; durationMinutes: number }>) => {
    if (slots.length === 0) return "Расписание не указано";

    const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    const grouped = slots.reduce((acc, slot) => {
      if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
      const hours = Math.floor(slot.startMinutes / 60);
      const minutes = slot.startMinutes % 60;
      acc[slot.dayOfWeek].push(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`);
      return acc;
    }, {} as Record<number, string[]>);

    return Object.entries(grouped)
      .map(([day, times]) => `${days[Number(day)]}: ${times.join(", ")}`)
      .join(" • ");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center text-xl shadow-lg">
                📚
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Каталог курсов</h1>
                <p className="text-sm text-slate-600">Выберите курс для обучения</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {session ? (
                <Link
                  href={session.user.role === "STUDENT" ? "/student" : "/teacher"}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                >
                  Мой кабинет
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                  >
                    Войти
                  </Link>
                  <Link
                    href="/auth/register/student"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
                  >
                    Регистрация
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {streams.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
              📭
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Нет доступных курсов</h2>
            <p className="text-slate-600">В данный момент нет открытых курсов для записи</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {streams.map((stream) => {
              const availableSpots = stream.course.capacity - stream._count.enrollments;
              const isFull = availableSpots <= 0;

              return (
                <div
                  key={stream.id}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow"
                >
                  {/* Header with color */}
                  <div
                    className="h-2"
                    style={{ backgroundColor: stream.color }}
                  />

                  <div className="p-6">
                    {/* Course title */}
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                      {stream.course.title}
                    </h3>

                    {/* Stream info */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg">
                        {stream.name}
                      </span>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-lg">
                        {stream.level}
                      </span>
                    </div>

                    {/* Description */}
                    {stream.course.description && (
                      <p className="text-slate-600 text-sm mb-4 line-clamp-3">
                        {stream.course.description}
                      </p>
                    )}

                    {/* Teacher */}
                    <div className="flex items-center gap-2 mb-3 text-sm text-slate-600">
                      <span>👨‍🏫</span>
                      <span>Учитель: {stream.course.teacher.name}</span>
                    </div>

                    {/* Gender type */}
                    <div className="flex items-center gap-2 mb-3 text-sm text-slate-600">
                      <span>{getStreamGenderTypeIcon(stream.genderType)}</span>
                      <span>{getStreamGenderTypeLabel(stream.genderType)}</span>
                    </div>

                    {/* Schedule */}
                    <div className="mb-3 text-sm text-slate-600">
                      <div className="font-semibold mb-1">📅 Расписание:</div>
                      <div className="text-xs">{formatSchedule(stream.scheduleSlots)}</div>
                    </div>

                    {/* Price */}
                    {stream.price && (
                      <div className="mb-4 text-lg font-bold text-emerald-600">
                        {stream.price.toString()} {stream.currency}
                      </div>
                    )}

                    {/* Available spots */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-600">Свободных мест:</span>
                        <span className={`font-bold ${isFull ? "text-red-600" : "text-emerald-600"}`}>
                          {availableSpots} из {stream.course.capacity}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${isFull ? "bg-red-500" : "bg-emerald-500"}`}
                          style={{ width: `${((stream.course.capacity - availableSpots) / stream.course.capacity) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Deadline */}
                    {stream.enrollmentDeadline && (
                      <div className="mb-4 text-xs text-slate-500">
                        Запись до: {new Date(stream.enrollmentDeadline).toLocaleDateString("ru-RU")}
                      </div>
                    )}

                    {/* Action button */}
                    {session ? (
                      session.user.role === "STUDENT" ? (
                        <Link
                          href={`/courses/${stream.id}/apply`}
                          className={`block w-full text-center py-3 rounded-xl font-bold transition-all ${
                            isFull
                              ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                          }`}
                        >
                          {isFull ? "Мест нет" : "Подать заявку"}
                        </Link>
                      ) : (
                        <div className="text-center text-sm text-slate-500 py-3">
                          Доступно только для студентов
                        </div>
                      )
                    ) : (
                      <Link
                        href="/auth/register/student"
                        className="block w-full text-center py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
                      >
                        Зарегистрироваться
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
