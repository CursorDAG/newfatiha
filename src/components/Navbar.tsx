"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar({ userName, role }: { userName?: string | null; role?: string | null }) {
  const pathname = usePathname();
  
  const isTeacher = role === "TEACHER" || role === "ADMIN";
  const isStudent = role === "STUDENT";
  const isAuthenticated = !!role;

  const teacherLinks = [
    { href: "/teacher", label: "Мои курсы" },
    { href: "/teacher/schedule", label: "Расписание" },
    { href: "/teacher/settings", label: "Настройки" },
  ];

  const studentLinks = [
    { href: "/student", label: "Мои потоки" },
    { href: "#", label: "ДЗ" },
    { href: "#", label: "Расписание" },
  ];

  const links = isTeacher ? teacherLinks : (isStudent ? studentLinks : []);

  return (
    <header className="bg-emerald-700 text-white shadow-md w-full shrink-0">
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <Link href="/" className="text-xl font-bold tracking-tight hover:text-emerald-100 transition-colors">
            Fatiha.ru 
            {isAuthenticated && (
              <span className="text-emerald-200 text-sm md:text-base font-normal ml-2">
                {isTeacher ? "Teacher Portal" : "Student Portal"}
              </span>
            )}
          </Link>
        </div>
        
        {isAuthenticated && (
          <nav className="flex gap-1 bg-emerald-800/50 rounded-xl p-1 overflow-x-auto w-full md:w-auto">
            {links.map((link) => {
              const isActive = pathname === link.href || (link.href !== "#" && pathname.startsWith(link.href) && link.href !== "/teacher" && link.href !== "/student");
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-white text-emerald-800 shadow-sm"
                      : "text-emerald-100 hover:text-white hover:bg-emerald-600/50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          {isAuthenticated ? (
            <>
              <span className="text-sm font-medium text-emerald-100 hidden sm:block">{userName}</span>
              <Link
                href="/api/auth/signout"
                className="text-emerald-200 hover:text-white text-sm font-medium transition-colors whitespace-nowrap"
              >
                Выйти →
              </Link>
            </>
          ) : (
            <>
              {pathname !== '/' && (
                <Link
                  href="/"
                  className="text-emerald-200 hover:text-white text-sm font-medium transition-colors whitespace-nowrap"
                >
                  На главную
                </Link>
              )}
              <Link
                href="/api/auth/signin"
                className="bg-white text-emerald-800 font-bold px-5 py-2 rounded-xl text-sm hover:bg-emerald-50 transition-all shadow-sm"
              >
                Войти
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
