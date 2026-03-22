"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Clock, Info } from "lucide-react";
import Link from "next/link";

export default function PendingApprovalPage() {
  const { status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<{
    status: string;
    teacherProfile?: {
      whatsappPhone?: string;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/user/me");
      const data = await res.json();

      if (data.user) {
        setUser(data.user);

        // Redirect if already approved
        if (data.user.status === "ACTIVE") {
          router.push("/teacher");
        }
      }
    } catch (error) {
      console.error("Failed to fetch user status:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    } else if (status === "authenticated") {
      checkStatus();
    }
  }, [status, router, checkStatus]);

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Заявка на рассмотрении</h1>
          <p className="text-slate-600">
            Ваша анкета отправлена администрации. Мы свяжемся с вами в ближайшее время.
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Что дальше?</h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-emerald-600 text-sm font-bold">1</span>
              </div>
              <div>
                <p className="font-medium text-slate-900">Проверка документов</p>
                <p className="text-sm text-slate-600">Администрация проверит ваши документы и квалификацию</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-emerald-600 text-sm font-bold">2</span>
              </div>
              <div>
                <p className="font-medium text-slate-900">Собеседование</p>
                <p className="text-sm text-slate-600">Возможно, мы свяжемся с вами для короткого собеседования</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-emerald-600 text-sm font-bold">3</span>
              </div>
              <div>
                <p className="font-medium text-slate-900">Решение</p>
                <p className="text-sm text-slate-600">Вы получите уведомление о решении на email и в личном кабинете</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 mb-1">Среднее время рассмотрения</p>
              <p className="text-sm text-blue-800">Обычно заявки рассматриваются в течение 2-3 рабочих дней</p>
            </div>
          </div>
        </div>

        {user?.teacherProfile?.whatsappPhone && (
          <div className="text-center">
            <p className="text-sm text-slate-600 mb-3">
              Если у вас есть вопросы, администрация может связаться с вами по WhatsApp:
            </p>
            <p className="font-mono text-slate-900 font-medium">{user.teacherProfile.whatsappPhone}</p>
          </div>
        )}

        <div className="mt-8 flex gap-3 justify-center">
          <button
            onClick={() => router.refresh()}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
          >
            Обновить статус
          </button>
          <Link
            href="/api/auth/signout"
            className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-medium"
          >
            Выйти
          </Link>
        </div>
      </div>
    </div>
  );
}
