import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { TeacherCard } from "@/components/landing/TeacherCard";
import {
  BookOpen,
  Video,
  CheckCircle2,
  BarChart3,
  Users,
  Clock,
  Award,
  ArrowRight,
  Sparkles
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type CourseCard = {
  id: string;
  title: string;
  description: string | null;
  streamCount: number;
};

type Teacher = {
  id: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  skills: string[];
};

// ── Static data ───────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Получите приглашение",
    desc: "Свяжитесь с учителем и получите персональную инвайт-ссылку для вступления в поток.",
  },
  {
    step: "02",
    title: "Присоединитесь к потоку",
    desc: "Зарегистрируйтесь по ссылке и автоматически окажитесь в своей учебной группе.",
  },
  {
    step: "03",
    title: "Занимайтесь и развивайтесь",
    desc: "Посещайте live-уроки, выполняйте домашние задания и отслеживайте свой прогресс.",
  },
];


const COURSE_ICONS: Record<string, string> = {
  default: "📚",
  акыда: "☪️",
  фикх: "⚖️",
  арабский: "🔤",
  тасфир: "📖",
  хадис: "📜",
  тажвид: "🎵",
};

function getCourseIcon(title: string): string {
  const lower = title.toLowerCase();
  for (const [key, icon] of Object.entries(COURSE_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return COURSE_ICONS.default;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // Determine where the logged-in user should go
  const dashboardUrl =
    session?.user.role === "TEACHER" || session?.user.role === "ADMIN"
      ? "/teacher"
      : session
        ? "/student"
        : null;

  // Load page content from CMS (with fallback to static data)
  let pageContent = null;
  try {
    const contentData = await prisma.pageContent.findUnique({
      where: { page: "home" },
    });
    if (contentData) {
      pageContent = contentData.sections as Record<string, unknown>;
    }
  } catch (error) {
    // Fallback to static content if CMS content not available
    console.error("Failed to load CMS content:", error);
  }

  // Fetch published courses with stream count
  const rawCourses = await prisma.course.findMany({
    where: { published: true },
    include: { _count: { select: { streams: true } } },
    orderBy: { createdAt: "asc" },
    take: 6,
  });

  const courses: CourseCard[] = rawCourses.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    streamCount: c._count.streams,
  }));

  // Fetch teachers
  const teachers: Teacher[] = await prisma.user.findMany({
    where: {
      role: {
        in: ["TEACHER", "ADMIN"],
      },
      isBlocked: false,
    },
    select: {
      id: true,
      name: true,
      avatar: true,
      bio: true,
      skills: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 6,
  });

  // Use CMS content or fallback to static
  const heroContent = pageContent?.hero || {
    badge: "Исламская онлайн-платформа",
    title: "Знания Ислама — где бы ты ни был",
    subtitle: "Fatiha.ru — сертифицированная платформа для изучения акыды, фикха, арабского языка и тасфира. Live-уроки, домашние задания и личный прогресс в одном месте.",
    primaryButton: "Посмотреть курсы",
    primaryButtonLink: "#courses",
  };

  const aboutContent = pageContent?.about || {
    title: "Образование с иснадом — живая цепочка знаний",
    description: [
      "Fatiha.ru объединяет преподавателей с традиционным исламским образованием и современную технологическую платформу. Каждый курс разработан дипломированными учёными с опытом преподавания более 10 лет.",
      "Мы убеждены: получать знания можно без отрыва от семьи и работы. Гибкое расписание, записи уроков и персональная обратная связь — всё включено.",
    ],
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-md">
              ف
            </span>
            <span className="text-xl font-extrabold text-slate-800 tracking-tight">
              Fatiha<span className="text-emerald-600">.ru</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <a href="#courses" className="hover:text-emerald-600 transition-colors">Курсы</a>
            <a href="#how" className="hover:text-emerald-600 transition-colors">Как это работает</a>
            <a href="#about" className="hover:text-emerald-600 transition-colors">О платформе</a>
          </div>

          <div className="flex items-center gap-3">
            {dashboardUrl ? (
              <Link
                href={dashboardUrl}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all shadow-sm hover:-translate-y-px"
              >
                Мой кабинет →
              </Link>
            ) : (
              <Link
                href="/api/auth/signin"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all shadow-sm hover:-translate-y-px"
              >
                Войти
              </Link>
            )}
          </div>
        </nav>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 text-white">
        {/* Background ornament */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-emerald-700/20 blur-3xl" />
          <div className="absolute bottom-0 -left-20 w-[400px] h-[400px] rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20rem] font-bold text-white/[0.015] select-none pointer-events-none leading-none">
            ف
          </div>
        </div>

        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-32 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2 text-emerald-200 text-sm font-semibold mb-10 border border-white/10 shadow-lg">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            {heroContent.badge}
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold mb-8 leading-[1.05] tracking-tight">
            {heroContent.title.split("—")[0]}—<br />
            <span className="text-emerald-400">{heroContent.title.split("—")[1]}</span>
          </h1>

          <p className="text-emerald-100 text-xl max-w-2xl mx-auto mb-14 leading-relaxed">
            {heroContent.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link
              href={heroContent.primaryButtonLink || "#courses"}
              className="group bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-10 py-5 rounded-2xl text-lg transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              {heroContent.primaryButton}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/api/auth/signin"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white font-bold px-10 py-5 rounded-2xl text-lg transition-all hover:shadow-lg w-full sm:w-auto justify-center flex items-center gap-2"
            >
              Войти в кабинет
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 max-w-2xl mx-auto gap-8">
            {[
              { value: courses.length > 0 ? `${courses.length}+` : "5+", label: "курсов", icon: BookOpen },
              { value: "100%", label: "онлайн", icon: Video },
              { value: "Live", label: "уроки", icon: Users },
            ].map((s) => (
              <div key={s.label} className="text-center bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <s.icon className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                <div className="text-3xl font-extrabold text-emerald-400">{s.value}</div>
                <div className="text-sm text-emerald-300 font-semibold mt-2">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section id="how" className="py-28 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-600 mb-4">
              <Clock className="w-4 h-4" />
              Процесс
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mt-2 mb-4">Как начать обучение</h2>
            <p className="text-slate-600 text-lg mt-3 max-w-2xl mx-auto">
              Всего три простых шага — и ты уже занимаешься с &ldquo;живым&rdquo; учителем
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item, index) => (
              <div
                key={item.step}
                className="relative bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300 group"
              >
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
                  {index + 1}
                </div>
                <div className="text-5xl font-extrabold text-emerald-100 mb-5 leading-none group-hover:text-emerald-200 transition-colors">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-emerald-700 transition-colors">{item.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Courses ───────────────────────────────────────────────────────── */}
      <section id="courses" className="py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-600 mb-4">
              <BookOpen className="w-4 h-4" />
              Программа
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mt-2 mb-4">Наши курсы</h2>
            <p className="text-slate-600 text-lg mt-3 max-w-2xl mx-auto">
              Изучайте Ислам системно — от основ вероубеждения до чтения и толкования Куръана
            </p>
          </div>

          {courses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="group border border-slate-200 rounded-3xl p-8 hover:border-emerald-300 hover:shadow-xl transition-all duration-300 bg-white"
                >
                  <div className="text-5xl mb-5">{getCourseIcon(course.title)}</div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-emerald-700 transition-colors">
                    {course.title}
                  </h3>
                  {course.description && (
                    <p className="text-slate-600 text-sm leading-relaxed mb-5 line-clamp-3">
                      {course.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-auto pt-5 border-t border-slate-100">
                    <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                      <Users className="w-4 h-4" />
                      {course.streamCount > 0
                        ? `${course.streamCount} ${course.streamCount === 1 ? "поток" : "потоков"}`
                        : "Скоро"}
                    </span>
                    <Link
                      href="/api/auth/signin"
                      className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600 hover:text-emerald-500 transition-colors group-hover:gap-2"
                    >
                      Записаться
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Fallback static cards when no published courses yet */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: "☪️", title: "Акыда", desc: "Основы исламского вероубеждения по проверенным источникам." },
                { icon: "⚖️", title: "Фикх", desc: "Практические вопросы исламского права для повседневной жизни." },
                { icon: "🔤", title: "Арабский язык", desc: "С нуля до уверенного чтения текстов Куръана." },
                { icon: "📖", title: "Тасфир", desc: "Толкование аятов Куръана с пояснениями учёных." },
              ].map((c) => (
                <div key={c.title} className="border border-slate-200 rounded-3xl p-7 hover:border-emerald-300 hover:shadow-xl transition-all duration-300 bg-white group">
                  <div className="text-5xl mb-5">{c.icon}</div>
                  <h3 className="text-lg font-bold text-slate-800 mb-3 group-hover:text-emerald-700 transition-colors">{c.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── About ─────────────────────────────────────────────────────────── */}
      <section id="about" className="py-28 bg-emerald-950 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-emerald-700/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400 mb-4">
              <Award className="w-4 h-4" />
              О нас
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold mt-2 mb-8 leading-tight">
              {aboutContent.title}
            </h2>
            {aboutContent.description.map((paragraph: string, index: number) => (
              <p key={index} className="text-emerald-200 text-lg leading-relaxed mb-6">
                {paragraph}
              </p>
            ))}
            <div className="grid grid-cols-2 gap-6">
              {[
                { value: "10+", label: "лет опыта преподавателей", icon: Award },
                { value: "24/7", label: "доступ к материалам", icon: Clock },
                { value: "Live", label: "интерактивные занятия", icon: Video },
                { value: "Д/З", label: "с проверкой учителем", icon: CheckCircle2 },
              ].map((s) => (
                <div key={s.label} className="border border-emerald-800 rounded-2xl p-5 bg-emerald-900/30 backdrop-blur-sm hover:bg-emerald-900/50 transition-colors">
                  <s.icon className="w-6 h-6 text-emerald-400 mb-3" />
                  <div className="text-2xl font-extrabold text-emerald-400">{s.value}</div>
                  <div className="text-sm text-emerald-300 mt-2 leading-snug">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            {[
              { icon: Award, title: "Квалифицированные учителя", desc: "Дипломированные учёные с классическим исламским образованием." },
              { icon: Video, title: "Live-уроки через видеосвязь", desc: "Интерактивные занятия в реальном времени — задавайте вопросы сразу." },
              { icon: CheckCircle2, title: "Домашние задания с проверкой", desc: "Каждое задание проверяется учителем с комментарием и оценкой." },
              { icon: BarChart3, title: "Личный прогресс", desc: "Отслеживайте успеваемость: тесты, домашние задания, посещаемость." },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-5 bg-emerald-900/50 backdrop-blur-sm border border-emerald-800 rounded-2xl p-6 hover:bg-emerald-900/70 hover:border-emerald-700 transition-all duration-300 group">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-emerald-800/50 flex items-center justify-center group-hover:bg-emerald-700/50 transition-colors">
                  <f.icon className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-white text-lg mb-2">{f.title}</p>
                  <p className="text-sm text-emerald-300 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Teachers ──────────────────────────────────────────────────────── */}
      <section className="py-28 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-600 mb-4">
              <Users className="w-4 h-4" />
              Команда
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mt-2 mb-4">Наши преподаватели</h2>
            <p className="text-slate-600 text-lg mt-3 max-w-2xl mx-auto">
              Опытные учителя исламских наук с традиционным образованием
            </p>
          </div>

          {teachers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {teachers.map((teacher) => (
                <TeacherCard
                  key={teacher.id}
                  name={teacher.name}
                  avatar={teacher.avatar}
                  bio={teacher.bio}
                  skills={teacher.skills}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg font-medium">
                Информация о преподавателях скоро появится
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[300px] h-[300px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-emerald-900/30 blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2 text-emerald-100 text-sm font-semibold mb-8 border border-white/20">
            <Sparkles className="w-4 h-4" />
            Начните обучение сегодня
          </div>

          <h2 className="text-4xl sm:text-5xl font-extrabold mb-6 leading-tight">
            Готовы начать путь к знаниям?
          </h2>
          <p className="text-emerald-100 text-xl mb-12 leading-relaxed max-w-2xl mx-auto">
            Доступ в платформу предоставляется по приглашению учителя. Свяжитесь с преподавателем,
            чтобы получить вашу персональную ссылку.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/api/auth/signin"
              className="group bg-white text-emerald-800 hover:bg-emerald-50 font-bold px-10 py-5 rounded-2xl text-lg transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 inline-flex items-center justify-center gap-2"
            >
              Войти в кабинет
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#courses"
              className="bg-emerald-500/30 hover:bg-emerald-500/50 backdrop-blur-sm border border-white/30 text-white font-bold px-10 py-5 rounded-2xl text-lg transition-all hover:border-white/50 inline-flex items-center justify-center gap-2"
            >
              <BookOpen className="w-5 h-5" />
              Смотреть курсы
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center text-white text-lg font-bold">
                ف
              </span>
              <span className="text-xl font-extrabold text-white">
                Fatiha<span className="text-emerald-400">.ru</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed">
              Исламская онлайн-платформа для изучения традиционных наук. Знания с иснадом — для каждого.
            </p>
          </div>

          <div>
            <p className="text-white font-bold text-sm mb-4">Навигация</p>
            <ul className="space-y-2 text-sm">
              <li><a href="#courses" className="hover:text-emerald-400 transition-colors">Курсы</a></li>
              <li><a href="#how" className="hover:text-emerald-400 transition-colors">Как это работает</a></li>
              <li><a href="#about" className="hover:text-emerald-400 transition-colors">О платформе</a></li>
              <li>
                <Link href="/api/auth/signin" className="hover:text-emerald-400 transition-colors">
                  Войти
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-white font-bold text-sm mb-4">Платформа</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live-уроки через видеосвязь
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Домашние задания с проверкой
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Прогресс и аналитика
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Гибкое расписание
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 px-6 py-6 text-center text-xs">
          © 2026 Fatiha.ru — Платформа исламского образования. Все права защищены.
        </div>
      </footer>

    </div>
  );
}
