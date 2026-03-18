"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/auth/redirect";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });

      if (res?.error) {
        setError("Неверный email или пароль");
      } else if (res?.url) {
        router.push(res.url);
        router.refresh();
      }
    } catch (err) {
      setError("Произошла ошибка при входе");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50/80 border border-red-200 text-red-600 rounded-xl p-3 text-sm font-medium animate-in slide-in-from-top-2">
          {error}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Email</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">📧</span>
          <input
            type="email"
            required
            placeholder="student@fatiha.ru"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Пароль</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔒</span>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all shadow-sm"
          />
        </div>
        <div className="flex justify-end mt-2">
          <Link href="#" className="text-sm font-semibold text-emerald-600 hover:text-emerald-500 transition-colors">
            Забыли пароль?
          </Link>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Вход...</span>
          </>
        ) : (
          "Войти в кабинет"
        )}
      </button>
    </form>
  );
}

export default function SignInPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-6 min-h-[calc(100vh-80px)] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50 relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none data-blobs">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-200/40 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[45%] rounded-full bg-blue-200/30 blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-md relative z-10 w-full">
        {/* Card */}
        <div className="bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-8 sm:p-10 animate-in zoom-in-95 duration-500">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-lg shadow-emerald-600/30 transform rotate-3 hover:rotate-6 transition-transform">
              📖
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">С возвращением!</h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">Войдите в свою учетную запись, чтобы продолжить обучение</p>
          </div>

          <Suspense fallback={<div className="h-64 flex items-center justify-center text-emerald-600"><div className="animate-spin w-8 h-8 flex border-4 border-current border-t-transparent rounded-full" /></div>}>
            <SignInForm />
          </Suspense>

          <p className="text-center text-sm font-medium text-slate-500 mt-8 pt-6 border-t border-slate-100">
            Доступ предоставляется по приглашению учителя.{" "}
            <Link href="/" className="text-emerald-600 hover:text-emerald-500 font-bold transition-colors">
              На главную
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
