import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

type CourseCard = {
  id: string;
  title: string;
  description: string | null;
  streamCount: number;
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

const TESTIMONIALS = [
  {
    name: "Умар А.",
    role: "Студент курса Акыда",
    text: "Благодаря Fatiha я смог систематизировать свои знания об основах веры. Уроки structured, учитель всегда доступен.",
  },
  {
    name: "Фатима К.",
    role: "Студентка курса Арабский язык",
    text: "Лучшая платформа для изучения арабского с нуля. Живые занятия с носителем и подробная домашняя работа — всё что нужно.",
  },
  {
    name: "Айша М.",
    role: "Студентка курса Тасфир",
    text: "Изучение Куръана с тафсиром стало намного глубже. Учитель помогает понять смыслы, а не просто заучивать текст.",
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

        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-emerald-200 text-sm font-semibold mb-8 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Исламская онлайн-платформа
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold mb-6 leading-[1.05] tracking-tight">
            Знания Ислама —<br />
            <span className="text-emerald-400">где бы ты ни был</span>
          </h1>

          <p className="text-emerald-100 text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            Fatiha.ru — сертифицированная платформа для изучения акыды, фикха, арабского языка и тасфира.
            Live-уроки, домашние задания и личный прогресс в одном месте.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <Link
              href="#courses"
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all shadow-xl hover:-translate-y-0.5"
            >
              Посмотреть курсы
            </Link>
            <Link
              href="/api/auth/signin"
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all"
            >
              Войти в кабинет
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 max-w-lg mx-auto gap-6">
            {[
              { value: courses.length > 0 ? `${courses.length}+` : "5+", label: "курсов" },
              { value: "100%", label: "онлайн" },
              { value: "Live", label: "уроки" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-extrabold text-emerald-400">{s.value}</div>
                <div className="text-sm text-emerald-300 font-semibold mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section id="how" className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Процесс</span>
            <h2 className="text-4xl font-extrabold text-slate-900 mt-2">Как начать обучение</h2>
            <p className="text-slate-500 mt-3 max-w-xl mx-auto">
              Всего три простых шага — и ты уже занимаешься с живым учителем
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="relative bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-5xl font-extrabold text-emerald-100 mb-4 leading-none">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Courses ───────────────────────────────────────────────────────── */}
      <section id="courses" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Программа</span>
            <h2 className="text-4xl font-extrabold text-slate-900 mt-2">Наши курсы</h2>
            <p className="text-slate-500 mt-3 max-w-xl mx-auto">
              Изучайте Ислам системно — от основ вероубеждения до чтения и толкования Куръана
            </p>
          </div>

          {courses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="group border border-slate-200 rounded-2xl p-7 hover:border-emerald-300 hover:shadow-lg transition-all bg-white"
                >
                  <div className="text-4xl mb-4">{getCourseIcon(course.title)}</div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-emerald-700 transition-colors">
                    {course.title}
                  </h3>
                  {course.description && (
                    <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-3">
                      {course.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-400">
                      {course.streamCount > 0
                        ? `${course.streamCount} ${course.streamCount === 1 ? "поток" : "потоков"}`
                        : "Скоро"}
                    </span>
                    <Link
                      href="/api/auth/signin"
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-500 transition-colors"
                    >
                      Записаться →
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
                <div key={c.title} className="border border-slate-200 rounded-2xl p-7 hover:border-emerald-300 hover:shadow-lg transition-all bg-white">
                  <div className="text-4xl mb-4">{c.icon}</div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">{c.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── About ─────────────────────────────────────────────────────────── */}
      <section id="about" className="py-24 bg-emerald-950 text-white">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">О нас</span>
            <h2 className="text-4xl font-extrabold mt-2 mb-6 leading-tight">
              Образование с иснадом — живая цепочка знаний
            </h2>
            <p className="text-emerald-200 leading-relaxed mb-6">
              Fatiha.ru объединяет преподавателей с традиционным исламским образованием и современную
              технологическую платформу. Каждый курс разработан дипломированными учёными с опытом
              преподавания более 10 лет.
            </p>
            <p className="text-emerald-200 leading-relaxed mb-8">
              Мы убеждены: получать знания можно без отрыва от семьи и работы. Гибкое расписание,
              записи уроков и персональная обратная связь — всё включено.
            </p>
            <div className="grid grid-cols-2 gap-6">
              {[
                { value: "10+", label: "лет опыта преподавателей" },
                { value: "24/7", label: "доступ к материалам" },
                { value: "Live", label: "интерактивные занятия" },
                { value: "Д/З", label: "с проверкой учителем" },
              ].map((s) => (
                <div key={s.label} className="border border-emerald-800 rounded-xl p-4">
                  <div className="text-2xl font-extrabold text-emerald-400">{s.value}</div>
                  <div className="text-sm text-emerald-300 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {[
              { icon: "🎓", title: "Квалифицированные учителя", desc: "Дипломированные учёные с классическим исламским образованием." },
              { icon: "🎥", title: "Live-уроки через видеосвязь", desc: "Интерактивные занятия в реальном времени — задавайте вопросы сразу." },
              { icon: "📝", title: "Домашние задания с проверкой", desc: "Каждое задание проверяется учителем с комментарием и оценкой." },
              { icon: "📊", title: "Личный прогресс", desc: "Отслеживайте успеваемость: тесты, домашние задания, посещаемость." },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4 bg-emerald-900/50 border border-emerald-800 rounded-xl p-5">
                <span className="text-2xl shrink-0">{f.icon}</span>
                <div>
                  <p className="font-bold text-white">{f.title}</p>
                  <p className="text-sm text-emerald-300 mt-1">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Отзывы</span>
            <h2 className="text-4xl font-extrabold text-slate-900 mt-2">Что говорят студенты</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm"
              >
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="text-emerald-400 text-sm">★</span>
                  ))}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-6 italic">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm border border-emerald-200">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-extrabold mb-4 leading-tight">
            Готовы начать путь к знаниям?
          </h2>
          <p className="text-emerald-100 text-lg mb-10 leading-relaxed">
            Доступ в платформу предоставляется по приглашению учителя. Свяжитесь с преподавателем,
            чтобы получить вашу персональную ссылку.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/api/auth/signin"
              className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold px-8 py-4 rounded-2xl text-lg transition-all shadow-xl hover:-translate-y-0.5"
            >
              Войти в кабинет
            </Link>
            <a
              href="#courses"
              className="bg-emerald-500/40 hover:bg-emerald-500/60 border border-white/30 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all"
            >
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
