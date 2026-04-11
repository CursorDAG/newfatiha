import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; success?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;
  const success = params.success;

  if (success === "true") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-8 sm:p-10 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg">
              ✓
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800 mb-4">Email подтвержден!</h1>
            <p className="text-slate-600 mb-6">
              Ваш email успешно подтвержден. Теперь вы можете войти в систему.
            </p>
            <Link
              href="/auth/signin"
              className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
            >
              Войти в систему
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!token) {
    redirect("/");
  }

  try {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/verify-email?token=${token}`,
      { cache: "no-store" }
    );

    const data = await res.json();

    if (data.success) {
      redirect("/auth/verify-email?success=true");
    } else {
      throw new Error(data.error || "Verification failed");
    }
  } catch {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-8 sm:p-10 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
              ✗
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800 mb-4">Ошибка подтверждения</h1>
            <p className="text-slate-600 mb-6">
              Не удалось подтвердить email. Возможно, ссылка устарела или уже была использована.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              На главную
            </Link>
          </div>
        </div>
      </main>
    );
  }
}
