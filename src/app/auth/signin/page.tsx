"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2, BookOpen } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState("/auth/redirect");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCallbackUrl(params.get("callbackUrl") || "/auth/redirect");
  }, []);

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
    } catch {
      setError("Произошла ошибка при входе");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="relative flex flex-1 items-center justify-center overflow-hidden p-6"
      style={{ minHeight: "calc(100vh - 80px)", background: "var(--bg-primary)" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[45%] w-[45%] rounded-full bg-[#D4AF37]/[0.06] blur-[130px]" />
        <div className="absolute bottom-[5%] right-[-10%] h-[50%] w-[45%] rounded-full bg-[#06201A]/60 blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-card animate-in zoom-in-95 rounded-3xl p-8 duration-500 sm:p-10">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 rotate-3 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8C6D1F] text-[#06201A] shadow-lg shadow-amber-500/20 transition-transform hover:rotate-6">
              <BookOpen className="h-8 w-8" strokeWidth={1.8} />
            </div>
            <h1 className="font-serif text-3xl font-extrabold tracking-tight text-cream">С возвращением!</h1>
            <p className="mt-2 text-sm font-medium text-white/50">
              Войдите в свою учетную запись, чтобы продолжить обучение
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-medium text-red-300 animate-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 ml-1 block text-sm font-semibold text-cream/80">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D4AF37]/70" strokeWidth={1.5} />
                <input
                  type="email"
                  required
                  placeholder="student@fatiha.ru"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-cream placeholder:text-white/30 outline-none transition-all focus:border-[#D4AF37]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[#D4AF37]/40"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 ml-1 block text-sm font-semibold text-cream/80">Пароль</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D4AF37]/70" strokeWidth={1.5} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-cream placeholder:text-white/30 outline-none transition-all focus:border-[#D4AF37]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[#D4AF37]/40"
                />
              </div>
              <div className="mt-2 flex justify-end">
                <Link href="#" className="text-sm font-semibold text-[#D4AF37] transition-colors hover:text-[#E8D48B]">
                  Забыли пароль?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C49A2B] py-3.5 font-bold text-[#06201A] shadow-lg shadow-amber-500/20 transition-all hover:-translate-y-0.5 hover:from-[#E8D48B] hover:to-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Вход...</span>
                </>
              ) : (
                "Войти в кабинет"
              )}
            </button>
          </form>

          <p className="mt-8 border-t border-white/10 pt-6 text-center text-sm font-medium text-white/50">
            Нет аккаунта?{" "}
            <Link href="/auth/register/student" className="font-bold text-[#D4AF37] transition-colors hover:text-[#E8D48B]">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
