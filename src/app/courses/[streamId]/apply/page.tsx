import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getStreamGenderTypeLabel, getStreamGenderTypeIcon, canStudentJoinStream } from "@/lib/gender-rules";
import ApplyForm from "./apply-form";

export const dynamic = "force-dynamic";

async function getStreamDetails(streamId: string) {
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
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
  });

  return stream;
}

export default async function ApplyPage({ params }: { params: Promise<{ streamId: string }> }) {
  const { streamId } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(`/auth/signin?callbackUrl=/courses/${streamId}/apply`);
  }

  if (session.user.role !== "STUDENT") {
    redirect("/courses");
  }

  const stream = await getStreamDetails(streamId);

  if (!stream || !stream.isOpenForEnrollment) {
    redirect("/courses");
  }

  // Check if deadline passed
  if (stream.enrollmentDeadline && new Date() > stream.enrollmentDeadline) {
    redirect("/courses");
  }

  // Check capacity
  const availableSpots = stream.course.capacity - stream._count.enrollments;
  if (availableSpots <= 0) {
    redirect("/courses");
  }

  // Get student info
  const student = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { gender: true },
  });

  if (!student) {
    redirect("/courses");
  }

  // Check gender compatibility
  const genderCheck = canStudentJoinStream(student.gender, stream.genderType);

  // Check if already enrolled or has pending request
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      userId_streamId: {
        userId: session.user.id,
        streamId,
      },
    },
  });

  const existingRequest = await prisma.enrollmentRequest.findUnique({
    where: {
      studentId_streamId: {
        studentId: session.user.id,
        streamId,
      },
    },
  });

  const formatSchedule = (slots: Array<{ dayOfWeek: number; startMinutes: number; durationMinutes: number }>) => {
    if (slots.length === 0) return "Расписание не указано";

    const days = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
    const grouped = slots.reduce((acc, slot) => {
      if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
      const hours = Math.floor(slot.startMinutes / 60);
      const minutes = slot.startMinutes % 60;
      const endMinutes = slot.startMinutes + slot.durationMinutes;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      acc[slot.dayOfWeek].push(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} - ${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`
      );
      return acc;
    }, {} as Record<number, string[]>);

    return Object.entries(grouped).map(([day, times]) => (
      <div key={day} className="flex gap-2">
        <span className="font-semibold min-w-[120px]">{days[Number(day)]}:</span>
        <span>{times.join(", ")}</span>
      </div>
    ));
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/courses" className="text-emerald-600 hover:text-emerald-500 font-semibold text-sm flex items-center gap-2">
            ← Назад к каталогу
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">{stream.course.title}</h1>
            <div className="flex items-center gap-3 text-emerald-100">
              <span className="px-3 py-1 bg-white/20 rounded-lg font-semibold">{stream.name}</span>
              <span className="px-3 py-1 bg-white/20 rounded-lg font-semibold">{stream.level}</span>
            </div>
          </div>

          <div className="p-8">
            {/* Existing enrollment/request warning */}
            {existingEnrollment && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">ℹ️</span>
                  <div>
                    <div className="font-bold text-blue-900">Вы уже записаны на этот курс</div>
                    <div className="text-sm text-blue-700">Перейдите в личный кабинет для доступа к материалам</div>
                  </div>
                </div>
              </div>
            )}

            {existingRequest && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⏳</span>
                  <div>
                    <div className="font-bold text-yellow-900">Ваша заявка на рассмотрении</div>
                    <div className="text-sm text-yellow-700">
                      Статус: {existingRequest.status === "PENDING_REVIEW" && "Ожидает проверки"}
                      {existingRequest.status === "APPROVED_PENDING_PAYMENT" && "Одобрена, ожидает оплаты"}
                      {existingRequest.status === "PAYMENT_CONFIRMED" && "Оплата подтверждена"}
                      {existingRequest.status === "REJECTED" && "Отклонена"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Gender compatibility warning */}
            {!genderCheck.allowed && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <div className="font-bold text-red-900">Невозможно подать заявку</div>
                    <div className="text-sm text-red-700">{genderCheck.reason}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Course details */}
            <div className="space-y-6 mb-8">
              {stream.course.description && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Описание курса</h3>
                  <p className="text-slate-600">{stream.course.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-3">Информация</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">👨‍🏫 Учитель:</span>
                      <span className="font-semibold">{stream.course.teacher.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{getStreamGenderTypeIcon(stream.genderType)} Тип группы:</span>
                      <span className="font-semibold">{getStreamGenderTypeLabel(stream.genderType)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">👥 Свободных мест:</span>
                      <span className="font-semibold text-emerald-600">{availableSpots} из {stream.course.capacity}</span>
                    </div>
                    {stream.price && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">💰 Стоимость:</span>
                        <span className="font-bold text-emerald-600 text-lg">{stream.price.toString()} {stream.currency}</span>
                      </div>
                    )}
                    {stream.enrollmentDeadline && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">📅 Запись до:</span>
                        <span className="font-semibold">{new Date(stream.enrollmentDeadline).toLocaleDateString("ru-RU")}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-3">Расписание</h3>
                  <div className="space-y-1 text-sm text-slate-700">
                    {formatSchedule(stream.scheduleSlots)}
                  </div>
                </div>
              </div>
            </div>

            {/* Application form */}
            {!existingEnrollment && !existingRequest && genderCheck.allowed && (
              <ApplyForm streamId={streamId} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
