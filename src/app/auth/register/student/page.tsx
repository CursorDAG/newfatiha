"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function StudentRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    gender: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Пароли не совпадают");
      setLoading(false);
      return;
    }

    // Validate gender selected
    if (!formData.gender) {
      setError("Пожалуйста, укажите пол");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          gender: formData.gender,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка регистрации");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/auth/signin");
      }, 3000);
    } catch {
      setError("Произошла ошибка при регистрации");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 min-h-[calc(100vh-80px)] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50">
        <div className="w-full max-w-md">
          <div className="bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-8 sm:p-10 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg">
              ✓
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800 mb-4">Регистрация успешна!</h1>
            <p className="text-slate-600 mb-6">
              На ваш email отправлено письмо с подтверждением. Пожалуйста, проверьте почту и подтвердите адрес.
            </p>
            <p className="text-sm text-slate-500">Перенаправление на страницу входа...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6 min-h-[calc(100vh-80px)] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-200/40 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[45%] rounded-full bg-blue-200/30 blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-lg shadow-emerald-600/30 transform rotate-3">
              📚
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Регистрация студента</h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">Создайте аккаунт для доступа к курсам</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50/80 border border-red-200 text-red-600 rounded-xl p-3 text-sm font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Имя</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">👤</span>
                <input
                  type="text"
                  required
                  placeholder="Ваше имя"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Email</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">📧</span>
                <input
                  type="email"
                  required
                  placeholder="student@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Пол</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: "MALE" })}
                  className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                    formData.gender === "MALE"
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  ♂ Мужской
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: "FEMALE" })}
                  className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                    formData.gender === "FEMALE"
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  ♀ Женский
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Пароль</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔒</span>
                <input
                  type="password"
                  required
                  placeholder="Минимум 8 символов"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Подтвердите пароль</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔒</span>
                <input
                  type="password"
                  required
                  placeholder="Повторите пароль"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all shadow-sm"
                />
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
                  <span>Регистрация...</span>
                </>
              ) : (
                "Зарегистрироваться"
              )}
            </button>
          </form>

          <p className="text-center text-sm font-medium text-slate-500 mt-6 pt-6 border-t border-slate-100">
            Уже есть аккаунт?{" "}
            <Link href="/auth/signin" className="text-emerald-600 hover:text-emerald-500 font-bold transition-colors">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
