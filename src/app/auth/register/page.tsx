"use client";

import Link from "next/link";
import { UserCircle, GraduationCap } from "lucide-react";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50 flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-200/40 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[45%] rounded-full bg-blue-200/30 blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>

      <div className="max-w-3xl w-full relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">
            Регистрация на платформе
          </h1>
          <p className="text-slate-600 text-lg">
            Выберите тип аккаунта для продолжения
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link
            href="/auth/register/student"
            className="group bg-white/90 backdrop-blur-xl border-2 border-emerald-500/20 hover:border-emerald-500 rounded-3xl p-8 transition-all hover:shadow-2xl shadow-xl"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-emerald-500/30 transition-colors shadow-lg">
                <GraduationCap className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Я ученик
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Регистрация для студентов, желающих изучать исламские науки
              </p>
            </div>
          </Link>

          <Link
            href="/auth/register/teacher"
            className="group bg-white/90 backdrop-blur-xl border-2 border-emerald-500/20 hover:border-emerald-500 rounded-3xl p-8 transition-all hover:shadow-2xl shadow-xl"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-emerald-500/30 transition-colors shadow-lg">
                <UserCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Я преподаватель
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Регистрация для учителей исламских наук
              </p>
            </div>
          </Link>
        </div>

        <div className="text-center mt-8">
          <p className="text-slate-600">
            Уже есть аккаунт?{" "}
            <Link
              href="/api/auth/signin"
              className="text-emerald-600 hover:text-emerald-700 font-bold transition-colors"
            >
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
