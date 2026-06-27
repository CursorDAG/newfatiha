import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import ClaimPaymentButton from "./ClaimPaymentButton";

export const dynamic = "force-dynamic";

async function getMyApplications(userId: string) {
  const requests = await prisma.enrollmentRequest.findMany({
    where: {
      studentId: userId,
    },
    include: {
      stream: {
        include: {
          course: {
            include: {
              teacher: {
                select: {
                  name: true,
                  teacherProfile: {
                    select: {
                      paymentRequisites: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      reviewedBy: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return requests;
}

export default async function MyApplicationsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  if (session.user.role !== "STUDENT") {
    redirect("/");
  }

  const applications = await getMyApplications(session.user.id);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_REVIEW":
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-lg">⏳ На рассмотрении</span>;
      case "APPROVED_PENDING_PAYMENT":
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-lg">💳 Одобрено — ожидает оплаты</span>;
      case "PAYMENT_PENDING_CONFIRMATION":
        return <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-semibold rounded-lg">⌛ Оплата отправлена — ожидает подтверждения</span>;
      case "PAYMENT_CONFIRMED":
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-lg">✓ Оплата получена, доступ открыт</span>;
      case "ACTIVE":
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-lg">✓ Зачислен</span>;
      case "REJECTED":
        return <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-lg">✗ Отклонено</span>;
      case "TRIAL_ATTEMPTED":
        return <span className="px-3 py-1 bg-violet-100 text-violet-700 text-sm font-semibold rounded-lg">🎓 Пробный урок пройден</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg">{status}</span>;
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="w-full px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center text-xl shadow-lg">
                📋
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Мои заявки</h1>
                <p className="text-sm text-slate-600">Статус заявок на курсы</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/courses"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
              >
                Каталог курсов
              </Link>
              <Link
                href="/student"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
              >
                Мой кабинет
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-8 py-8">
        {applications.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
              📭
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Нет заявок</h2>
            <p className="text-slate-600 mb-6">Вы еще не подавали заявки на курсы</p>
            <Link
              href="/courses"
              className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
            >
              Перейти к каталогу
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-800 mb-1">
                        {app.stream.course.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="font-semibold">{app.stream.name}</span>
                        <span>•</span>
                        <span>{app.stream.level}</span>
                        <span>•</span>
                        <span>Учитель: {app.stream.course.teacher.name}</span>
                      </div>
                    </div>
                    <div>{getStatusBadge(app.status)}</div>
                  </div>

                  {/* Message */}
                  {app.message && (
                    <div className="mb-4 p-4 bg-slate-50 rounded-xl">
                      <div className="text-xs font-semibold text-slate-500 mb-1">Ваше сообщение:</div>
                      <div className="text-sm text-slate-700">{app.message}</div>
                    </div>
                  )}

                  {/* Approved — awaiting payment: show requisites, amount and "I paid" */}
                  {app.status === "APPROVED_PENDING_PAYMENT" && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                      <div className="font-bold text-blue-900">💳 Одобрено — ожидает оплаты</div>

                      {app.stream.price && (
                        <div className="text-sm text-blue-900">
                          <span className="font-semibold">Сумма к оплате:</span>{" "}
                          {app.stream.price.toString()} {app.stream.currency}
                        </div>
                      )}

                      {app.stream.course.teacher.teacherProfile?.paymentRequisites ? (
                        <div>
                          <div className="text-xs font-semibold text-blue-700 mb-1">Реквизиты для оплаты:</div>
                          <div className="text-sm text-blue-800 whitespace-pre-wrap bg-white/60 rounded-lg p-3 border border-blue-100">
                            {app.stream.course.teacher.teacherProfile.paymentRequisites}
                          </div>
                        </div>
                      ) : app.stream.paymentInstructions ? (
                        <div>
                          <div className="text-xs font-semibold text-blue-700 mb-1">Инструкции по оплате:</div>
                          <div className="text-sm text-blue-800 whitespace-pre-wrap bg-white/60 rounded-lg p-3 border border-blue-100">
                            {app.stream.paymentInstructions}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-blue-800">
                          Продавец пока не указал реквизиты. Свяжитесь с учителем для уточнения деталей оплаты.
                        </div>
                      )}

                      <div className="pt-1">
                        <ClaimPaymentButton requestId={app.id} />
                      </div>
                    </div>
                  )}

                  {/* Payment claimed — awaiting seller confirmation */}
                  {app.status === "PAYMENT_PENDING_CONFIRMATION" && (
                    <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                      ⌛ Оплата отправлена — ожидает подтверждения продавца. Как только продавец подтвердит получение
                      средств, доступ к курсу откроется автоматически.
                    </div>
                  )}

                  {/* Rejection reason */}
                  {app.status === "REJECTED" && app.rejectionReason && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                      <div className="font-bold text-red-900 mb-2">Причина отклонения:</div>
                      <div className="text-sm text-red-800">{app.rejectionReason}</div>
                    </div>
                  )}

                  {/* Post-trial upsell */}
                  {app.status === "TRIAL_ATTEMPTED" && (
                    <div className="mb-4 p-4 bg-violet-50 border border-violet-200 rounded-xl space-y-3">
                      <div className="font-bold text-violet-900">🎉 Пробный урок пройден!</div>
                      <p className="text-sm text-violet-800">
                        Спасибо за участие в пробном уроке курса «{app.stream.course.title}»!
                        Если вам понравилось, вы можете записаться на полный курс — свяжитесь с учителем
                        для получения реквизитов и записи.
                      </p>
                      <Link
                        href={`/student`}
                        className="inline-block px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-600/20 transition-all text-sm"
                      >
                        Вернуться в личный кабинет
                      </Link>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Подана: {new Date(app.createdAt).toLocaleDateString("ru-RU")}</span>
                    {app.reviewedAt && (
                      <>
                        <span>•</span>
                        <span>Рассмотрена: {new Date(app.reviewedAt).toLocaleDateString("ru-RU")}</span>
                      </>
                    )}
                    {app.reviewedBy && (
                      <>
                        <span>•</span>
                        <span>Проверил: {app.reviewedBy.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
